import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

import { authMiddleware } from '@/shared/middleware/auth'
import { providerRegistry } from './providers'
import { response } from '@/shared/utils/response'
import {
  BadRequestError,
  ValidationError,
  InvalidTokenError,
  UserExistsError,
  UnauthorizedError,
  ConflictError,
} from '@/shared/utils/errors'
import {
  verifyEmailRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  userRegistrationSchema,
} from '@/shared/schemas/api/requests'

const AUTH_TAG = 'Authentication'
const authRoutes = new Hono()

// List available providers
authRoutes.get(
  '/providers',
  describeRoute({
    summary: 'Lấy danh sách providers hỗ trợ',
    tags: [AUTH_TAG],
  }),
  (c) => {
    const providers = providerRegistry.list()
    return c.json(response.success({ providers }, 'Available providers'))
  },
)

// Generic provider login endpoint
authRoutes.post(
  '/:provider/login',
  describeRoute({
    summary: 'Đăng nhập với provider',
    tags: [AUTH_TAG],
    description: 'Supports email/password and OAuth providers like Google',
  }),
  zValidator(
    'param',
    z.object({
      provider: z.enum(['email', 'google']),
    }),
  ),
  zValidator('json', z.record(z.unknown())),
  async (c) => {
    const provider = c.req.valid('param').provider
    const body = c.req.valid('json')

    if (!providerRegistry.has(provider)) {
      throw new BadRequestError('Provider không được hỗ trợ', 'INVALID_PROVIDER')
    }

    try {
      const authProvider = providerRegistry.get(provider)
      const ipAddress = c.req.header('x-forwarded-for')
      const userAgent = c.req.header('user-agent')

      // Handle email login specifically
      if (provider === 'email') {
        if (!body.email || !body.password) {
          throw new ValidationError('Yêu cầu email và mật khẩu')
        }
      }

      const { authService } = await import('./service')
      const { user, token, expiresAt } = await authService.authenticate(
        provider,
        body,
        ipAddress,
        userAgent,
      )

      return c.json(response.success({ user, token, expiresAt }, 'Đăng nhập thành công'))
    } catch (error: any) {
      // Distinguish between different auth errors
      if (error.message.includes('password')) {
        throw new UnauthorizedError('Email hoặc mật khẩu không hợp lệ')
      }
      throw new BadRequestError(error.message || 'Lỗi xác thực', 'AUTH_FAILURE')
    }
  },
)

// OAuth callback endpoint
authRoutes.get(
  '/:provider/callback',
  describeRoute({
    summary: 'OAuth callback endpoint',
    tags: [AUTH_TAG],
    description: 'Handles OAuth callbacks from providers like Google',
  }),
  zValidator(
    'param',
    z.object({
      provider: z.enum(['google']),
    }),
  ),
  async (c) => {
    const provider = c.req.valid('param').provider

    if (provider !== 'google') {
      throw new BadRequestError('Provider không được hỗ trợ', 'INVALID_PROVIDER')
    }

    const code = c.req.query('code')
    if (!code) {
      throw new BadRequestError('Yêu cầu authorization code', 'MISSING_CODE')
    }

    try {
      const { authService } = await import('./service')
      const { user, token, expiresAt } = await authService.authenticate(provider, { code })
      return c.json(response.success({ user, token, expiresAt }, 'Đăng nhập thành công'))
    } catch (error: any) {
      throw new BadRequestError(`Lỗi OAuth: ${error.message}`, 'OAUTH_ERROR')
    }
  },
)

// Email registration
authRoutes.post(
  '/register',
  describeRoute({
    summary: 'Đăng ký tài khoản email',
    tags: [AUTH_TAG],
  }),
  zValidator('json', userRegistrationSchema),
  async (c) => {
    const body = c.req.valid('json')

    if (!body.email || !body.password || !body.name) {
      throw new ValidationError('Yêu cầu email, mật khẩu và tên')
    }

    try {
      const { authService } = await import('./service')
      const { user, verificationToken } = await authService.register(
        body.email,
        body.password,
        body.name,
      )
      // TODO: Send verification email with the token
      return c.json(
        response.success(
          { user },
          'Đăng ký thành công. Vui lòng kiểm tra email để xác thực.',
        ),
        201,
      )
    } catch (error: any) {
      throw new UserExistsError('Email đã được đăng ký')
    }
  },
)

// Email verification
authRoutes.post(
  '/verify-email',
  describeRoute({
    summary: 'Xác thực email',
    tags: [AUTH_TAG],
  }),
  zValidator('json', verifyEmailRequestSchema),
  async (c) => {
    const body = c.req.valid('json')

    if (!body.token) {
      throw new ValidationError('Yêu cầu verification token')
    }

    const { authService } = await import('./service')
    const isVerified = await authService.verifyEmail(body.token)

    if (!isVerified) {
      throw new InvalidTokenError('Token xác thực không hợp lệ hoặc đã hết hạn')
    }

    return c.json(response.success(null, 'Xác thực email thành công'))
  },
)

// Password reset flow
authRoutes.post(
  '/forgot-password',
  describeRoute({
    summary: 'Yêu cầu đặt lại mật khẩu',
    tags: [AUTH_TAG],
  }),
  zValidator('json', forgotPasswordRequestSchema),
  async (c) => {
    const body = c.req.valid('json')
    
    if (!body.email) {
      throw new ValidationError('Yêu cầu email')
    }

    const { authService } = await import('./service')
    await authService.requestPasswordReset(body.email)
    return c.json(
      response.success(
        null,
        'Nếu email tồn tại, một email đặt lại mật khẩu đã được gửi.',
      ),
    )
  },
)

authRoutes.post(
  '/reset-password',
  describeRoute({
    summary: 'Đặt lại mật khẩu',
    tags: [AUTH_TAG],
  }),
  zValidator('json', resetPasswordRequestSchema),
  async (c) => {
    const body = c.req.valid('json')
    
    if (!body.token || !body.newPassword) {
      throw new ValidationError('Yêu cầu token và mật khẩu mới')
    }

    try {
      const { authService } = await import('./service')
      await authService.resetPassword(body.token, body.newPassword)
      return c.json(response.success(null, 'Đặt lại mật khẩu thành công'))
    } catch (error: any) {
      throw new InvalidTokenError(error.message || 'Token không hợp lệ hoặc đã hết hạn')
    }
  },
)

// Session management
authRoutes.post(
  '/logout',
  describeRoute({
    summary: 'Đăng xuất',
    tags: [AUTH_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  async (c) => {
    const authHeader = c.req.header('Authorization')
    const token = authHeader?.substring(7)
    
    if (token) {
      const { authService } = await import('./service')
      await authService.logout(token)
    }
    return c.json(response.success({ loggedOut: true }, 'Đăng xuất thành công'))
  },
)

authRoutes.post(
  '/logout-all',
  describeRoute({
    summary: 'Đăng xuất tất cả thiết bị',
    tags: [AUTH_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  async (c) => {
    const user = c.get('user')
    const { authService } = await import('./service')
    await authService.logoutAllSessions(user.userId)
    return c.json(response.success(null, 'Đã đăng xuất khỏi tất cả các thiết bị'))
  },
)

// Provider management (link/unlink additional auth methods)
authRoutes.post(
  '/link/:provider',
  describeRoute({
    summary: 'Liên kết provider mới',
    tags: [AUTH_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator(
    'param',
    z.object({
      provider: z.enum(['email', 'google']),
    }),
  ),
  zValidator('json', z.record(z.unknown())),
  async (c) => {
    const user = c.get('user')
    const provider = c.req.valid('param').provider
    const body = c.req.valid('json')

    if (!providerRegistry.has(provider)) {
      throw new BadRequestError('Provider không được hỗ trợ', 'INVALID_PROVIDER')
    }

    try {
      const { authService } = await import('./service')
      await authService.linkProvider(user.userId, provider, body)
      return c.json(response.success(null, `Đã liên kết thành công với ${provider}`))
    } catch (error: any) {
      throw new ConflictError(error.message || `Không thể liên kết với ${provider}`)
    }
  },
)

authRoutes.delete(
  '/unlink/:provider',
  describeRoute({
    summary: 'Hủy liên kết provider',
    tags: [AUTH_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator(
    'param',
    z.object({
      provider: z.enum(['email', 'google']),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const provider = c.req.valid('param').provider
    
    const { authService } = await import('./service')
    await authService.unlinkProvider(user.userId, provider)
    return c.json(response.success(null, `Đã hủy liên kết với ${provider}`))
  },
)

export { authRoutes }
