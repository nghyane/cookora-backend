import { db } from '@/shared/database/connection'
import { pantryItems, ingredients } from '@/shared/database/schema'
import { eq, and, count, desc, asc, lte, gte } from 'drizzle-orm'
import type { PantrySearchQuery } from '@/shared/schemas/api/pantry.schemas'

/**
 * Pantry Queries - Search and filtering functionality  
 * Handles: search, filtering, expiring items, basic listing
 */

/**
 * Lấy danh sách pantry items của user với filtering và pagination
 */
export async function getPantryItems(userId: string, query: PantrySearchQuery) {
    const { ingredientId, expiringBefore, page, limit } = query
    const offset = (page - 1) * limit

    // Xây dựng điều kiện where
    const whereConditions = [eq(pantryItems.userId, userId)]

    if (ingredientId) {
        whereConditions.push(eq(pantryItems.ingredientId, ingredientId))
    }

    if (expiringBefore) {
        whereConditions.push(lte(pantryItems.expiresAt, expiringBefore))
    }

    const whereClause = and(...whereConditions)

    // Query chính với join ingredients để lấy thông tin chi tiết
    const itemsQuery = db
        .select({
            id: pantryItems.id,
            userId: pantryItems.userId,
            ingredientId: pantryItems.ingredientId,
            quantity: pantryItems.quantity,
            unit: pantryItems.unit,
            addedAt: pantryItems.addedAt,
            expiresAt: pantryItems.expiresAt,
            notes: pantryItems.notes,
            // Thông tin ingredient
            ingredient: {
                id: ingredients.id,
                name: ingredients.name,
                category: ingredients.category,
                imageUrl: ingredients.imageUrl,
            }
        })
        .from(pantryItems)
        .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(pantryItems.addedAt))

    // Query để đếm tổng số
    const totalQuery = db
        .select({ count: count() })
        .from(pantryItems)
        .where(whereClause)

    const [items, [totalResult]] = await Promise.all([itemsQuery, totalQuery])

    return {
        items,
        total: totalResult.count,
        page,
        limit,
        totalPages: Math.ceil(totalResult.count / limit)
    }
}

/**
 * Lấy items sắp hết hạn
 */
export async function getExpiringItems(userId: string, days: number = 7) {
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + days)

    const expiringItems = await db
        .select({
            id: pantryItems.id,
            quantity: pantryItems.quantity,
            unit: pantryItems.unit,
            expiresAt: pantryItems.expiresAt,
            notes: pantryItems.notes,
            ingredient: {
                id: ingredients.id,
                name: ingredients.name,
                category: ingredients.category,
                imageUrl: ingredients.imageUrl,
            }
        })
        .from(pantryItems)
        .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id))
        .where(
            and(
                eq(pantryItems.userId, userId),
                lte(pantryItems.expiresAt, expiryDate),
                gte(pantryItems.expiresAt, new Date()) // Chưa hết hạn
            )
        )
        .orderBy(asc(pantryItems.expiresAt))

    return expiringItems
}

/**
 * Get user's ingredient IDs for internal use
 */
export async function getUserIngredientIds(userId: string): Promise<string[]> {
    const userIngredients = await db
        .select({ ingredientId: pantryItems.ingredientId })
        .from(pantryItems)
        .where(eq(pantryItems.userId, userId))

    return userIngredients.map(item => item.ingredientId)
}

/**
 * Get user pantry as Map for O(1) lookup
 */
export async function getUserPantryMap(userId: string) {
    const userPantryData = await db
        .select({
            ingredientId: pantryItems.ingredientId,
            quantity: pantryItems.quantity,
            unit: pantryItems.unit
        })
        .from(pantryItems)
        .where(eq(pantryItems.userId, userId))

    return new Map(userPantryData.map(item => [item.ingredientId, item]))
}
