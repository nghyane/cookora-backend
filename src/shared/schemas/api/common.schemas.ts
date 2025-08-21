import { z } from 'zod'

/**
 * Common Schemas - Shared validation utilities
 * Handles: ID params, pagination, common patterns
 */

// Generic ID parameter
export const idParamSchema = z.object({
    id: z.string().uuid('ID phải là UUID hợp lệ'),
})

// Pagination query
export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Export types
export type IdParam = z.infer<typeof idParamSchema>
export type PaginationQuery = z.infer<typeof paginationQuerySchema>
