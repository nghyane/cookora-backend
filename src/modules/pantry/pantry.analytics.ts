import { db } from '@/shared/database/connection'
import { pantryItems, ingredients } from '@/shared/database/schema'
import { eq, and, count, desc, lte, gte } from 'drizzle-orm'

/**
 * Pantry Analytics - Statistics and insights functionality
 * Handles: usage stats, category breakdown, expiry tracking
 */

/**
 * Thống kê pantry của user
 */
export async function getPantryStats(userId: string) {
    // Tổng số items
    const [totalItemsResult] = await db
        .select({ count: count() })
        .from(pantryItems)
        .where(eq(pantryItems.userId, userId))

    // Items sắp hết hạn trong 7 ngày
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    const [expiringThisWeekResult] = await db
        .select({ count: count() })
        .from(pantryItems)
        .where(
            and(
                eq(pantryItems.userId, userId),
                lte(pantryItems.expiresAt, nextWeek),
                gte(pantryItems.expiresAt, new Date())
            )
        )

    // Thống kê theo categories
    const categoriesStats = await db
        .select({
            category: ingredients.category,
            count: count()
        })
        .from(pantryItems)
        .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id))
        .where(eq(pantryItems.userId, userId))
        .groupBy(ingredients.category)
        .orderBy(desc(count()))

    return {
        totalItems: totalItemsResult.count,
        expiringThisWeek: expiringThisWeekResult.count,
        categories: categoriesStats.reduce((acc, item) => {
            if (item.category) {
                acc[item.category] = item.count
            }
            return acc
        }, {} as Record<string, number>)
    }
}
