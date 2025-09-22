import { z } from "zod";
import "zod-openapi";
import {
  vietnameseRecipeBaseSchema,
  vietnameseRecipeSearchSchema,
  recipeIngredientSchema,
  recipeInstructionSchema,
} from "@/shared/schemas/refined/vietnamese-culinary";

/**
 * Recipe Domain Schemas - Recipe related validations
 * Handles: recipe CRUD, ingredients, instructions, search
 */

// Create recipe request
export const createRecipeRequestSchema = vietnameseRecipeBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update recipe request
export const updateRecipeRequestSchema = createRecipeRequestSchema.partial();

// Recipe search query parameters
export const recipeSearchQuerySchema = vietnameseRecipeSearchSchema;

// Find recipes by ingredients
export const findByIngredientsSchema = z.object({
  ingredientIds: z
    .array(z.uuid())
    .min(1)
    .max(20)
    .meta({ example: ["b3f1f1f1-1234-5678-9abc-def012345678"] }),
  strategy: z
    .enum(["smart", "percentage", "count", "threshold"])
    .default("smart")
    .optional()
    .meta({
      example: "smart",
      description:
        "smart: hybrid scoring, percentage: best %, count: most matches, threshold: min matches required",
    }),
  minMatches: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .meta({
      example: 3,
      description: "Minimum number of ingredients that must match",
    }),
  minPercentage: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .meta({
      example: 30,
      description: "Minimum percentage of ingredients that must match",
    }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(10)
    .meta({ example: 10 }),
  includeDetails: z
    .boolean()
    .default(true)
    .optional()
    .meta({
      example: true,
      description: "Include full ingredient details in response",
    }),
});

// Add ingredients to recipe
export const addRecipeIngredientsSchema = z.object({
  ingredients: z
    .array(recipeIngredientSchema.omit({ recipeId: true }))
    .min(1, "Phải có ít nhất 1 nguyên liệu"),
});

// Add instructions to recipe
export const addRecipeInstructionsSchema = z.object({
  instructions: z
    .array(recipeInstructionSchema.omit({ recipeId: true }))
    .min(1, "Phải có ít nhất 1 bước làm"),
});

// Complete recipe creation with ingredients and instructions
export const createRecipeCompleteSchema = createRecipeRequestSchema.extend({
  ingredients: z
    .array(recipeIngredientSchema.omit({ recipeId: true }))
    .optional()
    .describe("Danh sách nguyên liệu của công thức"),
  instructions: z
    .array(recipeInstructionSchema.omit({ recipeId: true }))
    .optional()
    .describe("Các bước thực hiện công thức"),
});

// Export types
export type CreateRecipeRequest = z.infer<typeof createRecipeRequestSchema>;
export type UpdateRecipeRequest = z.infer<typeof updateRecipeRequestSchema>;
export type RecipeSearchQuery = z.infer<typeof recipeSearchQuerySchema>;
export type FindByIngredientsRequest = z.infer<typeof findByIngredientsSchema>;
export type AddRecipeIngredients = z.infer<typeof addRecipeIngredientsSchema>;
export type AddRecipeInstructions = z.infer<typeof addRecipeInstructionsSchema>;
export type CreateRecipeComplete = z.infer<typeof createRecipeCompleteSchema>;
