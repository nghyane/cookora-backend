import { z } from 'zod'
import 'zod-openapi'

/**
 * Common Schemas - Shared validation utilities
 * Handles: ID params, pagination, common patterns
 */

// Generic ID parameter
export const idParamSchema = z
    .object({
        id: z
            .uuid('ID phải là UUID hợp lệ')
            .meta({ example: 'b3f1f1f1-1234-5678-9abc-def012345678' }),
    })


// Pagination query
export const paginationQuerySchema = z
    .object({
        page: z
            .coerce
            .number()
            .int()
            .min(1)
            .default(1)
            .meta({ example: 1 }),
        limit: z
            .coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(20)
            .meta({ example: 20 }),
    })


// Export types
export type IdParam = z.infer<typeof idParamSchema>
export type PaginationQuery = z.infer<typeof paginationQuerySchema>
