import type { DetectionOptions, DetectionResult } from './detection.types'
import { DETECTION_CONFIG } from './detection.types'
import { callVisionAPI } from './detection.provider'
import { mapIngredientsToDatabase, validateDetectionResults } from './detection.mapper'

/**
 * Detection Service Module
 * Main orchestration for ingredient detection
 */

/**
 * Main detection function - orchestrates the entire flow
 * 1. Call AI Vision API (OpenAI or Gemini)
 * 2. Map results to database ingredients (batch processing)
 * 3. Validate and filter results
 */
export async function detectIngredients(
  imageBuffer: Buffer,
  options: DetectionOptions = {}
): Promise<DetectionResult> {
  // Extract options with defaults
  const {
    maxResults = DETECTION_CONFIG.DEFAULT_MAX_RESULTS,
    confidenceThreshold = DETECTION_CONFIG.DEFAULT_CONFIDENCE_THRESHOLD,
    provider = DETECTION_CONFIG.DEFAULT_PROVIDER,
  } = options

  // Validate image buffer
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('Invalid image buffer')
  }

  // Check if provider API key is configured
  if (provider === 'gemini' && !process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }
  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  try {
    // Step 1: Call Vision API to detect ingredients
    console.log(`[Detection] Calling ${provider.toUpperCase()} Vision API...`)
    const visionResult = await callVisionAPI(imageBuffer, provider)

    // Check if no ingredients detected
    if (!visionResult.items || visionResult.items.length === 0) {
      console.log('[Detection] No ingredients detected in image')
      return { detectedIngredients: [] }
    }

    console.log(`[Detection] AI detected ${visionResult.items.length} potential ingredients`)

    // Step 2: Map to database ingredients with batch processing
    console.log('[Detection] Mapping to database ingredients...')
    const mappedIngredients = await mapIngredientsToDatabase(
      visionResult.items,
      confidenceThreshold
    )

    console.log(`[Detection] Mapped ${mappedIngredients.length} ingredients from database`)

    // Step 3: Validate and filter results
    const validatedIngredients = validateDetectionResults(mappedIngredients)

    // Step 4: Apply max results limit
    const finalResults = validatedIngredients.slice(0, maxResults)

    console.log(`[Detection] Returning ${finalResults.length} final results`)

    return {
      detectedIngredients: finalResults,
    }

  } catch (error) {
    console.error('[Detection] Error:', error)

    // Re-throw with context
    if (error instanceof Error) {
      throw new Error(`Detection failed: ${error.message}`)
    }
    throw error
  }
}

/**
 * Get available providers based on configured API keys
 */
export function getAvailableProviders(): string[] {
  const providers: string[] = []

  if (process.env.OPENAI_API_KEY) {
    providers.push('openai')
  }

  if (process.env.GEMINI_API_KEY) {
    providers.push('gemini')
  }

  return providers
}

/**
 * Get default provider based on available API keys
 */
export function getDefaultProvider(): 'openai' | 'gemini' {
  // Prefer OpenAI if both are available
  if (process.env.OPENAI_API_KEY) {
    return 'openai'
  }

  if (process.env.GEMINI_API_KEY) {
    return 'gemini'
  }

  throw new Error('No AI provider API key configured (need OPENAI_API_KEY or GEMINI_API_KEY)')
}
