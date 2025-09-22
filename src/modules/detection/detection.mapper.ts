import { sql, or, ilike, and, inArray } from "drizzle-orm";
import { db } from "@/shared/database/connection";
import { ingredients } from "@/shared/database/schema";
import type { DetectedIngredient } from "@/shared/schemas/api/detection.schemas";
import type { GPTDetectionItem } from "./detection.types";
import { DETECTION_CONFIG } from "./detection.types";

/**
 * Database Mapper Module - OPTIMIZED with true batch processing
 * Single query for all ingredients instead of N queries
 */

/**
 * Map GPT results to database ingredients with CHUNKED BATCH QUERIES
 */
export async function mapIngredientsToDatabase(
  gptItems: GPTDetectionItem[],
  confidenceThreshold: number,
): Promise<DetectedIngredient[]> {
  // Filter by confidence first
  const validItems = gptItems.filter(
    (item) => item.confidence >= confidenceThreshold,
  );

  if (validItems.length === 0) {
    return [];
  }

  // Process in chunks to avoid query parameter overflow
  const CHUNK_SIZE = 5; // Max 5 items per query (20 parameters max)
  const chunks: GPTDetectionItem[][] = [];

  for (let i = 0; i < validItems.length; i += CHUNK_SIZE) {
    chunks.push(validItems.slice(i, i + CHUNK_SIZE));
  }

  console.log(
    `[Batch Query] Processing ${validItems.length} items in ${chunks.length} chunks...`,
  );

  // Execute queries for each chunk and combine results
  const allMatches: any[] = [];

  for (const chunk of chunks) {
    const chunkSearchTerms = new Set<string>();
    chunk.forEach((item) => {
      chunkSearchTerms.add(item.displayNameVi.toLowerCase());
      chunkSearchTerms.add(item.displayNameEn.toLowerCase());
    });

    // Build search conditions for this chunk only
    const searchConditions = Array.from(chunkSearchTerms).map((term) =>
      or(
        ilike(ingredients.name, term),
        ilike(ingredients.name, `%${term}%`),
        sql`LOWER(${ingredients.name}) = ${term}`,
      ),
    );

    if (searchConditions.length === 0) continue;

    const startQuery = Date.now();

    try {
      const chunkMatches = await db
        .select()
        .from(ingredients)
        .where(or(...searchConditions));

      allMatches.push(...chunkMatches);

      console.log(
        `[Batch Query] Chunk processed: ${chunkMatches.length} matches in ${Date.now() - startQuery}ms`,
      );
    } catch (error) {
      console.error(`[Batch Query] Chunk failed:`, error);
      // Continue with other chunks even if one fails
    }
  }

  // Remove duplicates by ingredient ID
  const uniqueMatches = Array.from(
    new Map(allMatches.map((m) => [m.id, m])).values(),
  );

  console.log(`[Batch Query] Total unique matches: ${uniqueMatches.length}`);

  // Map results back to detected items
  const mappedIngredients: DetectedIngredient[] = [];

  for (const item of validItems) {
    const match = findBestMatchFromResults(item, uniqueMatches);
    if (match) {
      mappedIngredients.push(match);
    }
  }

  return mappedIngredients;
}

/**
 * Find best match for an item from pre-fetched results
 */
function findBestMatchFromResults(
  item: GPTDetectionItem,
  allMatches: any[],
): DetectedIngredient | null {
  const viNameLower = item.displayNameVi.toLowerCase();
  const enNameLower = item.displayNameEn.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const candidate of allMatches) {
    const candidateNameLower = candidate.name.toLowerCase();
    let score = 0;

    // Exact match gets highest score
    if (
      candidateNameLower === viNameLower ||
      candidateNameLower === enNameLower
    ) {
      score = 1.0;
    }
    // Very close match
    else if (
      candidateNameLower.includes(viNameLower) ||
      viNameLower.includes(candidateNameLower)
    ) {
      score = 0.85;
    } else if (
      candidateNameLower.includes(enNameLower) ||
      enNameLower.includes(candidateNameLower)
    ) {
      score = 0.75;
    }

    // Category bonus/penalty
    if (item.category && candidate.category) {
      if (item.category === candidate.category) {
        score *= 1.1; // 10% bonus
      } else {
        score *= 0.95; // 5% penalty
      }
    }

    // Update best match if this scores higher
    if (score > bestScore && score >= DETECTION_CONFIG.MIN_SIMILARITY) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  if (!bestMatch) return null;

  // Calculate final confidence
  const finalConfidence = Math.min(
    bestScore * 0.7 + item.confidence * 0.3,
    1.0,
  );

  if (finalConfidence < DETECTION_CONFIG.ACCEPTANCE_THRESHOLD) {
    return null;
  }

  const parsedAliases = Array.isArray(bestMatch.aliases)
    ? bestMatch.aliases
    : [];

  return {
    ingredientId: bestMatch.id,
    name: bestMatch.name,
    category: bestMatch.category,
    aliases: parsedAliases,
    imageUrl: bestMatch.imageUrl,
    typicalShelfLifeDays: bestMatch.typicalShelfLifeDays,
    confidence: finalConfidence,
  };
}

/**
 * Alternative: Use similarity search if pg_trgm is available
 * This is a fallback method if the batch query doesn't work well
 */
export async function mapIngredientsWithSimilarity(
  gptItems: GPTDetectionItem[],
  confidenceThreshold: number,
): Promise<DetectedIngredient[]> {
  const validItems = gptItems.filter(
    (item) => item.confidence >= confidenceThreshold,
  );

  if (validItems.length === 0) {
    return [];
  }

  // Build a UNION query for all items with similarity scores
  const unionQueries = validItems.map((item, index) => {
    const viName = item.displayNameVi;
    return sql`
      SELECT
        id, name, category, aliases, image_url, typical_shelf_life_days,
        similarity(name, ${viName}) as sim_score,
        ${index} as item_index
      FROM ingredients
      WHERE similarity(name, ${viName}) > ${DETECTION_CONFIG.MIN_SIMILARITY}
      ORDER BY sim_score DESC
      LIMIT 3
    `;
  });

  // Execute as single query with UNION ALL
  const query = sql`${sql.join(unionQueries, sql` UNION ALL `)}`;

  try {
    const results = await db.execute(query);

    // Group results by item_index
    const resultsByItem = new Map<number, any[]>();
    for (const row of results) {
      const idx = row.item_index as number;
      if (!resultsByItem.has(idx)) {
        resultsByItem.set(idx, []);
      }
      resultsByItem.get(idx)!.push(row);
    }

    // Map to detected ingredients
    const mappedIngredients: DetectedIngredient[] = [];
    validItems.forEach((item, index) => {
      const matches = resultsByItem.get(index) || [];
      if (matches.length > 0) {
        const bestMatch = matches[0]; // Already sorted by similarity
        if (bestMatch.sim_score >= DETECTION_CONFIG.MIN_SIMILARITY) {
          mappedIngredients.push({
            ingredientId: bestMatch.id,
            name: bestMatch.name,
            category: bestMatch.category,
            aliases: Array.isArray(bestMatch.aliases) ? bestMatch.aliases : [],
            imageUrl: bestMatch.image_url,
            typicalShelfLifeDays: bestMatch.typical_shelf_life_days,
            confidence: Math.min(
              bestMatch.sim_score * 0.8 + item.confidence * 0.2,
              1.0,
            ),
          });
        }
      }
    });

    return mappedIngredients;
  } catch (error) {
    console.warn(
      "Similarity search failed, falling back to standard batch",
      error,
    );
    // Fall back to standard batch if similarity doesn't work
    return mapIngredientsToDatabase(gptItems, confidenceThreshold);
  }
}

/**
 * Validate and deduplicate detection results
 */
export function validateDetectionResults(
  ingredients: DetectedIngredient[],
): DetectedIngredient[] {
  // Sort by confidence descending
  const sorted = ingredients.sort((a, b) => b.confidence - a.confidence);

  // Remove duplicates (keep highest confidence)
  const seen = new Set<string>();
  const unique = sorted.filter((ing) => {
    if (seen.has(ing.ingredientId)) {
      return false;
    }
    seen.add(ing.ingredientId);
    return true;
  });

  // Additional validation
  return unique.filter((ingredient) => {
    // Remove if confidence too low
    if (ingredient.confidence < DETECTION_CONFIG.DEFAULT_CONFIDENCE_THRESHOLD) {
      return false;
    }

    // Remove if name too short
    if (ingredient.name.length < 2) {
      return false;
    }

    // Remove if name contains only special characters
    if (/^[0-9!@#$%^&*()+=\[\]{}|\\:";'<>?,./]+$/.test(ingredient.name)) {
      return false;
    }

    return true;
  });
}
