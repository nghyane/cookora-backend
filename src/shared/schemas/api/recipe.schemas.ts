import { z } from 'zod'
import {
    vietnameseRecipeBaseSchema,
    vietnameseRecipeSearchSchema,
    recipeIngredientSchema,
    recipeInstructionSchema,
} from '@/shared/schemas/refined/vietnamese-culinary'

/**
 * Recipe Domain Schemas - Recipe related validations
 * Handles: recipe CRUD, ingredients, instructions, search
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

// Find recipes by ingredients
export const findByIngredientsSchema = z.object({
    ingredientIds: z.array(z.string().uuid()).min(1).max(20),
    matchType: z.enum(['all', 'any']).default('any'),
    limit: z.coerce.number().int().min(1).max(20).default(10),
})

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

// Export types
export type CreateRecipeRequest = z.infer<typeof createRecipeRequestSchema>
export type UpdateRecipeRequest = z.infer<typeof updateRecipeRequestSchema>
export type RecipeSearchQuery = z.infer<typeof recipeSearchQuerySchema>
export type FindByIngredientsRequest = z.infer<typeof findByIngredientsSchema>
export type AddRecipeIngredients = z.infer<typeof addRecipeIngredientsSchema>
export type AddRecipeInstructions = z.infer<typeof addRecipeInstructionsSchema>
