import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";

import { authMiddleware } from "@/shared/middleware/auth";
import { db } from "@/shared/database/connection";
import {
  recipes,
  recipeIngredients,
  recipeInstructions,
} from "@/shared/database/schema";

import {
  createRecipeRequestSchema,
  createRecipeCompleteSchema,
  recipeSearchQuerySchema,
  updateRecipeRequestSchema,
  addRecipeIngredientsSchema,
  addRecipeInstructionsSchema,
  findByIngredientsSchema,
} from "@/shared/schemas/api/recipe.schemas";
import { idParamSchema } from "@/shared/schemas/api/common.schemas";
import {
  getAllRecipes,
  getRecipeById,
  findRecipesByIngredients,
} from "./recipes.queries";
import { createRecipe, updateRecipe, deleteRecipe } from "./recipes.operations";
import { addRecipeIngredients, addRecipeInstructions } from "./recipes.content";
import { response } from "@/shared/utils/response";

const RECIPES_TAG = "Recipes";
const recipesRoutes = new Hono();

// Public routes
recipesRoutes.get(
  "/",
  describeRoute({
    summary: "Lấy danh sách công thức",
    tags: [RECIPES_TAG],
  }),
  zValidator("query", recipeSearchQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const result = await getAllRecipes(query);
    return c.json(response.success(result));
  },
);

recipesRoutes.get(
  "/:id",
  describeRoute({
    summary: "Lấy thông tin công thức",
    tags: [RECIPES_TAG],
  }),
  zValidator("param", idParamSchema),
  async (c) => {
    try {
      const id = c.req.valid("param").id;
      const recipe = await getRecipeById(id);
      return c.json(response.success(recipe));
    } catch (error) {
      // Re-throw NotFoundError as-is
      if (error.name === "NotFoundError") {
        throw error;
      }
      // Log other errors for debugging
      console.error("Error fetching recipe:", error);
      throw error;
    }
  },
);

// Find recipes by ingredients
recipesRoutes.post(
  "/find-by-ingredients",
  describeRoute({
    summary: "Tìm công thức theo nguyên liệu",
    tags: [RECIPES_TAG],
  }),
  zValidator("json", findByIngredientsSchema),
  async (c) => {
    const body = c.req.valid("json");
    const {
      ingredientIds,
      strategy,
      minMatches,
      minPercentage,
      limit,
      includeDetails,
    } = body;
    const recipes = await findRecipesByIngredients(ingredientIds, {
      strategy,
      minMatches,
      minPercentage,
      limit,
      includeDetails,
    });
    return c.json(
      response.success({
        recipes,
        strategy: strategy || "smart",
        ingredientCount: ingredientIds.length,
        resultCount: recipes.length,
      }),
    );
  },
);

// Protected routes (auth required)
recipesRoutes.post(
  "/",
  describeRoute({
    summary: "Tạo công thức mới",
    tags: [RECIPES_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("json", createRecipeRequestSchema),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const newRecipe = await createRecipe(user.userId, body);
    return c.json(response.success(newRecipe), 201);
  },
);

// Create complete recipe with ingredients and instructions (atomic transaction)
recipesRoutes.post(
  "/complete",
  describeRoute({
    summary: "Tạo công thức đầy đủ",
    tags: [RECIPES_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("json", createRecipeCompleteSchema),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    // Create everything in one atomic transaction
    const newRecipe = await db.transaction(async (tx) => {
      // 1. Create the base recipe
      const [recipe] = await tx
        .insert(recipes)
        .values({
          title: body.title,
          description: body.description,
          imageUrl: body.imageUrl,
          servings: body.servings,
          cookingTime: body.cookingTime,
          authorId: user.userId,
        })
        .returning();

      // 2. Add ingredients if provided
      if (body.ingredients && body.ingredients.length > 0) {
        const ingredientsToInsert = body.ingredients.map((ingredient) => ({
          recipeId: recipe.id,
          ingredientId: ingredient.ingredientId,
          amount: ingredient.amount,
          unit: ingredient.unit,
          notes: ingredient.notes,
        }));

        await tx.insert(recipeIngredients).values(ingredientsToInsert);
      }

      // 3. Add instructions if provided
      if (body.instructions && body.instructions.length > 0) {
        const instructionsToInsert = body.instructions.map(
          (instruction, index) => ({
            recipeId: recipe.id,
            step: instruction.step ?? index + 1,
            description: instruction.description,
          }),
        );

        await tx.insert(recipeInstructions).values(instructionsToInsert);
      }

      return recipe;
    });

    // Get the complete recipe with all relations
    const completeRecipe = await getRecipeById(newRecipe.id);

    return c.json(
      response.success(
        completeRecipe,
        "Công thức đã được tạo thành công với đầy đủ thông tin",
      ),
      201,
    );
  },
);

recipesRoutes.put(
  "/:id",
  describeRoute({
    summary: "Cập nhật công thức",
    tags: [RECIPES_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", idParamSchema),
  zValidator("json", updateRecipeRequestSchema),
  async (c) => {
    const user = c.get("user");
    const id = c.req.valid("param").id;
    const body = c.req.valid("json");
    const updatedRecipe = await updateRecipe(user.userId, id, body);
    return c.json(response.success(updatedRecipe));
  },
);

recipesRoutes.delete(
  "/:id",
  describeRoute({
    summary: "Xóa công thức",
    tags: [RECIPES_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", idParamSchema),
  async (c) => {
    const user = c.get("user");
    const id = c.req.valid("param").id;
    const result = await deleteRecipe(user.userId, id);
    return c.json(response.success(result));
  },
);

// Recipe ingredients management
recipesRoutes.put(
  "/:id/ingredients",
  describeRoute({
    summary: "Cập nhật nguyên liệu cho công thức",
    tags: [RECIPES_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", idParamSchema),
  zValidator("json", addRecipeIngredientsSchema),
  async (c) => {
    const user = c.get("user");
    const id = c.req.valid("param").id;
    const body = c.req.valid("json");
    const result = await addRecipeIngredients(
      user.userId,
      id,
      body.ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        amount: i.amount,
        unit: i.unit,
        notes: i.notes,
      })),
    );
    return c.json(response.success(result));
  },
);

// Recipe instructions management
recipesRoutes.put(
  "/:id/instructions",
  describeRoute({
    summary: "Cập nhật các bước thực hiện cho công thức",
    tags: [RECIPES_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", idParamSchema),
  zValidator("json", addRecipeInstructionsSchema),
  async (c) => {
    const user = c.get("user");
    const id = c.req.valid("param").id;
    const body = c.req.valid("json");
    const result = await addRecipeInstructions(
      user.userId,
      id,
      body.instructions.map((ins) => ({
        step: ins.step,
        description: ins.description,
      })),
    );
    return c.json(response.success(result));
  },
);

export { recipesRoutes };
