import { recipes } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import type { BunSQLDatabase } from "drizzle-orm/bun-sql";
import { NotFoundError, ForbiddenError } from "@/shared/utils/errors";

/**
 * Recipe Utilities - Shared helper functions
 * Handles: ownership verification, common validations
 */

/**
 * Kiểm tra ownership của recipe
 */
export async function verifyRecipeOwnership(
  tx: BunSQLDatabase<any>,
  authorId: string,
  recipeId: string,
) {
  const [recipe] = await tx
    .select({ authorId: recipes.authorId })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!recipe) {
    throw new NotFoundError("Công thức không tồn tại");
  }

  if (recipe.authorId !== authorId) {
    throw new ForbiddenError("Bạn không có quyền truy cập công thức này");
  }

  return recipe;
}
