import OpenAI from 'openai'
import {
  type AIProvider,
  type GPTDetectionResponse,
  GPTDetectionResponseSchema,
  DETECTION_CONFIG,
  INGREDIENT_DETECTION_JSON_SCHEMA
} from './detection.types'

/**
 * AI Provider Module
 * Unified provider using OpenAI SDK for both OpenAI and Gemini
 */

// Prompts
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

CONFIDENCE SCORING MỚI (STRICT HƠN):
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

/**
 * Create AI client based on provider
 */
function createAIClient(provider: AIProvider): OpenAI {
  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    return new OpenAI({
      apiKey,
      baseURL: DETECTION_CONFIG.GEMINI_BASE_URL,
    })
  }

  // Default to OpenAI
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  return new OpenAI({ apiKey })
}

/**
 * Get model name based on provider
 */
function getModelName(provider: AIProvider): string {
  return provider === 'gemini'
    ? DETECTION_CONFIG.GEMINI_MODEL
    : DETECTION_CONFIG.OPENAI_MODEL
}

/**
 * Call vision API to detect ingredients
 * Works with both OpenAI and Gemini through unified interface
 */
export async function callVisionAPI(
  imageBuffer: Buffer,
  provider: AIProvider = DETECTION_CONFIG.DEFAULT_PROVIDER
): Promise<GPTDetectionResponse> {
  // Validate image buffer
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('Invalid image buffer')
  }

  // Create AI client
  const client = createAIClient(provider)
  const model = getModelName(provider)

  // Convert image to base64
  const base64Image = imageBuffer.toString('base64')

  try {
    // Call API with structured outputs
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: USER_PROMPT,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ingredient_detection',
          schema: INGREDIENT_DETECTION_JSON_SCHEMA,
          strict: true,
        },
      },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error(`No content from ${provider.toUpperCase()}`)
    }

    // Parse and validate response
    let json: unknown
    try {
      json = JSON.parse(content)
    } catch {
      throw new Error(`${provider.toUpperCase()} response is not valid JSON`)
    }

    // Validate with Zod schema
    return GPTDetectionResponseSchema.parse(json)

  } catch (error) {
    // Re-throw with provider context
    if (error instanceof Error) {
      throw new Error(`${provider.toUpperCase()} API Error: ${error.message}`)
    }
    throw error
  }
}
