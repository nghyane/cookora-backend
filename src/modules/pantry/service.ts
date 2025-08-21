import { db } from '@/shared/database/connection'
import { pantryItems, ingredients, recipes, recipeIngredients } from '@/shared/database/schema'
import { eq, and, count, sql, desc, asc, lte, gte, inArray, isNotNull, getTableColumns } from 'drizzle-orm'
import { NotFoundError, ForbiddenError } from '@/shared/utils/errors'
import type {
    AddPantryItem,
    UpdatePantryItem,
    PantrySearchQuery
} from '@/shared/schemas'

export class PantryService {
    /**
     * Thêm item vào pantry của user, với transaction để đảm bảo ingredient tồn tại.
     */
    async addItem(userId: string, data: AddPantryItem) {
        return db.transaction(async tx => {
            const [ingredient] = await tx
                .select({ id: ingredients.id })
                .from(ingredients)
                .where(eq(ingredients.id, data.ingredientId))
                .limit(1)

            if (!ingredient) {
                throw new NotFoundError('Nguyên liệu không tồn tại.')
            }

            const [newItem] = await tx
                .insert(pantryItems)
                .values({
                    userId,
                    ingredientId: data.ingredientId,
                    quantity: data.quantity,
                    unit: data.unit,
                    expiresAt: data.expiresAt,
                    notes: data.notes,
                })
                .returning()

            return newItem
        })
    }

    /**
     * Thêm nhiều items cùng lúc (batch), với transaction để đảm bảo tất cả đều thành công hoặc không gì cả.
     */
    async addBatch(userId: string, items: AddPantryItem[]) {
        if (items.length === 0) {
            return []
        }

        return db.transaction(async tx => {
            const ingredientIds = [...new Set(items.map(item => item.ingredientId))]
            const existingIngredients = await tx
                .select({ id: ingredients.id })
                .from(ingredients)
                .where(inArray(ingredients.id, ingredientIds))

            if (existingIngredients.length !== ingredientIds.length) {
                const existingIds = new Set(existingIngredients.map(i => i.id))
                const missingIds = ingredientIds.filter(id => !existingIds.has(id))
                throw new NotFoundError(`Các nguyên liệu không tồn tại: ${missingIds.join(', ')}`)
            }

            const itemsToInsert = items.map(item => ({
                userId,
                ingredientId: item.ingredientId,
                quantity: item.quantity,
                unit: item.unit,
                expiresAt: item.expiresAt,
                notes: item.notes,
            }))

            const newItems = await tx
                .insert(pantryItems)
                .values(itemsToInsert)
                .returning()

            return newItems
        })
    }

    /**
     * Cập nhật pantry item (với ownership checking và transaction)
     */
    async updateItem(userId: string, itemId: string, data: UpdatePantryItem) {
        return db.transaction(async tx => {
            // 1. Kiểm tra item tồn tại và ownership
            const [existingItem] = await tx
                .select({ userId: pantryItems.userId })
                .from(pantryItems)
                .where(eq(pantryItems.id, itemId))
                .limit(1)

            if (!existingItem) {
                throw new NotFoundError('Pantry item không tồn tại')
            }

            if (existingItem.userId !== userId) {
                throw new ForbiddenError('Bạn không có quyền truy cập item này')
            }

            // 2. Chuẩn bị update data và thực hiện
            const updateData: any = { ...data }

            const [updatedItem] = await tx
                .update(pantryItems)
                .set(updateData)
                .where(eq(pantryItems.id, itemId))
                .returning()

            return updatedItem
        })
    }

    /**
     * Xóa item khỏi pantry (với ownership checking và transaction)
     */
    async removeItem(userId: string, itemId: string) {
        return db.transaction(async tx => {
            // 1. Kiểm tra item tồn tại và ownership
            const [existingItem] = await tx
                .select({ userId: pantryItems.userId })
                .from(pantryItems)
                .where(eq(pantryItems.id, itemId))
                .limit(1)

            if (!existingItem) {
                throw new NotFoundError('Pantry item không tồn tại')
            }

            if (existingItem.userId !== userId) {
                throw new ForbiddenError('Bạn không có quyền truy cập item này')
            }

            // 2. Xóa item
            const [deletedItem] = await tx
                .delete(pantryItems)
                .where(eq(pantryItems.id, itemId))
                .returning({ id: pantryItems.id })

            return deletedItem
        })
    }

    /**
     * Lấy danh sách pantry items của user với filtering và pagination
     */
    async getPantryItems(userId: string, query: PantrySearchQuery) {
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
    async getExpiringItems(userId: string, days: number = 7) {
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
     * Thống kê pantry của user
     */
    async getStats(userId: string) {
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

    /**
     * Gợi ý recipes dựa trên ingredients có sẵn trong pantry
     */
    async suggestRecipes(userId: string, options: {
        limit?: number
        cookingTime?: number
        servings?: number
    } = {}) {
        const { limit = 10 } = options

        // ✅ SIMPLIFIED: Break down into smaller methods
        const userIngredientIds = await this._getUserIngredientIds(userId)
        if (userIngredientIds.length === 0) {
            return []
        }

        const recipeScores = await this._calculateRecipeScores(userIngredientIds)
        if (recipeScores.length === 0) {
            return []
        }

        const topRecipeIds = this._selectTopRecipes(recipeScores, limit)
        return this._buildRecipeResults(topRecipeIds, recipeScores, userIngredientIds)
    }

    /**
     * ✅ EXTRACTED: Get user's ingredient IDs
     */
    private async _getUserIngredientIds(userId: string): Promise<string[]> {
        const userIngredients = await db
            .select({ ingredientId: pantryItems.ingredientId })
            .from(pantryItems)
            .where(eq(pantryItems.userId, userId))

        return userIngredients.map(item => item.ingredientId)
    }

    /**
     * ✅ EXTRACTED: Calculate recipe match scores
     */
    private async _calculateRecipeScores(userIngredientIds: string[]) {
        return db
            .select({
                id: recipes.id,
                totalScore: sql<number>`sum(case when ${ingredients.category} in ('meat', 'seafood', 'vegetables', 'grains', 'protein') then 5 else 1 end)`.as('total_score'),
                matchedScore: sql<number>`sum(case when ${recipeIngredients.ingredientId} in (${sql.join(userIngredientIds, sql.raw(','))}) then (case when ${ingredients.category} in ('meat', 'seafood', 'vegetables', 'grains', 'protein') then 5 else 1 end) else 0 end)`.as('matched_score')
            })
            .from(recipes)
            .innerJoin(recipeIngredients, eq(recipes.id, recipeIngredients.recipeId))
            .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
            .groupBy(recipes.id)
            .having(sql`sum(case when ${recipeIngredients.ingredientId} in (${sql.join(userIngredientIds, sql.raw(','))}) then (case when ${ingredients.category} in ('meat', 'seafood', 'vegetables', 'grains', 'protein') then 5 else 1 end) else 0 end) > 0`)
    }

    /**
     * ✅ EXTRACTED: Select top recipes by match percentage
     */
    private _selectTopRecipes(recipeScores: any[], limit: number): string[] {
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
     * ✅ EXTRACTED: Build final recipe results with metadata
     */
    private async _buildRecipeResults(recipeIds: string[], recipeScores: any[], userIngredientIds: string[]) {
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

    /**
     * Kiểm tra user có đủ ingredients cho một recipe không
     */
    async checkRecipeAvailability(userId: string, recipeId: string) {
        // ✅ SIMPLIFIED: Use parallel queries and cleaner logic
        const [recipeIngredientsData, userPantryData] = await Promise.all([
            this._getRecipeIngredients(recipeId),
            this._getUserPantryMap(userId)
        ])

        const availability = this._buildAvailabilityCheck(recipeIngredientsData, userPantryData)

        return {
            canMake: availability.every(item => item.hasEnough),
            availability,
            missingIngredients: availability.filter(item => !item.hasEnough)
        }
    }

    /**
     * ✅ EXTRACTED: Get recipe ingredients with details
     */
    private async _getRecipeIngredients(recipeId: string) {
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
     * ✅ EXTRACTED: Get user pantry as Map for O(1) lookup
     */
    private async _getUserPantryMap(userId: string) {
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

    /**
     * ✅ EXTRACTED: Build availability check results
     */
    private _buildAvailabilityCheck(recipeIngredients: any[], userPantryMap: Map<string, any>) {
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
}

export const pantryService = new PantryService() 