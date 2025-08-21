import type { Context, Next } from 'hono'
import { sessionManager } from '@/modules/auth/session.manager'
import { response } from '@/shared/utils/response'
import { db } from '@/shared/database/connection'
import { users } from '@/shared/database/schema'
import { eq } from 'drizzle-orm'
import { UnauthorizedError } from '@/shared/utils/errors'
import type { UserRole } from '@/shared/database/schema/types'

// Extend Hono context to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: {
      userId: string
      email: string
      role: UserRole
    }
  }
}

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Yêu cầu header Authorization')
  }

  const token = authHeader.substring(7) // Remove "Bearer " prefix

  if (!token) {
    throw new UnauthorizedError('Yêu cầu token')
  }

  // Validate token using session manager
  const payload = await sessionManager.validateToken(token)

  if (!payload) {
    throw new UnauthorizedError('Token không hợp lệ hoặc đã hết hạn')
  }

  // Get user role from database
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1)

  if (!user) {
    throw new UnauthorizedError('Không tìm thấy người dùng')
  }

  // Set user context for use in controllers
  c.set('user', {
    userId: payload.userId,
    email: payload.email,
    role: user.role,
  })

  await next()
}

// Optional middleware for routes that work with or without auth
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)

    try {
      const payload = await sessionManager.validateToken(token)

      if (payload) {
        // Get user role from database
        const [user] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1)

        if (user) {
          c.set('user', {
            userId: payload.userId,
            email: payload.email,
            role: user.role,
          })
        }
      }
    } catch {
      // Ignore auth errors for optional middleware
    }
  }

  await next()
}
