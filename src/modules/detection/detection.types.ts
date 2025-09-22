import { z } from "zod";
import { INGREDIENT_CATEGORIES } from "@/shared/constants/vietnamese-culinary";
import type { DetectedIngredient } from "@/shared/schemas/api/detection.schemas";

/**
 * Detection Module Types & Schemas
 * Centralized type definitions for the detection module
 */

// Configuration constants
export const DETECTION_CONFIG = {
  // Thresholds
  ACCEPTANCE_THRESHOLD: 0.75, // Minimum final score to accept a match
  DEFAULT_CONFIDENCE_THRESHOLD: 0.8, // Default confidence from user
  DEFAULT_MAX_RESULTS: 8, // Max results to return
  GPT_MIN_CONFIDENCE: 0.6, // Minimum confidence from GPT

  // Similarity thresholds for database matching
  STRICT_SIMILARITY: 0.7, // High confidence match
  WORD_SIMILARITY: 0.8, // Word-based similarity
  MIN_SIMILARITY: 0.5, // Minimum similarity to consider

  // AI Provider settings
  DEFAULT_PROVIDER: "openai" as const,
  OPENAI_MODEL: "gpt-4o" as const,
  GEMINI_MODEL: "gemini-2.5-flash-lite" as const,
  GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai/",
} as const;

// AI Provider types
export type AIProvider = "openai" | "gemini";

// Zod schema for GPT/Gemini response items
export const GPTDetectionItemSchema = z.object({
  displayNameVi: z.string().min(1),
  displayNameEn: z.string().min(1),
  category: z.enum(INGREDIENT_CATEGORIES).nullable(),
  confidence: z.number().min(DETECTION_CONFIG.GPT_MIN_CONFIDENCE).max(1),
});

// Zod schema for full GPT/Gemini response
export const GPTDetectionResponseSchema = z.object({
  items: z.array(GPTDetectionItemSchema),
});

// Type exports
export type GPTDetectionItem = z.infer<typeof GPTDetectionItemSchema>;
export type GPTDetectionResponse = z.infer<typeof GPTDetectionResponseSchema>;

// Database mapping types
export interface IngredientMatch {
  id: string;
  name: string;
  category: string | null;
  aliases: unknown;
  imageUrl: string | null;
  typicalShelfLifeDays: number | null;
  similarity?: number;
  wordSimilarity?: number;
}

// Detection options
export interface DetectionOptions {
  maxResults?: number;
  confidenceThreshold?: number;
  provider?: AIProvider;
}

// Detection result
export interface DetectionResult {
  detectedIngredients: DetectedIngredient[];
}

// JSON Schema for Structured Outputs (OpenAI/Gemini compatible)
export const INGREDIENT_DETECTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          displayNameVi: { type: "string" },
          displayNameEn: { type: "string" },
          category: {
            type: ["string", "null"],
            enum: [...INGREDIENT_CATEGORIES, null],
          },
          confidence: {
            type: "number",
            minimum: DETECTION_CONFIG.GPT_MIN_CONFIDENCE,
            maximum: 1,
          },
        },
        required: ["displayNameVi", "displayNameEn", "category", "confidence"],
      },
    },
  },
  required: ["items"],
} as const;
