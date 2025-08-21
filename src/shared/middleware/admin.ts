import type { Context, Next } from 'hono'
import { ForbiddenError } from '@/shared/utils/errors'

/**
 * Admin middleware - Requires user to have admin role
 * Must be used AFTER authMiddleware
 */
export const adminMiddleware = async (c: Context, next: Next) => {
    const user = c.get('user')

    if (!user) {
        throw new ForbiddenError('Yêu cầu xác thực', 'NO_AUTH')
    }

    if (user.role !== 'admin') {
        throw new ForbiddenError('Yêu cầu quyền quản trị', 'ADMIN_ONLY')
    }

    await next()
}

/**
 * Combined auth + admin middleware for convenience
 */
export const requireAdmin = [
    // authMiddleware will be imported by the route files
    // This is just a marker that both middlewares are needed
] as const 