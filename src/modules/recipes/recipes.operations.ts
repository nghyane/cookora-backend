import { db } from '@/shared/database/connection'
import { recipes } from '@/shared/database/schema'
import { eq } from 'drizzle-orm'
import { NotFoundError, ForbiddenError } from '@/shared/utils/errors'
import type { CreateRecipeRequest, UpdateRecipeRequest } from '@/shared/schemas/api/recipe.schemas'
import { verifyRecipeOwnership } from './recipes.utils'

/**
 * Recipe Operations - Basic CRUD functionality
 * Handles: create, update, delete operations
 */

/**
 * Tạo công thức mới
 */
export async function createRecipe(authorId: string, data: CreateRecipeRequest) {
    return db.transaction(async tx => {
        const [newRecipe] = await tx
            .insert(recipes)
            .values({
                title: data.title,
                description: data.description,
                imageUrl: data.imageUrl,
                servings: data.servings,
                cookingTime: data.cookingTime,
                authorId,
            })
            .returning()

        return newRecipe
    })
}

/**
 * Cập nhật công thức (với ownership checking)
 */
export async function updateRecipe(authorId: string, recipeId: string, data: UpdateRecipeRequest) {
    return db.transaction(async tx => {
        // Kiểm tra recipe tồn tại và ownership
        await verifyRecipeOwnership(tx, authorId, recipeId)

        // Cập nhật recipe
        const [updatedRecipe] = await tx
            .update(recipes)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(recipes.id, recipeId))
            .returning()

        return updatedRecipe
    })
}

/**
 * Xóa công thức (với ownership checking)
 */
export async function deleteRecipe(authorId: string, recipeId: string) {
    return db.transaction(async tx => {
        // Kiểm tra recipe tồn tại và ownership
        await verifyRecipeOwnership(tx, authorId, recipeId)

        // Xóa recipe (cascade sẽ tự động xóa ingredients và instructions)
        const [deletedRecipe] = await tx
            .delete(recipes)
            .where(eq(recipes.id, recipeId))
            .returning({ id: recipes.id })

        return deletedRecipe
    })
}
