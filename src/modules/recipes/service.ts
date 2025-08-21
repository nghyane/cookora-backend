import { db } from '@/shared/database/connection'
import { recipes, recipeIngredients, recipeInstructions, ingredients, users } from '@/shared/database/schema'
import { eq, and, count, sql, desc, asc, ilike, inArray, or } from 'drizzle-orm'
import { NotFoundError, ForbiddenError } from '@/shared/utils/errors'
import type {
  CreateRecipeRequest,
  UpdateRecipeRequest,
  RecipeSearchQuery
} from '@/shared/schemas'

export class RecipesService {
  /**
   * Lấy danh sách công thức với tìm kiếm và phân trang
   */
  async getAll(query: RecipeSearchQuery) {
    const { query: searchQuery, ingredients: ingredientFilter, page, limit, sortBy, sortOrder } = query
    const offset = (page - 1) * limit

    // Xây dựng điều kiện where
    const whereConditions = []

    if (searchQuery) {
      whereConditions.push(
        or(
          ilike(recipes.title, `%${searchQuery}%`),
          ilike(recipes.description, `%${searchQuery}%`)
        )
      )
    }

    if (ingredientFilter && ingredientFilter.length > 0) {
      // Tìm recipes có chứa ít nhất một trong các ingredients
      const recipeIdsWithIngredients = db
        .selectDistinct({ recipeId: recipeIngredients.recipeId })
        .from(recipeIngredients)
        .where(inArray(recipeIngredients.ingredientId, ingredientFilter))

      whereConditions.push(
        inArray(recipes.id, recipeIdsWithIngredients)
      )
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Xác định sort order
    const sortColumn = sortBy === 'title' ? recipes.title :
      sortBy === 'cooking_time' ? recipes.cookingTime :
        sortBy === 'updated_at' ? recipes.updatedAt :
          recipes.createdAt // default

    const orderFn = sortOrder === 'asc' ? asc : desc

    // Query chính với join author
    const recipesQuery = db
      .select({
        id: recipes.id,
        title: recipes.title,
        description: recipes.description,
        imageUrl: recipes.imageUrl,
        servings: recipes.servings,
        cookingTime: recipes.cookingTime,
        createdAt: recipes.createdAt,
        updatedAt: recipes.updatedAt,
        author: {
          id: users.id,
          name: users.name,
        }
      })
      .from(recipes)
      .innerJoin(users, eq(recipes.authorId, users.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(orderFn(sortColumn))

    // Query để đếm tổng số
    const totalQuery = db
      .select({ count: count() })
      .from(recipes)
      .where(whereClause)

    const [recipesList, [totalResult]] = await Promise.all([recipesQuery, totalQuery])

    return {
      recipes: recipesList,
      total: totalResult.count,
      page,
      limit,
      totalPages: Math.ceil(totalResult.count / limit)
    }
  }

  /**
   * Lấy thông tin chi tiết công thức theo ID
   */
  async getById(id: string) {
    const [recipe] = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        description: recipes.description,
        imageUrl: recipes.imageUrl,
        servings: recipes.servings,
        cookingTime: recipes.cookingTime,
        createdAt: recipes.createdAt,
        updatedAt: recipes.updatedAt,
        author: {
          id: users.id,
          name: users.name,
        }
      })
      .from(recipes)
      .innerJoin(users, eq(recipes.authorId, users.id))
      .where(eq(recipes.id, id))
      .limit(1)

    if (!recipe) {
      throw new NotFoundError('Công thức không tồn tại')
    }

    // ✅ OPTIMIZED: Parallel queries for ingredients and instructions
    const [recipeIngredientsData, instructionsData] = await Promise.all([
      db
        .select({
          ingredientId: recipeIngredients.ingredientId,
          amount: recipeIngredients.amount,
          unit: recipeIngredients.unit,
          notes: recipeIngredients.notes,
          ingredient: {
            id: ingredients.id,
            name: ingredients.name,
            category: ingredients.category,
            imageUrl: ingredients.imageUrl,
          }
        })
        .from(recipeIngredients)
        .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
        .where(eq(recipeIngredients.recipeId, id)),
      db
        .select({
          step: recipeInstructions.step,
          description: recipeInstructions.description,
        })
        .from(recipeInstructions)
        .where(eq(recipeInstructions.recipeId, id))
        .orderBy(asc(recipeInstructions.step))
    ])

    return {
      ...recipe,
      ingredients: recipeIngredientsData,
      instructions: instructionsData
    }
  }

  /**
   * Tạo công thức mới
   */
  async create(authorId: string, data: CreateRecipeRequest) {
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
  async update(authorId: string, recipeId: string, data: UpdateRecipeRequest) {
    return db.transaction(async tx => {
      // Kiểm tra recipe tồn tại và ownership
      const [existingRecipe] = await tx
        .select({ authorId: recipes.authorId })
        .from(recipes)
        .where(eq(recipes.id, recipeId))
        .limit(1)

      if (!existingRecipe) {
        throw new NotFoundError('Công thức không tồn tại')
      }

      if (existingRecipe.authorId !== authorId) {
        throw new ForbiddenError('Bạn không có quyền chỉnh sửa công thức này')
      }

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
  async delete(authorId: string, recipeId: string) {
    return db.transaction(async tx => {
      // Kiểm tra recipe tồn tại và ownership
      const [existingRecipe] = await tx
        .select({ authorId: recipes.authorId })
        .from(recipes)
        .where(eq(recipes.id, recipeId))
        .limit(1)

      if (!existingRecipe) {
        throw new NotFoundError('Công thức không tồn tại')
      }

      if (existingRecipe.authorId !== authorId) {
        throw new ForbiddenError('Bạn không có quyền xóa công thức này')
      }

      // Xóa recipe (cascade sẽ tự động xóa ingredients và instructions)
      const [deletedRecipe] = await tx
        .delete(recipes)
        .where(eq(recipes.id, recipeId))
        .returning({ id: recipes.id })

      return deletedRecipe
    })
  }

  /**
   * Tìm công thức theo nguyên liệu
   */
  async findByIngredients(ingredientIds: string[], matchType: 'all' | 'any' = 'any', limit: number = 10) {
    if (matchType === 'all') {
      // Tìm recipes có TẤT CẢ ingredients
      const recipeScores = await db.execute(sql`
                SELECT 
                    r.id,
                    r.title,
                    r.cooking_time,
                    r.servings,
                    r.image_url,
                    COUNT(ri.ingredient_id) as matched_ingredients,
                    u.name as author_name
                FROM recipes r
                JOIN recipe_ingredients ri ON r.id = ri.recipe_id
                JOIN users u ON r.author_id = u.id
                WHERE ri.ingredient_id IN ${ingredientIds}
                GROUP BY r.id, r.title, r.cooking_time, r.servings, r.image_url, u.name
                HAVING COUNT(ri.ingredient_id) = ${ingredientIds.length}
                ORDER BY matched_ingredients DESC
                LIMIT ${limit}
            `)

      return recipeScores
    } else {
      // Tìm recipes có ÍT NHẤT MỘT ingredient
      const recipeScores = await db.execute(sql`
                SELECT 
                    r.id,
                    r.title,
                    r.cooking_time,
                    r.servings,
                    r.image_url,
                    COUNT(ri.ingredient_id) as matched_ingredients,
                    u.name as author_name
                FROM recipes r
                JOIN recipe_ingredients ri ON r.id = ri.recipe_id
                JOIN users u ON r.author_id = u.id
                WHERE ri.ingredient_id IN ${ingredientIds}
                GROUP BY r.id, r.title, r.cooking_time, r.servings, r.image_url, u.name
                ORDER BY matched_ingredients DESC, r.created_at DESC
                LIMIT ${limit}
            `)

      return recipeScores
    }
  }

  /**
   * Thêm nguyên liệu vào công thức
   */
  async addIngredients(authorId: string, recipeId: string, ingredientsData: Array<{
    ingredientId: string
    amount: number
    unit: string
    notes?: string
  }>) {
    return db.transaction(async tx => {
      // Kiểm tra ownership
      await this._verifyOwnership(tx, authorId, recipeId)

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
  async addInstructions(authorId: string, recipeId: string, instructionsData: Array<{
    step: number
    description: string
  }>) {
    return db.transaction(async tx => {
      // Kiểm tra ownership
      await this._verifyOwnership(tx, authorId, recipeId)

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

  /**
   * Private method: Kiểm tra ownership
   */
  private async _verifyOwnership(tx: any, authorId: string, recipeId: string) {
    const [recipe] = await tx
      .select({ authorId: recipes.authorId })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1)

    if (!recipe) {
      throw new NotFoundError('Công thức không tồn tại')
    }

    if (recipe.authorId !== authorId) {
      throw new ForbiddenError('Bạn không có quyền truy cập công thức này')
    }

    return recipe
  }
}

export const recipesService = new RecipesService()
