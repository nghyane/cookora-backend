import { z } from 'zod'
import 'zod-openapi'

/**
 * Detection Domain Schemas - Image detection related validations
 * Handles: image upload, detection results
 */

// Detection upload request
export const detectionUploadSchema = z
  .object({
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(15)
      .default(8)
      .optional()
      .meta({ example: 5, description: 'Số lượng kết quả tối đa trả về (giảm để tránh hallucination)' }),
    confidenceThreshold: z
      .number()
      .min(0.6)
      .max(1.0)
      .default(0.8)
      .optional()
      .meta({ example: 0.8, description: 'Ngưỡng độ tự tin tối thiểu (0.6-1.0) - cao hơn để tránh kết quả bịa' }),
  })

// Detected ingredient result - Extended with full database info
export const detectedIngredientSchema = z
  .object({
    ingredientId: z
      .uuid()
      .meta({ example: 'b3f1f1f1-1234-5678-9abc-def012345678' }),
    name: z.string().meta({ example: 'Cà chua' }),
    category: z.string().nullable().meta({ example: 'rau_cu' }),
    aliases: z.array(z.string()).meta({ example: ['tomato', 'cà chua bi', 'cà chua cherry'] }),
    imageUrl: z.string().nullable().meta({ example: 'https://example.com/tomato.jpg' }),
    typicalShelfLifeDays: z.number().int().nullable().meta({ example: 7 }),
    confidence: z.number().min(0).max(1).meta({ example: 0.92 }),
  })


// Detection response
export const detectionResponseSchema = z
  .object({
    detectedIngredients: z.array(detectedIngredientSchema),
    totalDetected: z.number().int().meta({ example: 3 }),
  })


// Export types
export type DetectionUpload = z.infer<typeof detectionUploadSchema>
export type DetectedIngredient = z.infer<typeof detectedIngredientSchema>
export type DetectionResponse = z.infer<typeof detectionResponseSchema>
