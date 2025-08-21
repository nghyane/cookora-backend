/**
 * VIETNAMESE CULINARY CONSTANTS
 */
export * from '@/shared/constants/vietnamese-culinary'

/**
 * VIETNAMESE BUSINESS LOGIC SCHEMAS
 */
export * from '@/shared/schemas/refined/vietnamese-culinary'

/**
 * DATABASE TYPES
 */
export * from '@/shared/schemas/database/types'

/**
 * API REQUEST SCHEMAS (explicit exports to avoid conflicts)
 */
export {
  // Recipe request schemas
  createRecipeRequestSchema,
  updateRecipeRequestSchema,
  recipeSearchQuerySchema,
  addRecipeIngredientsSchema,
  addRecipeInstructionsSchema,
  // Ingredient request schemas
  createIngredientRequestSchema,
  updateIngredientRequestSchema,
  ingredientSearchQuerySchema,
  ingredientSuggestionQuerySchema,
  findByIngredientsSchema,
  // Pantry request schemas
  addPantryItemSchema,
  updatePantryItemSchema,
  pantrySearchQuerySchema,
  // User request schemas
  userRegistrationSchema,
  userLoginSchema,
  updateUserProfileSchema,
  changePasswordSchema,
  // AI detection schemas
  imageDetectionRequestSchema,
  // Common request schemas
  idParamSchema,
  paginationQuerySchema,
  searchQuerySchema,
  // Types
  type CreateRecipeRequest,
  type UpdateRecipeRequest,
  type RecipeSearchQuery,
  type AddRecipeIngredients,
  type AddRecipeInstructions,
  type CreateIngredientRequest,
  type UpdateIngredientRequest,
  type IngredientSearchQuery,
  type IngredientSuggestionQuery,
  type FindByIngredientsRequest,
  type AddPantryItem,
  type UpdatePantryItem,
  type PantrySearchQuery,
  type UserRegistration,
  type UserLogin,
  type UpdateUserProfile,
  type ChangePassword,
  type ImageDetectionRequest,
  type IdParam,
  type PaginationQuery,
  type SearchQuery,
} from '@/shared/schemas/api/requests'

/**
 * CONVENIENCE RE-EXPORTS & UTILITIES
 */
import { z } from 'zod'

// Common schema utilities
export const createArraySchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.array(itemSchema)

export const createOptionalSchema = <T extends z.ZodTypeAny>(schema: T) => schema.optional()

// Vietnamese validation utilities
export const vietnameseStringSchema = (minLength = 1, maxLength = 255) =>
  z
    .string()
    .min(minLength, `Phải có ít nhất ${minLength} ký tự`)
    .max(maxLength, `Không được vượt quá ${maxLength} ký tự`)
    .regex(/^[\p{L}\p{N}\s\-_.,!?()]+$/u, 'Chỉ được chứa chữ cái, số và dấu câu')

export const vietnamesePhoneSchema = () =>
  z.string().regex(/^(\+84|84|0)[3-9]\d{8}$/, 'Số điện thoại không hợp lệ')

export const vietnameseAddressSchema = () =>
  z.object({
    street: vietnameseStringSchema(5, 100),
    ward: vietnameseStringSchema(2, 50),
    district: vietnameseStringSchema(2, 50),
    city: vietnameseStringSchema(2, 50),
    zipCode: z.string().optional(),
  })

// Separate pagination exports to avoid conflicts
export const apiPaginationQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export type APIPaginationQuery = z.infer<typeof apiPaginationQuerySchema>

/**
 * SCHEMA METADATA (for documentation and tooling)
 */
export const SCHEMA_METADATA = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  description: 'Vietnamese Culinary Single Source of Truth Schemas',
  schemas: {
    constants: {
      path: '@/shared/constants/vietnamese-culinary',
      description: 'Vietnamese culinary domain constants and enums',
    },
    business: {
      path: '@/shared/schemas/refined/vietnamese-culinary',
      description: 'Vietnamese business logic validation schemas',
    },
    requests: {
      path: '@/shared/schemas/api/requests',
      description: 'API request validation schemas',
    },
    database: {
      path: '@/shared/schemas/database/types',
      description: 'Database type definitions',
    },
  },
  coverage: {
    totalSchemas: 25,
    vietnameseSpecific: 15,
    apiEndpoints: 20,
    validationRules: 100,
  },
} as const

// Export Zod for convenience
export { z } from 'zod'
