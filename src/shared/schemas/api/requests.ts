// API Request Schemas for Vietnamese Culinary - MVP Version
import { z } from 'zod'

// Import Vietnamese base schemas
import {
  vietnameseIngredientBaseSchema,
  vietnameseRecipeBaseSchema,
  vietnameseRecipeSearchSchema,
  ingredientSearchSchema,
  recipeIngredientSchema,
  recipeInstructionSchema,
  pantryItemSchema,
} from '@/shared/schemas/refined/vietnamese-culinary'

/**
 * RECIPE REQUEST SCHEMAS
 */
// Create recipe request
export const createRecipeRequestSchema = vietnameseRecipeBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

// Update recipe request
export const updateRecipeRequestSchema = createRecipeRequestSchema.partial()

// Recipe search query parameters
export const recipeSearchQuerySchema = vietnameseRecipeSearchSchema

/**
 * INGREDIENT REQUEST SCHEMAS
 */
// Create ingredient request
export const createIngredientRequestSchema = vietnameseIngredientBaseSchema.omit({
  id: true,
  createdAt: true,
})

// Update ingredient request
export const updateIngredientRequestSchema = createIngredientRequestSchema.partial()

// Ingredient search query parameters
export const ingredientSearchQuerySchema = ingredientSearchSchema

// Ingredient suggestion query parameters
export const ingredientSuggestionQuerySchema = z.object({
  q: z.string().min(2, 'Query phải có ít nhất 2 ký tự'),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

/**
 * RECIPE FIND-BY-INGREDIENTS REQUEST
 */
export const findByIngredientsSchema = z.object({
  ingredientIds: z.array(z.string().uuid()).min(1).max(20),
  matchType: z.enum(['all', 'any']).default('any'),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

/**
 * RECIPE INGREDIENTS & INSTRUCTIONS REQUEST SCHEMAS
 */
// Add ingredients to recipe
export const addRecipeIngredientsSchema = z.object({
  ingredients: z.array(
    recipeIngredientSchema.omit({ recipeId: true })
  ).min(1, 'Phải có ít nhất 1 nguyên liệu'),
})

// Add instructions to recipe
export const addRecipeInstructionsSchema = z.object({
  instructions: z.array(
    recipeInstructionSchema.omit({ recipeId: true })
  ).min(1, 'Phải có ít nhất 1 bước làm'),
})

/**
 * PANTRY REQUEST SCHEMAS
 */
// Add item to pantry
export const addPantryItemSchema = pantryItemSchema.omit({
  id: true,
  userId: true,
  addedAt: true,
})

// Update pantry item
export const updatePantryItemSchema = z.object({
  quantity: z.number().positive('Số lượng phải lớn hơn 0').optional(),
  unit: z.string().min(1, 'Đơn vị không được để trống').optional(),
  expiresAt: z.date().optional(),
  notes: z.string().optional(),
})

// Pantry search query
export const pantrySearchQuerySchema = z.object({
  ingredientId: z.string().uuid().optional(),
  expiringBefore: z.coerce.date().optional(), // Tìm nguyên liệu sắp hết hạn
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * USER REQUEST SCHEMAS
 */
// Common field schemas (deduplicated)
export const emailSchema = z.string().email('Email không hợp lệ')
export const strongPasswordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
  )

// User registration
export const userRegistrationSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100),
  email: emailSchema,
  password: strongPasswordSchema,
})

// User login
export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mật khẩu không được để trống'),
})

// Update user profile
export const updateUserProfileSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100).optional(),
  email: z.string().email('Email không hợp lệ').optional(),
  avatarUrl: z.string().url('Avatar phải là URL hợp lệ').optional(),
})

// Change password
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống'),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Xác nhận mật khẩu không được để trống'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })

// Email verification
export const verifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

// Forgot password
export const forgotPasswordRequestSchema = z.object({
  email: emailSchema,
})

// Reset password
export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: strongPasswordSchema,
})

/**
 * AI DETECTION REQUEST SCHEMAS
 */
// Image ingredient detection
export const imageDetectionRequestSchema = z.object({
  image: z.string().base64('File ảnh phải ở định dạng base64'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'] as const),
  maxFileSize: z.number().max(10 * 1024 * 1024, 'File ảnh không được vượt quá 10MB'),
})

/**
 * COMMON REQUEST SCHEMAS
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



// Search query
export const searchQuerySchema = z.object({
  query: z.string().min(1, 'Từ khóa tìm kiếm không được để trống').optional(),
  ...paginationQuerySchema.shape,
})

// Export all types
export type CreateRecipeRequest = z.infer<typeof createRecipeRequestSchema>
export type UpdateRecipeRequest = z.infer<typeof updateRecipeRequestSchema>
export type RecipeSearchQuery = z.infer<typeof recipeSearchQuerySchema>

export type CreateIngredientRequest = z.infer<typeof createIngredientRequestSchema>
export type UpdateIngredientRequest = z.infer<typeof updateIngredientRequestSchema>
export type IngredientSearchQuery = z.infer<typeof ingredientSearchQuerySchema>
export type IngredientSuggestionQuery = z.infer<typeof ingredientSuggestionQuerySchema>
export type FindByIngredientsRequest = z.infer<typeof findByIngredientsSchema>

export type AddRecipeIngredients = z.infer<typeof addRecipeIngredientsSchema>
export type AddRecipeInstructions = z.infer<typeof addRecipeInstructionsSchema>

export type AddPantryItem = z.infer<typeof addPantryItemSchema>
export type UpdatePantryItem = z.infer<typeof updatePantryItemSchema>
export type PantrySearchQuery = z.infer<typeof pantrySearchQuerySchema>

export type UserRegistration = z.infer<typeof userRegistrationSchema>
export type UserLogin = z.infer<typeof userLoginSchema>
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>
export type ChangePassword = z.infer<typeof changePasswordSchema>
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>

export type ImageDetectionRequest = z.infer<typeof imageDetectionRequestSchema>

export type IdParam = z.infer<typeof idParamSchema>
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export type SearchQuery = z.infer<typeof searchQuerySchema>
