import { db } from "@/shared/database/connection";
import {
  recipes,
  recipeIngredients,
  recipeInstructions,
  ingredients,
  users,
} from "@/shared/database/schema";
import {
  eq,
  and,
  count,
  sql,
  desc,
  asc,
  ilike,
  inArray,
  or,
} from "drizzle-orm";
import { NotFoundError } from "@/shared/utils/errors";
import type { RecipeSearchQuery } from "@/shared/schemas/api/recipe.schemas";

/**
 * Recipe Queries - Search and listing functionality
 * Handles: search, filtering, detail retrieval, ingredient-based finding
 */

/**
 * Lấy danh sách công thức với tìm kiếm và phân trang
 */
export async function getAllRecipes(query: RecipeSearchQuery) {
  const {
    query: searchQuery,
    ingredients: ingredientFilter,
    page,
    limit,
    sortBy,
    sortOrder,
  } = query;
  const offset = (page - 1) * limit;

  // Xây dựng điều kiện where
  const whereConditions = [];

  if (searchQuery) {
    whereConditions.push(
      or(
        ilike(recipes.title, `%${searchQuery}%`),
        ilike(recipes.description, `%${searchQuery}%`),
      ),
    );
  }

  if (ingredientFilter && ingredientFilter.length > 0) {
    // Tìm recipes có chứa ít nhất một trong các ingredients
    const recipeIdsWithIngredients = db
      .selectDistinct({ recipeId: recipeIngredients.recipeId })
      .from(recipeIngredients)
      .where(inArray(recipeIngredients.ingredientId, ingredientFilter));

    whereConditions.push(inArray(recipes.id, recipeIdsWithIngredients));
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Xác định sort order
  const sortColumn =
    sortBy === "title"
      ? recipes.title
      : sortBy === "cooking_time"
        ? recipes.cookingTime
        : sortBy === "updated_at"
          ? recipes.updatedAt
          : recipes.createdAt; // default

  const orderFn = sortOrder === "asc" ? asc : desc;

  // Query chính với join author - Drizzle auto-transforms nested objects!
  const recipesData = await db
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
      },
    })
    .from(recipes)
    .innerJoin(users, eq(recipes.authorId, users.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(orderFn(sortColumn));

  // Query để đếm tổng số
  const [totalResult] = await db
    .select({ count: count() })
    .from(recipes)
    .where(whereClause);

  const totalCount = totalResult?.count || 0;

  return {
    recipes: recipesData,
    total: totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Lấy thông tin chi tiết công thức theo ID
 */
export async function getRecipeById(id: string) {
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
      },
    })
    .from(recipes)
    .innerJoin(users, eq(recipes.authorId, users.id))
    .where(eq(recipes.id, id))
    .limit(1);

  if (!recipe) {
    throw new NotFoundError("Công thức không tồn tại");
  }

  // Run queries sequentially to avoid connection pooling issues
  const ingredientsData = await db
    .select({
      ingredientId: recipeIngredients.ingredientId,
      amount: recipeIngredients.amount,
      unit: recipeIngredients.unit,
      notes: recipeIngredients.notes,
      name: ingredients.name,
      category: ingredients.category,
      imageUrl: ingredients.imageUrl,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, id));

  const instructionsData = await db
    .select({
      step: recipeInstructions.step,
      description: recipeInstructions.description,
    })
    .from(recipeInstructions)
    .where(eq(recipeInstructions.recipeId, id))
    .orderBy(asc(recipeInstructions.step));

  // Transform ingredients to nested structure
  const transformedIngredients = ingredientsData.map((item) => ({
    ingredientId: item.ingredientId,
    amount: item.amount,
    unit: item.unit,
    notes: item.notes,
    ingredient: {
      id: item.ingredientId,
      name: item.name,
      category: item.category,
      imageUrl: item.imageUrl,
    },
  }));

  return {
    ...recipe,
    ingredients: transformedIngredients,
    instructions: instructionsData,
  };
}

/**
 * Tìm công thức theo nguyên liệu với nhiều chiến lược matching
 */
export async function findRecipesByIngredients(
  ingredientIds: string[],
  options: {
    strategy?: "smart" | "percentage" | "count" | "threshold";
    minMatches?: number;
    minPercentage?: number;
    limit?: number;
    includeDetails?: boolean;
  } = {},
) {
  const {
    strategy = "smart",
    minMatches = 0,
    minPercentage = 0,
    limit = 10,
    includeDetails = true,
  } = options;

  if (!ingredientIds.length) return [];

  // Get all recipes with their ingredients
  const allRecipesData = await db
    .select({
      recipeId: recipes.id,
      recipeTitle: recipes.title,
      recipeCookingTime: recipes.cookingTime,
      recipeServings: recipes.servings,
      recipeImageUrl: recipes.imageUrl,
      recipeCreatedAt: recipes.createdAt,
      authorId: users.id,
      authorName: users.name,
      ingredientId: recipeIngredients.ingredientId,
      ingredientName: ingredients.name,
      ingredientCategory: ingredients.category,
    })
    .from(recipes)
    .innerJoin(users, eq(recipes.authorId, users.id))
    .leftJoin(recipeIngredients, eq(recipes.id, recipeIngredients.recipeId))
    .leftJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id));

  // Process recipes to calculate scores
  const recipeMap = new Map<string, any>();

  for (const row of allRecipesData) {
    if (!recipeMap.has(row.recipeId)) {
      recipeMap.set(row.recipeId, {
        id: row.recipeId,
        title: row.recipeTitle,
        cookingTime: row.recipeCookingTime,
        servings: row.recipeServings,
        imageUrl: row.recipeImageUrl,
        createdAt: row.recipeCreatedAt,
        author: {
          id: row.authorId,
          name: row.authorName,
        },
        allIngredients: [],
        matchedIngredients: [],
        missingIngredients: [],
        totalScore: 0,
        matchedScore: 0,
      });
    }

    const recipe = recipeMap.get(row.recipeId);
    if (row.ingredientId) {
      const isMatched = ingredientIds.includes(row.ingredientId);
      const weight =
        row.ingredientCategory === "meat" ||
        row.ingredientCategory === "seafood" ||
        row.ingredientCategory === "vegetables"
          ? 5
          : 1;

      recipe.allIngredients.push({
        id: row.ingredientId,
        name: row.ingredientName,
        category: row.ingredientCategory,
      });

      recipe.totalScore += weight;

      if (isMatched) {
        recipe.matchedIngredients.push({
          id: row.ingredientId,
          name: row.ingredientName,
          category: row.ingredientCategory,
        });
        recipe.matchedScore += weight;
      } else {
        recipe.missingIngredients.push({
          id: row.ingredientId,
          name: row.ingredientName,
          category: row.ingredientCategory,
        });
      }
    }
  }

  // Convert to array and calculate final scores
  let scoredRecipes = Array.from(recipeMap.values())
    .filter((r) => r.matchedIngredients.length > 0)
    .map((recipe) => {
      const matchCount = recipe.matchedIngredients.length;
      const totalCount = recipe.allIngredients.length;
      const matchPercentage =
        totalCount > 0 ? (matchCount / totalCount) * 100 : 0;
      const weightedPercentage =
        recipe.totalScore > 0
          ? (recipe.matchedScore / recipe.totalScore) * 100
          : 0;

      // Calculate different scores
      const smartScore = (weightedPercentage / 100) * Math.sqrt(matchCount);
      const percentageScore = matchPercentage;
      const countScore = matchCount;

      return {
        ...recipe,
        matchCount,
        totalCount,
        matchPercentage: Math.round(matchPercentage),
        weightedPercentage: Math.round(weightedPercentage),
        smartScore,
        percentageScore,
        countScore,
      };
    });

  // Apply filters
  if (minMatches > 0) {
    scoredRecipes = scoredRecipes.filter((r) => r.matchCount >= minMatches);
  }
  if (minPercentage > 0) {
    scoredRecipes = scoredRecipes.filter(
      (r) => r.matchPercentage >= minPercentage,
    );
  }

  // Sort by selected strategy
  switch (strategy) {
    case "smart":
      scoredRecipes.sort((a, b) => b.smartScore - a.smartScore);
      break;
    case "percentage":
      scoredRecipes.sort(
        (a, b) =>
          b.matchPercentage - a.matchPercentage || b.matchCount - a.matchCount,
      );
      break;
    case "count":
      scoredRecipes.sort(
        (a, b) =>
          b.matchCount - a.matchCount || b.matchPercentage - a.matchPercentage,
      );
      break;
    case "threshold":
      const threshold = minMatches || 3;
      scoredRecipes = scoredRecipes.filter((r) => r.matchCount >= threshold);
      scoredRecipes.sort((a, b) => b.matchPercentage - a.matchPercentage);
      break;
  }

  // Limit results
  scoredRecipes = scoredRecipes.slice(0, limit);

  // Clean up response based on includeDetails flag
  if (!includeDetails) {
    return scoredRecipes.map((r) => ({
      id: r.id,
      title: r.title,
      cookingTime: r.cookingTime,
      servings: r.servings,
      imageUrl: r.imageUrl,
      author: r.author,
      matchCount: r.matchCount,
      totalCount: r.totalCount,
      matchPercentage: r.matchPercentage,
    }));
  }

  return scoredRecipes;
}
