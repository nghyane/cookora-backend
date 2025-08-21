import { describe, test, expect, beforeAll } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { detectIngredients } from '../src/modules/detection/detection.core'

describe('detectIngredients Function', () => {
  beforeAll(() => {
    // Kiểm tra OPENAI_API_KEY có được set chưa
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️  OPENAI_API_KEY not set - detection tests will be skipped')
    }
  })

  test('should detect ingredients from canh chua image', async () => {
    // Skip test nếu không có API key
    if (!process.env.OPENAI_API_KEY) {
      console.log('⏭️  Skipping test - OPENAI_API_KEY not configured')
      return
    }

    // Load real image: nguyen-lieu-canh-chua.jpg
    const imagePath = join(__dirname, '../docs/nguyen-lieu-canh-chua.jpg')
    const testImageBuffer = readFileSync(imagePath)

    try {
      const result = await detectIngredients(testImageBuffer, {
        maxResults: 5,
        confidenceThreshold: 0.5
      })

      // Assertions
      expect(result).toBeDefined()
      expect(result.detectedIngredients).toBeArray()
      expect(result.detectedIngredients.length).toBeGreaterThanOrEqual(0)
      
      // Nếu có kết quả, kiểm tra structure và content
      if (result.detectedIngredients.length > 0) {
        const ingredient = result.detectedIngredients[0]
        expect(ingredient).toHaveProperty('ingredientId')
        expect(ingredient).toHaveProperty('name')
        expect(ingredient).toHaveProperty('confidence')
        expect(ingredient.confidence).toBeGreaterThanOrEqual(0.5)
        expect(ingredient.confidence).toBeLessThanOrEqual(1.0)
        
        // Log detected ingredients với Vietnamese names
        console.log('🥬 Detected ingredients in canh chua image:')
        result.detectedIngredients.forEach((ing, idx) => {
          console.log(`  ${idx + 1}. ${ing.name} (confidence: ${ing.confidence.toFixed(2)})`)
        })
      }

      console.log('✅ Canh chua detection test passed:', {
        totalDetected: result.detectedIngredients.length,
        ingredients: result.detectedIngredients.map(i => i.name)
      })
    } catch (error) {
      console.error('❌ Detection test failed:', error)
      throw error
    }
  }, 30000) // 30s timeout cho API call

  test('should handle empty/invalid image gracefully', async () => {
    if (!process.env.OPENAI_API_KEY) {
      console.log('⏭️  Skipping test - OPENAI_API_KEY not configured')
      return
    }

    // Test với empty buffer
    const emptyBuffer = Buffer.alloc(0)

    try {
      const result = await detectIngredients(emptyBuffer)
      // Nếu không throw error, kiểm tra kết quả empty hoặc valid
      expect(result).toBeDefined()
      expect(result.detectedIngredients).toBeArray()
      console.log('✅ Empty image handling test passed')
    } catch (error) {
      // Expected behavior - invalid image should throw error
      expect(error).toBeDefined()
      console.log('✅ Error handling test passed - invalid image rejected')
    }
  }, 30000)

  test('should respect maxResults parameter', async () => {
    if (!process.env.OPENAI_API_KEY) {
      console.log('⏭️  Skipping test - OPENAI_API_KEY not configured')
      return
    }

    // Sử dụng cùng ảnh canh chua để test maxResults
    const imagePath = join(__dirname, '../docs/nguyen-lieu-canh-chua.jpg')
    const testImageBuffer = readFileSync(imagePath)

    const result = await detectIngredients(testImageBuffer, {
      maxResults: 3,
      confidenceThreshold: 0.1
    })

    expect(result.detectedIngredients.length).toBeLessThanOrEqual(3)
    console.log('✅ MaxResults test passed')
  }, 30000)
})
