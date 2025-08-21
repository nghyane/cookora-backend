import { db } from '@/shared/database/connection'
import { recipeIngredients, recipeInstructions } from '@/shared/database/schema'
import { eq } from 'drizzle-orm'
import { verifyRecipeOwnership } from './recipes.utils'

/**
 * Recipe Content Management - Ingredients and instructions functionality
 * Handles: adding/updating ingredients, adding/updating instructions
 */

/**
 * Thêm nguyên liệu vào công thức
 */
export async function addRecipeIngredients(authorId: string, recipeId: string, ingredientsData: Array<{
    ingredientId: string
    amount: number
    unit: string
    notes?: string
}>) {
    return db.transaction(async tx => {
        // Kiểm tra ownership
        await verifyRecipeOwnership(tx, authorId, recipeId)

        // Xóa ingredients cũ
        await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId))

        // Thêm ingredients mới
        if (ingredientsData.length > 0) {
            const ingredientsToInsert = ingredientsData.map(item => ({
                recipeId,
                ingredientId: item.ingredientId,
                amount: item.amount,
                unit: item.unit,
                notes: item.notes,
            }))

            await tx.insert(recipeIngredients).values(ingredientsToInsert)
        }

        return { success: true }
    })
}

/**
 * Thêm các bước thực hiện vào công thức
 */
export async function addRecipeInstructions(authorId: string, recipeId: string, instructionsData: Array<{
    step: number
    description: string
}>) {
    return db.transaction(async tx => {
        // Kiểm tra ownership
        await verifyRecipeOwnership(tx, authorId, recipeId)

        // Xóa instructions cũ
        await tx.delete(recipeInstructions).where(eq(recipeInstructions.recipeId, recipeId))

        // Thêm instructions mới
        if (instructionsData.length > 0) {
            const instructionsToInsert = instructionsData.map(item => ({
                recipeId,
                step: item.step,
                description: item.description,
            }))

            await tx.insert(recipeInstructions).values(instructionsToInsert)
        }

        return { success: true }
    })
}
