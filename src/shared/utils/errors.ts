import type { ContentfulStatusCode } from 'hono/utils/http-status'

/**
 * Base application error class
 */
export class AppError extends Error {
    constructor(
        message: string,
        public status: ContentfulStatusCode = 500,
        public code: string = 'INTERNAL_ERROR',
        public details?: unknown,
    ) {
        super(message)
        this.name = 'AppError'
    }
}

/**
 * Common HTTP errors
 */
export class BadRequestError extends AppError {
    constructor(message: string, code = 'BAD_REQUEST', details?: unknown) {
        super(message, 400, code, details)
        this.name = 'BadRequestError'
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Không được phép', code = 'UNAUTHORIZED', details?: unknown) {
        super(message, 401, code, details)
        this.name = 'UnauthorizedError'
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Không có quyền truy cập', code = 'FORBIDDEN', details?: unknown) {
        super(message, 403, code, details)
        this.name = 'ForbiddenError'
    }
}

export class NotFoundError extends AppError {
    constructor(message: string, code = 'NOT_FOUND', details?: unknown) {
        super(message, 404, code, details)
        this.name = 'NotFoundError'
    }
}

export class ConflictError extends AppError {
    constructor(message: string, code = 'CONFLICT', details?: unknown) {
        super(message, 409, code, details)
        this.name = 'ConflictError'
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 422, 'VALIDATION_ERROR', details)
        this.name = 'ValidationError'
    }
}

/**
 * Business logic errors
 */
export class InvalidTokenError extends UnauthorizedError {
    constructor(message = 'Token không hợp lệ hoặc đã hết hạn') {
        super(message, 'INVALID_TOKEN')
        this.name = 'InvalidTokenError'
    }
}

export class UserExistsError extends ConflictError {
    constructor(message = 'Người dùng đã tồn tại') {
        super(message, 'USER_EXISTS')
        this.name = 'UserExistsError'
    }
} 