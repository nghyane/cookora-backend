import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { zValidator } from '@hono/zod-validator'

import { authMiddleware } from '@/shared/middleware/auth'
import { detectionUploadSchema } from '@/shared/schemas/api/detection.schemas'
import { detectIngredients } from './detection.core'
import { response } from '@/shared/utils/response'

const DETECTION_TAG = 'Detection'
const detectionRoutes = new Hono()

// Upload image for ingredient detection
detectionRoutes.post(
  '/upload',
  describeRoute({
    summary: 'Nhận diện nguyên liệu từ ảnh',
    tags: [DETECTION_TAG],
    security: [{ Bearer: [] }],
    description: 'Upload ảnh để AI nhận diện nguyên liệu. Trả về danh sách nguyên liệu đã có trong database.',
  }),
  authMiddleware,
  zValidator('query', detectionUploadSchema),
  async (c) => {
    const query = c.req.valid('query')
    
    // Parse multipart form data
    const body = await c.req.parseBody()
    const imageFile = body.image as File
    
    if (!imageFile) {
      return c.json(response.error('Không tìm thấy file ảnh', 'MISSING_IMAGE'), 400)
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return c.json(response.error('File phải là ảnh', 'INVALID_FILE_TYPE'), 400)
    }

    // Validate file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return c.json(response.error('Kích thước ảnh không được vượt quá 10MB', 'FILE_TOO_LARGE'), 400)
    }

    // Convert to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    
    // Detect ingredients
    const result = await detectIngredients(
      imageBuffer,
      {
        maxResults: query.maxResults,
        confidenceThreshold: query.confidenceThreshold
      }
    )

    return c.json(response.success({
      detectedIngredients: result.detectedIngredients,
      totalDetected: result.detectedIngredients.length
    }))
  }
)

export { detectionRoutes }
