import { z } from 'zod'
import {
    vietnameseIngredientBaseSchema,
    ingredientSearchSchema,
} from '@/shared/schemas/refined/vietnamese-culinary'

/**
 * Ingredient Domain Schemas - Ingredient related validations
 * Handles: ingredient CRUD, search, suggestions
 */

// Create ingredient request
export const createIngredientRequestSchema = vietnameseIngredientBaseSchema.omit({
    id: true,
    createdAt: true,
})

// Ingredient search query parameters
export const ingredientSearchQuerySchema = ingredientSearchSchema

// Ingredient suggestion query parameters
export const ingredientSuggestionQuerySchema = z.object({
    q: z.string().min(2, 'Query phải có ít nhất 2 ký tự'),
    limit: z.coerce.number().int().min(1).max(20).default(10),
})

// Export types
export type CreateIngredientRequest = z.infer<typeof createIngredientRequestSchema>
export type IngredientSearchQuery = z.infer<typeof ingredientSearchQuerySchema>
export type IngredientSuggestionQuery = z.infer<typeof ingredientSuggestionQuerySchema>
