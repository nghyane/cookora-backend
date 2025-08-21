import { z } from 'zod'

/**
 * Detection Domain Schemas - Image detection related validations
 * Handles: image upload, detection results
 */

// Detection upload request
export const detectionUploadSchema = z.object({
  maxResults: z.number().int().min(1).max(20).default(10).optional(),
  confidenceThreshold: z.number().min(0.1).max(1.0).default(0.7).optional(),
})

// Detected ingredient result
export const detectedIngredientSchema = z.object({
  ingredientId: z.string().uuid(),
  name: z.string(),
  confidence: z.number().min(0).max(1),
})

// Detection response
export const detectionResponseSchema = z.object({
  detectedIngredients: z.array(detectedIngredientSchema),
  totalDetected: z.number().int(),
})

// Export types
export type DetectionUpload = z.infer<typeof detectionUploadSchema>
export type DetectedIngredient = z.infer<typeof detectedIngredientSchema>
export type DetectionResponse = z.infer<typeof detectionResponseSchema>
