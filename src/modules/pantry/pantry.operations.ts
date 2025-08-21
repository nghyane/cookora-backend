import { db } from '@/shared/database/connection'
import { pantryItems, ingredients } from '@/shared/database/schema'
import { eq, inArray } from 'drizzle-orm'
import { NotFoundError, ForbiddenError } from '@/shared/utils/errors'
import type { AddPantryItem, UpdatePantryItem } from '@/shared/schemas/api/pantry.schemas'

/**
 * Pantry Operations - Basic CRUD functionality
 * Handles: add, update, delete, batch operations
 */

/**
 * Thêm item vào pantry của user, với transaction để đảm bảo ingredient tồn tại.
 */
export async function addPantryItem(userId: string, data: AddPantryItem) {
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
export async function addPantryBatch(userId: string, items: AddPantryItem[]) {
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
export async function updatePantryItem(userId: string, itemId: string, data: UpdatePantryItem) {
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
        const updateData: Partial<typeof pantryItems.$inferInsert> = { ...data }

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
export async function removePantryItem(userId: string, itemId: string) {
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
