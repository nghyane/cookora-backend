import { db } from '@/shared/database/connection'
import { userFavorites, recipes } from '@/shared/database/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import { NotFoundError, ConflictError } from '@/shared/utils/errors'

/**
 * User Favorites - Favorites management functionality
 * Handles: get favorites, add to favorites, remove from favorites
 */

/**
 * Lấy danh sách favorite recipes của user với pagination
 */
export async function getUserFavorites(userId: string, page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit

  const [favorites, [totalResult]] = await Promise.all([
    db.select({
      recipe: {
        id: recipes.id,
        title: recipes.title,
        description: recipes.description,
        imageUrl: recipes.imageUrl,
        cookingTime: recipes.cookingTime,
        servings: recipes.servings,
        createdAt: recipes.createdAt,
      },
      favoritedAt: userFavorites.createdAt,
    })
      .from(userFavorites)
      .innerJoin(recipes, eq(userFavorites.recipeId, recipes.id))
      .where(eq(userFavorites.userId, userId))
      .orderBy(desc(userFavorites.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ count: count() })
      .from(userFavorites)
      .where(eq(userFavorites.userId, userId))
  ])

  return {
    favorites,
    total: totalResult.count,
    page,
    limit,
    totalPages: Math.ceil(totalResult.count / limit)
  }
}

/**
 * Thêm recipe vào favorites với validation
 */
export async function addToFavorites(userId: string, recipeId: string) {
  return db.transaction(async tx => {
    // Check if already in favorites
    const existing = await tx
      .select()
      .from(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.recipeId, recipeId)
      ))
      .limit(1)

    if (existing.length > 0) {
      throw new ConflictError('Công thức đã có trong danh sách yêu thích')
    }

    // Check if recipe exists
    const recipe = await tx
      .select({ id: recipes.id })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1)

    if (recipe.length === 0) {
      throw new NotFoundError('Recipe not found')
    }

    const [favorite] = await tx
      .insert(userFavorites)
      .values({ userId, recipeId })
      .returning()

    return favorite
  })
}

/**
 * Xóa recipe khỏi favorites
 */
export async function removeFromFavorites(userId: string, recipeId: string) {
  const result = await db
    .delete(userFavorites)
    .where(and(
      eq(userFavorites.userId, userId),
      eq(userFavorites.recipeId, recipeId)
    ))
    .returning()

  if (result.length === 0) {
    throw new NotFoundError('Recipe not found in favorites')
  }

  return result[0]
}
