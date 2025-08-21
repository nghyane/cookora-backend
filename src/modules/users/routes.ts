import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

import { authMiddleware } from '@/shared/middleware/auth'
import {
  changePasswordSchema,
  updateUserProfileSchema,
  paginationQuerySchema,
} from '@/shared/schemas/api/requests'
import { usersService } from './service'
import { response } from '@/shared/utils/response'
import { NotFoundError } from '@/shared/utils/errors'

const USERS_TAG = 'Users'
const usersRoutes = new Hono()

// User profile management (protected routes)
usersRoutes.get(
  '/me',
  describeRoute({
    summary: 'Lấy thông tin cá nhân',
    tags: [USERS_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  async (c) => {
    const user = c.get('user')
    const profile = await usersService.getUserProfile(user.userId)
    
    if (!profile) {
      throw new NotFoundError('User not found')
    }
    
    return c.json(response.success(profile, 'Profile retrieved successfully'))
  },
)

usersRoutes.put(
  '/me',
  describeRoute({
    summary: 'Cập nhật thông tin cá nhân',
    tags: [USERS_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator('json', updateUserProfileSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    const { name, avatarUrl } = body
    
    const updatedProfile = await usersService.updateProfile(user.userId, {
      ...(name && { name }),
      ...(avatarUrl && { avatarUrl }),
    })
    
    return c.json(response.success(updatedProfile, 'Profile updated successfully'))
  },
)

usersRoutes.put(
  '/me/password',
  describeRoute({
    summary: 'Đổi mật khẩu',
    tags: [USERS_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator('json', changePasswordSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    const { currentPassword, newPassword } = body
    
    await usersService.changePassword(user.userId, currentPassword, newPassword)
    
    return c.json(response.success({ changed: true }, 'Password changed successfully'))
  },
)

// User favorites
usersRoutes.get(
  '/me/favorites',
  describeRoute({
    summary: 'Lấy danh sách yêu thích',
    tags: [USERS_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator('query', paginationQuerySchema),
  async (c) => {
    const user = c.get('user')
    const query = c.req.valid('query')
    
    const page = query.page ? Number(query.page) : 1
    const limit = query.limit ? Number(query.limit) : 20
    
    const result = await usersService.getFavorites(user.userId, page, limit)
    return c.json(response.success(result, 'Favorites retrieved successfully'))
  },
)

// User recipe history
usersRoutes.get(
  '/me/recipes',
  describeRoute({
    summary: 'Lấy công thức của tôi',
    tags: [USERS_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator('query', paginationQuerySchema),
  async (c) => {
    const user = c.get('user')
    const query = c.req.valid('query')
    
    const page = query.page ? Number(query.page) : 1
    const limit = query.limit ? Number(query.limit) : 20
    
    const result = await usersService.getMyRecipes(user.userId, page, limit)
    return c.json(response.success(result, 'My recipes retrieved successfully'))
  },
)

// Favorites management
usersRoutes.post(
  '/me/favorites',
  describeRoute({
    summary: 'Thêm công thức vào yêu thích',
    tags: [USERS_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator(
    'json',
    z.object({
      recipeId: z.string().uuid('Recipe ID phải là UUID hợp lệ'),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    
    const result = await usersService.addToFavorites(user.userId, body.recipeId)
    return c.json(response.success(result, 'Recipe added to favorites'), 201)
  },
)

usersRoutes.delete(
  '/me/favorites/:recipeId',
  describeRoute({
    summary: 'Xóa công thức khỏi yêu thích',
    tags: [USERS_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator(
    'param',
    z.object({
      recipeId: z.string().uuid('Recipe ID phải là UUID hợp lệ'),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const recipeId = c.req.valid('param').recipeId
    
    const result = await usersService.removeFromFavorites(user.userId, recipeId)
    return c.json(response.success(result, 'Recipe removed from favorites'))
  },
)
export { usersRoutes }
