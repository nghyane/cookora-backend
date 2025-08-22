import OpenAI from 'openai'
import { z } from 'zod'
import { db } from '@/shared/database/connection'
import { ingredients } from '@/shared/database/schema'
import { sql, ilike, or } from 'drizzle-orm'
import { INGREDIENT_CATEGORIES } from '@/shared/constants/vietnamese-culinary'
import type { DetectedIngredient } from '@/shared/schemas/api/detection.schemas'

/**
 * Detection Core - GPT-4o integration and ingredient mapping  
 * Handles: AI detection, ingredient mapping
 * 
 * ANTI-HALLUCINATION MEASURES:
 * - Strict system prompt ngăn AI bịa nguyên liệu không có
 * - Tăng confidence thresholds (GPT: 0.6+, acceptance: 0.75+, default: 0.8+)
 * - Cải thiện similarity matching (0.4+ thay vì 0.3+)
 * - Validation pipeline loại bỏ kết quả không hợp lý
 * - Giới hạn số lượng kết quả để tránh force detection
 * 
 * ENHANCED RESPONSE DATA:
 * - Trả về đầy đủ thông tin từ database: category, aliases, imageUrl, typicalShelfLifeDays
 * - Frontend có thể sử dụng để hiển thị chi tiết và UX tốt hơn
 */

// Zod schema cho GPT response - sync với vietnamese-culinary constants
const GPTDetectionItemSchema = z.object({
  displayNameVi: z.string().min(1), // Đảm bảo không empty
  displayNameEn: z.string().min(1), // Đảm bảo không empty
  // Structured Outputs: dùng nullable thay vì optional
  category: z.enum(INGREDIENT_CATEGORIES).nullable(),
  confidence: z.number().min(0.6).max(1) // Tăng từ 0.5 lên 0.6
})

const GPTDetectionResponseSchema = z.object({
  items: z.array(GPTDetectionItemSchema)
})

type GPTDetectionItem = z.infer<typeof GPTDetectionItemSchema>
type GPTDetectionResponse = z.infer<typeof GPTDetectionResponseSchema>

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// JSON Schema thủ công cho Structured Outputs (tránh lỗi schema từ helper)
const INGREDIENT_DETECTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          displayNameVi: { type: 'string' },
          displayNameEn: { type: 'string' },
          category: { type: ['string', 'null'], enum: [...INGREDIENT_CATEGORIES, null] },
          confidence: { type: 'number', minimum: 0.6, maximum: 1 }
        },
        required: ['displayNameVi', 'displayNameEn', 'category', 'confidence']
      }
    }
  },
  required: ['items']
} as const

// Prompts - Improved to prevent hallucination
const SYSTEM_PROMPT = `Bạn là chuyên gia nhận diện nguyên liệu ẩm thực Việt Nam và quốc tế.

NHIỆM VỤ: Nhận diện CÁC NGUYÊN LIỆU THỰC PHẨM CÓ THẬT TRONG ẢNH.

QUY TẮC CHỐNG BỊA:
- CHỈ NHẬN DIỆN những nguyên liệu BẠN THỰC SỰ NHÌN THẤY RÕ RÀNG trong ảnh
- TUYỆT ĐỐI KHÔNG bịa thêm nguyên liệu không có trong ảnh
- TUYỆT ĐỐI KHÔNG đoán nguyên liệu bị che khuất hoặc không rõ ràng
- TUYỆT ĐỐI KHÔNG liệt kê nguyên liệu dựa trên "có thể có" hoặc "thường đi kèm"
- NẾU không chắc chắn 100% về một nguyên liệu, ĐỪNG đưa vào kết quả

QUY TẮC KHÁC:
- CHỈ liệt kê nguyên liệu thực phẩm (bỏ qua bao bì, dụng cụ, đồ dùng, nước uống đóng chai)
- Gộp nguyên liệu trùng lặp thành 1 mục  
- Ưu tiên tên tiếng Việt phổ biến (cà chua, hành lá, thịt bò...)
- Tên tiếng Anh dùng common names (tomato, scallion, beef...)
- Category phải thuộc danh sách cho phép, nếu không chắc chắn category thì để null

CONFIDENCE SCORING MỚI (STRICT HỤN):
- 0.9-1.0: TUYỆT ĐỐI chắc chắn, nhìn thấy rõ ràng hoàn toàn
- 0.8-0.9: Rất chắc chắn, có thể phân biệt rõ ràng  
- 0.7-0.8: Khá chắc chắn, nhưng có thể có một chút mơ hồ
- 0.6-0.7: Không chắc lắm, có khả năng nhầm lẫn cao
- <0.6: KHÔNG đưa vào kết quả

BLACKLIST (TUYỆT ĐỐI KHÔNG NHẬN DIỆN):
- Bao bì, nhãn mác, túi nilon, hộp đựng
- Dụng cụ nấu ăn, đũa, thìa, bát đĩa
- Nước uống đóng chai/lon, bia, rượu  
- Thuốc lá, kẹo cao su
- Đồ chơi, trang trí
- Nếu ảnh quá mờ/tối/xa không thể nhận diện rõ`

const USER_PROMPT = 'Nhận diện các nguyên liệu thực phẩm trong ảnh này. Tập trung vào nguyên liệu ẩm thực Việt Nam và quốc tế phổ biến.'

// Heuristics - Tăng thresholds để chống hallucination  
const ACCEPTANCE_THRESHOLD = 0.75 // Tăng từ 0.6 lên 0.75
const DEFAULT_MAX_RESULTS = 8 // Giảm từ 10 xuống 8 để tránh force tìm quá nhiều
const DEFAULT_CONFIDENCE_THRESHOLD = 0.8 // Tăng từ 0.7 lên 0.8
const GPT_MIN_CONFIDENCE = 0.6 // Tăng từ 0.5 lên 0.6 để GPT strict hơn
const SIMILARITY_THRESHOLD = 0.4 // Tăng từ 0.3 lên 0.4 cho fuzzy matching

/**
 * Gọi GPT model để detect nguyên liệu từ ảnh với structured outputs
 */
async function callGPTVision(imageBuffer: Buffer): Promise<GPTDetectionResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const base64Image = imageBuffer.toString('base64')
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: USER_PROMPT
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ], 
        
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'ingredient_detection',
        schema: INGREDIENT_DETECTION_JSON_SCHEMA,
        strict: true
      }
    }
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content from GPT')
  }

  let json: unknown
  try {
    json = JSON.parse(content)
  } catch {
    throw new Error('GPT response is not valid JSON')
  }

  // Validate bằng Zod để đảm bảo đúng cấu trúc kỳ vọng
  return GPTDetectionResponseSchema.parse(json)
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
    const viName = item.displayNameVi
    const enName = item.displayNameEn
    const similarityExpr = sql<number>`similarity(${ingredients.name}, ${viName})`

    const matchedIngredients = await db
      .select({
        id: ingredients.id,
        name: ingredients.name,
        category: ingredients.category,
        aliases: ingredients.aliases,
        imageUrl: ingredients.imageUrl,
        typicalShelfLifeDays: ingredients.typicalShelfLifeDays,
        similarity: similarityExpr.as('similarity')
      })
      .from(ingredients)
      .where(
        or(
          // Exact/ILIKE match cho name
          ilike(ingredients.name, `%${viName}%`),
          ilike(ingredients.name, `%${enName}%`),
          // Aliases search
          sql`${ingredients.aliases}::text ILIKE ${`%${viName}%`}`,
          sql`${ingredients.aliases}::text ILIKE ${`%${enName}%`}`,
          // Similarity search với trigram - strict hơn để tránh match sai
          sql`similarity(${ingredients.name}, ${viName}) > ${SIMILARITY_THRESHOLD}`
        )
      )
      .orderBy(sql`similarity(${ingredients.name}, ${viName}) DESC`)
      .limit(1)

    if (matchedIngredients.length === 0) continue

    const matched = matchedIngredients[0]
    const baseSimilarity = matched.similarity || 0
    
    // Cải thiện scoring để prefer exact matches và penalize low similarity
    let finalScore: number
    
    // Nếu similarity quá thấp, reject luôn để tránh match sai hoàn toàn
    if (baseSimilarity < SIMILARITY_THRESHOLD) {
      continue
    }
    
    // Exact match gets bonus, fuzzy match gets penalty
    if (baseSimilarity > 0.8) {
      // High similarity - weight more on similarity 
      finalScore = Math.min(baseSimilarity * 0.8 + item.confidence * 0.2, 1.0)
    } else {
      // Medium similarity - balance both scores but penalize
      finalScore = Math.min((baseSimilarity * 0.6 + item.confidence * 0.4) * 0.9, 1.0)
    }

    // Double check - chỉ accept nếu cả hai scores đều khá cao
    if (finalScore >= ACCEPTANCE_THRESHOLD && item.confidence >= 0.7 && baseSimilarity >= SIMILARITY_THRESHOLD) {
      // Parse aliases từ JSONB (có thể null hoặc empty array)
      const parsedAliases = Array.isArray(matched.aliases) ? matched.aliases : []
      
      mappedIngredients.push({
        ingredientId: matched.id,
        name: matched.name,
        category: matched.category,
        aliases: parsedAliases,
        imageUrl: matched.imageUrl,
        typicalShelfLifeDays: matched.typicalShelfLifeDays,
        confidence: finalScore
      })
    }
  }

  return mappedIngredients
}

/**
 * Validation cuối cùng để filter kết quả không hợp lý và tránh hallucination
 */
function validateDetectionResults(ingredients: DetectedIngredient[]): DetectedIngredient[] {
  // Sort theo confidence desc để prioritize kết quả tốt nhất
  const sortedResults = ingredients.sort((a, b) => b.confidence - a.confidence)
  
  // Additional validation rules để chống hallucination
  const validatedResults = sortedResults.filter(ingredient => {
    // Loại bỏ nếu confidence quá thấp so với threshold mặc định
    if (ingredient.confidence < DEFAULT_CONFIDENCE_THRESHOLD) {
      return false
    }
    
    // Loại bỏ tên quá ngắn hoặc không hợp lý
    if (ingredient.name.length < 2) {
      return false
    }
    
    // Loại bỏ tên chứa số hoặc ký tự đặc biệt (thường là hallucination)
    if (/[0-9!@#$%^&*()+=\[\]{}|\\:";'<>?,./]/.test(ingredient.name)) {
      return false
    }
    
    return true
  })
  
  return validatedResults
}

/**
 * Main detection function - Improved version with anti-hallucination measures
 */
export async function detectIngredients(
  imageBuffer: Buffer,
  options: { maxResults?: number; confidenceThreshold?: number } = {}
): Promise<{ detectedIngredients: DetectedIngredient[] }> {
  const { maxResults = DEFAULT_MAX_RESULTS, confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD } = options
  
  // Validate image buffer
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('Invalid image buffer')
  }
  
  // Gọi GPT để detect với strict prompt
  const gptResult = await callGPTVision(imageBuffer)
  
  // Kiểm tra nếu GPT không tìm thấy gì (legitimate case)
  if (!gptResult.items || gptResult.items.length === 0) {
    return { detectedIngredients: [] }
  }
  
  // Map vào database ingredients với strict matching
  const mappedIngredients = await mapIngredientsToDatabase(gptResult.items, confidenceThreshold)
  
  // Validation cuối cùng để filter hallucination
  const validatedIngredients = validateDetectionResults(mappedIngredients)
  
  // Limit kết quả và đảm bảo không trả về quá nhiều (có thể là dấu hiệu hallucination)
  const finalResults = validatedIngredients.slice(0, maxResults)
  
  return {
    detectedIngredients: finalResults
  }
}
