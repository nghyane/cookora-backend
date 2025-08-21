import { db } from '@/shared/database/connection'
import { pantryItems, ingredients, recipes, recipeIngredients } from '@/shared/database/schema'
import { eq, sql, inArray } from 'drizzle-orm'
import { getUserIngredientIds, getUserPantryMap } from './pantry.queries'

/**
 * Pantry Recommendations - Recipe suggestion functionality
 * Handles: recipe suggestions, availability checking, match scoring
 */

/**
 * Gợi ý recipes dựa trên ingredients có sẵn trong pantry
 */
export async function suggestRecipes(userId: string, options: {
    limit?: number
    cookingTime?: number
    servings?: number
} = {}) {
    const { limit = 10 } = options

    const userIngredientIds = await getUserIngredientIds(userId)
    if (userIngredientIds.length === 0) {
        return []
    }

    const recipeScores = await calculateRecipeScores(userIngredientIds)
    if (recipeScores.length === 0) {
        return []
    }

    const topRecipeIds = selectTopRecipes(recipeScores, limit)
    return buildRecipeResults(topRecipeIds, recipeScores, userIngredientIds)
}

/**
 * Kiểm tra user có đủ ingredients cho một recipe không
 */
export async function checkRecipeAvailability(userId: string, recipeId: string) {
    const [recipeIngredientsData, userPantryData] = await Promise.all([
        getRecipeIngredients(recipeId),
        getUserPantryMap(userId)
    ])

    const availability = buildAvailabilityCheck(recipeIngredientsData, userPantryData)

    return {
        canMake: availability.every(item => item.hasEnough),
        availability,
        missingIngredients: availability.filter(item => !item.hasEnough)
    }
}

// Helper functions for recipe suggestions

/**
 * Calculate recipe match scores based on user ingredients
 */
async function calculateRecipeScores(userIngredientIds: string[]) {
    return db
        .select({
            id: recipes.id,
            totalScore: sql<number>`sum(case when ${ingredients.category} in ('thit', 'hai_san', 'rau_cu', 'ngu_coc') then 5 else 1 end)`.as('total_score'),
            matchedScore: sql<number>`sum(case when ${recipeIngredients.ingredientId} in (${sql.join(userIngredientIds, sql.raw(','))}) then (case when ${ingredients.category} in ('thit', 'hai_san', 'rau_cu', 'ngu_coc') then 5 else 1 end) else 0 end)`.as('matched_score')
        })
        .from(recipes)
        .innerJoin(recipeIngredients, eq(recipes.id, recipeIngredients.recipeId))
        .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
        .groupBy(recipes.id)
        .having(sql`sum(case when ${recipeIngredients.ingredientId} in (${sql.join(userIngredientIds, sql.raw(','))}) then (case when ${ingredients.category} in ('thit', 'hai_san', 'rau_cu', 'ngu_coc') then 5 else 1 end) else 0 end) > 0`)
}

/**
 * Select top recipes by match percentage
 */
function selectTopRecipes(recipeScores: any[], limit: number): string[] {
    return recipeScores
        .sort((a, b) => {
            const percentageA = (a.matchedScore / a.totalScore)
            const percentageB = (b.matchedScore / b.totalScore)
            if (percentageB !== percentageA) {
                return percentageB - percentageA
            }
            return b.matchedScore - a.matchedScore
        })
        .slice(0, limit)
        .map(r => r.id)
}

/**
 * Build final recipe results with metadata
 */
async function buildRecipeResults(recipeIds: string[], recipeScores: any[], userIngredientIds: string[]) {
    const [suggestedRecipes, recipeIngredientsMap] = await Promise.all([
        db.select().from(recipes).where(inArray(recipes.id, recipeIds)),
        db.select({
            recipeId: recipeIngredients.recipeId,
            ingredientId: ingredients.id,
            ingredientName: ingredients.name
        })
            .from(recipeIngredients)
            .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
            .where(inArray(recipeIngredients.recipeId, recipeIds))
    ])

    const results = suggestedRecipes.map(recipe => {
        const scores = recipeScores.find(s => s.id === recipe.id)
        const ingredientsForRecipe = recipeIngredientsMap.filter(ri => ri.recipeId === recipe.id)

        const matchedIngredientNames = ingredientsForRecipe
            .filter(ing => ing.ingredientId && userIngredientIds.includes(ing.ingredientId))
            .map(ing => ing.ingredientName)

        const missingIngredientNames = ingredientsForRecipe
            .filter(ing => ing.ingredientId && !userIngredientIds.includes(ing.ingredientId))
            .map(ing => ing.ingredientName)

        return {
            ...recipe,
            totalScore: scores?.totalScore,
            matchedScore: scores?.matchedScore,
            matchPercentage: scores ? Math.round((scores.matchedScore / scores.totalScore) * 100) : 0,
            matchedIngredientNames,
            missingIngredientNames
        }
    })

    return results.sort((a, b) => b.matchPercentage - a.matchPercentage)
}

// Helper functions for availability checking

/**
 * Get recipe ingredients with details
 */
async function getRecipeIngredients(recipeId: string) {
    return db
        .select({
            ingredientId: recipeIngredients.ingredientId,
            amount: recipeIngredients.amount,
            unit: recipeIngredients.unit,
            ingredientName: ingredients.name
        })
        .from(recipeIngredients)
        .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
        .where(eq(recipeIngredients.recipeId, recipeId))
}

/**
 * Build availability check results
 */
function buildAvailabilityCheck(recipeIngredients: any[], userPantryMap: Map<string, any>) {
    return recipeIngredients.map(recipeIngredient => {
        const userItem = userPantryMap.get(recipeIngredient.ingredientId)

        return {
            ingredientName: recipeIngredient.ingredientName,
            required: {
                amount: recipeIngredient.amount,
                unit: recipeIngredient.unit
            },
            available: userItem ? {
                amount: userItem.quantity,
                unit: userItem.unit
            } : null,
            hasEnough: userItem ?
                (userItem.unit === recipeIngredient.unit &&
                    userItem.quantity >= recipeIngredient.amount) : false
        }
    })
}
