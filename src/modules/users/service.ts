import { db } from '@/shared/database/connection'
import { users, authProviders, userFavorites } from '@/shared/database/schema'
import { recipes } from '@/shared/database/schema'
import { eq, and, count, desc, sql } from 'drizzle-orm'
import { providerRegistry } from '@/modules/auth/providers'
import type { EmailAuthProvider } from '@/modules/auth/providers/email.provider'
import { UnauthorizedError, NotFoundError, ConflictError } from '@/shared/utils/errors'

// This interface defines the shape of a user's public profile.
export interface UserProfile {
  id: string
  email: string
  name: string
  avatarUrl?: string | null
  emailVerified: boolean
  providers: string[]
  createdAt: Date
  updatedAt: Date
}

export class UsersService {
  /**
   * Retrieves a user's profile by their ID.
   * @param userId The ID of the user to retrieve.
   * @returns A promise that resolves to the user's profile or null if not found.
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (!user) return null

    // Get user's auth providers
    const userProviders = await db
      .select({ provider: authProviders.provider })
      .from(authProviders)
      .where(eq(authProviders.userId, userId))

    return {
      ...user,
      providers: userProviders.map(p => p.provider),
    }
  }

  /**
   * Updates a user's profile.
   * @param userId The ID of the user to update.
   * @param updates An object containing the fields to update (e.g., name, avatarUrl).
   * @returns A promise that resolves to the updated user profile.
   */
  async updateProfile(
    userId: string,
    updates: { name?: string; avatarUrl?: string },
  ): Promise<UserProfile> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()

    if (!user) {
      throw new Error('User not found')
    }

    // Get providers to return the full profile
    const userProviders = await db
      .select({ provider: authProviders.provider })
      .from(authProviders)
      .where(eq(authProviders.userId, userId))

    return {
      ...user,
      providers: userProviders.map(p => p.provider),
    }
  }

  /**
   * Changes a user's password.
   * @param userId The user's ID.
   * @param oldPassword The user's current password.
   * @param newPassword The new password to set.
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const emailProvider = providerRegistry.get('email') as EmailAuthProvider
    // Let email provider handle its own errors - it already throws meaningful errors
    await emailProvider.changePassword(userId, oldPassword, newPassword)
  }

  /**
   * Gets user's favorite recipes with pagination.
   * @param userId The user's ID.
   * @param page Page number.
   * @param limit Items per page.
   * @returns A promise that resolves to the user's favorite recipes.
   */
  async getFavorites(userId: string, page: number = 1, limit: number = 20) {
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
   * Adds a recipe to user's favorites.
   * @param userId The user's ID.
   * @param recipeId The recipe's ID.
   * @returns A promise that resolves when the recipe is added to favorites.
   */
  async addToFavorites(userId: string, recipeId: string) {
    // Check if already in favorites
    const existing = await db
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
    const recipe = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1)

    if (recipe.length === 0) {
      throw new NotFoundError('Recipe not found')
    }

    const [favorite] = await db
      .insert(userFavorites)
      .values({ userId, recipeId })
      .returning()

    return favorite
  }

  /**
   * Removes a recipe from user's favorites.
   * @param userId The user's ID.
   * @param recipeId The recipe's ID.
   * @returns A promise that resolves when the recipe is removed from favorites.
   */
  async removeFromFavorites(userId: string, recipeId: string) {
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

  /**
   * Gets user's created recipes with pagination.
   * @param userId The user's ID.
   * @param page Page number.
   * @param limit Items per page.
   * @returns A promise that resolves to the user's created recipes.
   */
  async getMyRecipes(userId: string, page: number = 1, limit: number = 20) {
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
}

export const usersService = new UsersService()
