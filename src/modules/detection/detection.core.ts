import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { db } from '@/shared/database/connection'
import { ingredients } from '@/shared/database/schema'
import { sql, ilike, or } from 'drizzle-orm'
import { INGREDIENT_CATEGORIES } from '@/shared/constants/vietnamese-culinary'
import type { DetectedIngredient } from '@/shared/schemas/api/detection.schemas'

/**
 * Detection Core - GPT-4o integration and ingredient mapping
 * Handles: AI detection, ingredient mapping
 */

// Zod schema cho GPT response - sync với vietnamese-culinary constants
const GPTDetectionItem = z.object({
  displayNameVi: z.string(),
  displayNameEn: z.string(),
  category: z.enum(INGREDIENT_CATEGORIES).optional().nullable(), // OpenAI strict mode requirement
  confidence: z.number().min(0.5).max(1) // Chỉ nhận >= 0.5 từ GPT
})

const GPTDetectionResponse = z.object({
  items: z.array(GPTDetectionItem)
})

type GPTDetectionItem = z.infer<typeof GPTDetectionItem>
type GPTDetectionResponse = z.infer<typeof GPTDetectionResponse>

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Gọi GPT-4o để detect nguyên liệu từ ảnh với structured outputs
 */
async function callGPTVision(imageBuffer: Buffer): Promise<GPTDetectionResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const base64Image = imageBuffer.toString('base64')
  
  const completion = await openai.chat.completions.parse({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'system',
        content: `Bạn là chuyên gia nhận diện nguyên liệu ẩm thực Việt Nam và quốc tế. 

NHIỆM VỤ: Nhận diện các nguyên liệu thực phẩm trong ảnh.

QUY TẮC:
- CHỈ liệt kê nguyên liệu thực phẩm (bỏ qua bao bì, dụng cụ, đồ dùng)
- Gộp nguyên liệu trùng lặp thành 1 mục
- Ưu tiên tên tiếng Việt phổ biến (cà chua, hành lá, thịt bò...)
- Tên tiếng Anh dùng common names (tomato, scallion, beef...)

CONFIDENCE SCORING:
- 0.9-1.0: Rất chắc chắn, nhìn rõ nguyên liệu
- 0.7-0.9: Khá chắc chắn, có thể phân biệt được  
- 0.5-0.7: Không chắc lắm, có thể nhầm lẫn
- <0.5: Không đưa vào kết quả`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Nhận diện các nguyên liệu thực phẩm trong ảnh này. Tập trung vào nguyên liệu ẩm thực Việt Nam và quốc tế phổ biến.'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ],
    response_format: zodResponseFormat(GPTDetectionResponse, 'ingredient_detection'),
    max_tokens: 1000,
    temperature: 0.3
  })

  const parsed = completion.choices[0]?.message?.parsed

  if (!parsed) {
    throw new Error('No parsed response from GPT')
  }

  return parsed
}

/**
 * Map GPT results vào ingredients trong database
 */
async function mapIngredientsToDatabase(gptItems: GPTDetectionItem[], confidenceThreshold: number): Promise<DetectedIngredient[]> {
  const mappedIngredients: DetectedIngredient[] = []

  for (const item of gptItems) {
    if (item.confidence < confidenceThreshold) {
      continue
    }

    // Tìm ingredient trong DB bằng fuzzy search
    const matchedIngredients = await db
      .select({
        id: ingredients.id,
        name: ingredients.name,
        similarity: sql<number>`similarity(${ingredients.name}, ${item.displayNameVi})`.as('similarity')
      })
      .from(ingredients)
      .where(
        or(
          // Exact/ILIKE match cho name
          ilike(ingredients.name, `%${item.displayNameVi}%`),
          ilike(ingredients.name, `%${item.displayNameEn}%`),
          // Aliases search
          sql`${ingredients.aliases}::text ILIKE ${`%${item.displayNameVi}%`}`,
          sql`${ingredients.aliases}::text ILIKE ${`%${item.displayNameEn}%`}`,
          // Similarity search với trigram
          sql`similarity(${ingredients.name}, ${item.displayNameVi}) > 0.3`
        )
      )
      .orderBy(sql`similarity(${ingredients.name}, ${item.displayNameVi}) DESC`)
      .limit(1)

    if (matchedIngredients.length > 0) {
      const matched = matchedIngredients[0]
      
      // Tính score tổng hợp (similarity + confidence)
      const finalScore = Math.min(
        (matched.similarity || 0) * 0.7 + item.confidence * 0.3,
        1.0
      )

      // Chỉ accept nếu score >= 0.6
      if (finalScore >= 0.6) {
        mappedIngredients.push({
          ingredientId: matched.id,
          name: matched.name,
          confidence: finalScore
        })
      }
    }
  }

  return mappedIngredients
}



/**
 * Main detection function - MVP version
 */
export async function detectIngredients(
  imageBuffer: Buffer,
  options: { maxResults?: number; confidenceThreshold?: number } = {}
): Promise<{ detectedIngredients: DetectedIngredient[] }> {
  const { maxResults = 10, confidenceThreshold = 0.7 } = options
  
  // Gọi GPT-4o để detect
  const gptResult = await callGPTVision(imageBuffer)
  
  // Map vào database ingredients
  const mappedIngredients = await mapIngredientsToDatabase(gptResult.items, confidenceThreshold)
  
  return {
    detectedIngredients: mappedIngredients.slice(0, maxResults)
  }
}
