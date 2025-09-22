import { db } from "@/shared/database/connection";
import {
  ingredients,
  recipes,
  recipeIngredients,
} from "@/shared/database/schema";
import { eq, ilike, and, count, sql } from "drizzle-orm";
import { NotFoundError, ConflictError } from "@/shared/utils/errors";
import type {
  CreateIngredientRequest,
  UpdateIngredientRequest,
  IngredientSearchQuery,
} from "@/shared/schemas/api/ingredient.schemas";

export class IngredientsService {
  /**
   * Lấy nguyên liệu theo ID
   */
  async getById(id: string) {
    const [ingredient] = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.id, id))
      .limit(1);

    if (!ingredient) {
      throw new NotFoundError("Nguyên liệu không tồn tại");
    }

    return ingredient;
  }

  /**
   * Lấy danh sách nguyên liệu với tìm kiếm và phân trang
   */
  async getAll(query: IngredientSearchQuery) {
    const { query: searchQuery, category, page, limit } = query;
    const offset = (page - 1) * limit;

    // Xây dựng điều kiện where động
    const whereConditions = [];

    if (searchQuery) {
      // Tìm kiếm trong name và aliases (JSON array)
      whereConditions.push(
        sql`(
          ${ingredients.name} ILIKE ${`%${searchQuery}%`} OR
          ${ingredients.aliases}::text ILIKE ${`%${searchQuery}%`}
        )`,
      );
    }

    if (category) {
      whereConditions.push(eq(ingredients.category, category));
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [items, [totalResult]] = await Promise.all([
      db
        .select()
        .from(ingredients)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(ingredients.name),
      db.select({ count: count() }).from(ingredients).where(whereClause),
    ]);

    return {
      items,
      total: totalResult.count,
      page,
      limit,
      totalPages: Math.ceil(totalResult.count / limit),
    };
  }

  /**
   * Tạo nguyên liệu mới (Admin only)
   */
  async create(data: CreateIngredientRequest) {
    // Kiểm tra tên nguyên liệu đã tồn tại chưa
    const [existing] = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.name, data.name))
      .limit(1);

    if (existing) {
      throw new ConflictError("Nguyên liệu với tên này đã tồn tại");
    }

    const [newIngredient] = await db
      .insert(ingredients)
      .values({
        name: data.name,
        category: data.category,
        aliases: data.aliases || [],
        imageUrl: data.imageUrl,
      })
      .returning();

    return newIngredient;
  }

  /**
   * Cập nhật nguyên liệu (Admin only)
   */
  async update(id: string, data: UpdateIngredientRequest) {
    // Kiểm tra nguyên liệu tồn tại
    await this.getById(id);

    // Nếu cập nhật tên, kiểm tra trùng lặp
    if (data.name) {
      const [existing] = await db
        .select()
        .from(ingredients)
        .where(
          and(eq(ingredients.name, data.name), sql`${ingredients.id} != ${id}`),
        )
        .limit(1);

      if (existing) {
        throw new ConflictError("Nguyên liệu với tên này đã tồn tại");
      }
    }

    const [updatedIngredient] = await db
      .update(ingredients)
      .set(data)
      .where(eq(ingredients.id, id))
      .returning();

    return updatedIngredient;
  }

  /**
   * Xóa nguyên liệu (Admin only)
   */
  async delete(id: string) {
    // Kiểm tra nguyên liệu tồn tại
    await this.getById(id);

    try {
      const [deletedIngredient] = await db
        .delete(ingredients)
        .where(eq(ingredients.id, id))
        .returning({ id: ingredients.id });

      return deletedIngredient;
    } catch (error: any) {
      // Check for PostgreSQL foreign key violation error code
      // The error might be wrapped by Drizzle, so check the cause as well
      const errorCode = error.code || error?.cause?.code;
      if (
        errorCode === "23503" ||
        error?.message?.includes("violates foreign key")
      ) {
        // Get recipes using this ingredient
        const recipesUsing = await db
          .select({
            id: recipes.id,
            title: recipes.title,
          })
          .from(recipeIngredients)
          .innerJoin(recipes, eq(recipeIngredients.recipeId, recipes.id))
          .where(eq(recipeIngredients.ingredientId, id))
          .limit(5);

        const recipeCount = recipesUsing.length;
        const recipeNames = recipesUsing.map((r) => r.title).join(", ");

        throw new ConflictError(
          `Không thể xóa nguyên liệu. Đang được sử dụng trong ${recipeCount} công thức: ${recipeNames}${recipeCount >= 5 ? "..." : ""}`,
          "INGREDIENT_IN_USE",
          {
            recipes: recipesUsing.map((r) => ({ id: r.id, title: r.title })),
            totalCount: recipeCount,
          },
        );
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Gợi ý nguyên liệu dựa trên từ khóa
   */
  async getSuggestions(query: string, limit = 10) {
    if (!query || query.length < 2) {
      return [];
    }

    const suggestions = await db
      .select({
        id: ingredients.id,
        name: ingredients.name,
        category: ingredients.category,
        typicalShelfLifeDays: ingredients.typicalShelfLifeDays,
      })
      .from(ingredients)
      .where(
        sql`(
          ${ingredients.name} ILIKE ${`%${query}%`} OR
          ${ingredients.aliases}::text ILIKE ${`%${query}%`}
        )`,
      )
      .limit(limit)
      .orderBy(ingredients.name);

    return suggestions;
  }
}

export const ingredientsService = new IngredientsService();
