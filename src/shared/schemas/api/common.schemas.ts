import { z } from "zod";
import "zod-openapi";

/**
 * Common Schemas - Shared validation utilities
 * Handles: ID params, pagination, common patterns
 */

// Generic ID parameter
export const idParamSchema = z.object({
  id: z
    .uuid("ID phải là UUID hợp lệ")
    .meta({ example: "b3f1f1f1-1234-5678-9abc-def012345678" }),
});

// Pagination query
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).meta({ example: 1 }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .meta({ example: 20 }),
});

// Common response schemas
export const errorResponseSchema = z.object({
  success: z.boolean().default(false),
  message: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

export const successResponseSchema = z.object({
  success: z.boolean().default(true),
  message: z.string(),
  data: z.any().nullable().optional(),
});

// Helper function to create paginated response schema
export function paginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    success: z.boolean().default(true),
    data: z.object({
      data: z.array(itemSchema),
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
    message: z.string().optional(),
  });
}

// Helper function to create success with data response schema
export function successWithDataSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.boolean().default(true),
    data: dataSchema,
    message: z.string().optional(),
  });
}

// API Schemas object for OpenAPI documentation
export const ApiSchemas = {
  SuccessResponse: successResponseSchema,
  ErrorResponse: errorResponseSchema,
  SuccessWithData: <T extends z.ZodType>(schema: T) =>
    successWithDataSchema(schema),
  PaginatedResponse: <T extends z.ZodType>(schema: T) =>
    paginatedResponseSchema(schema),
};

// Export types
export type IdParam = z.infer<typeof idParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;
