import { db } from '@/shared/database/connection'
import { recipes } from '@/shared/database/schema'
import { eq, count, desc } from 'drizzle-orm'

/**
 * User Recipes - User's created recipes functionality
 * Handles: get user's created recipes with pagination
 */

/**
 * Lấy các recipes mà user đã tạo với pagination
 */
export async function getUserRecipes(userId: string, page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit

  const [userRecipes, [totalResult]] = await Promise.all([
    db.select({
      id: recipes.id,
      title: recipes.title,
      description: recipes.description,
      imageUrl: recipes.imageUrl,
      cookingTime: recipes.cookingTime,
      servings: recipes.servings,
      createdAt: recipes.createdAt,
      updatedAt: recipes.updatedAt,
    })
      .from(recipes)
      .where(eq(recipes.authorId, userId))
      .orderBy(desc(recipes.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ count: count() })
      .from(recipes)
      .where(eq(recipes.authorId, userId))
  ])

  return {
    recipes: userRecipes,
    total: totalResult.count,
    page,
    limit,
    totalPages: Math.ceil(totalResult.count / limit)
  }
}
