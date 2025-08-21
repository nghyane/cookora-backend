import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { zValidator } from '@hono/zod-validator'


import { authMiddleware } from '@/shared/middleware/auth'

import {
  createRecipeRequestSchema,
  idParamSchema,
  recipeSearchQuerySchema,
  updateRecipeRequestSchema,
  addRecipeIngredientsSchema,
  addRecipeInstructionsSchema,
  findByIngredientsSchema,
} from '@/shared/schemas/api/requests'
import { recipesService } from './service'
import { response } from '@/shared/utils/response'

const RECIPES_TAG = 'Recipes'
const recipesRoutes = new Hono()

// Public routes
recipesRoutes.get(
  '/',
  describeRoute({
    summary: 'Lấy danh sách công thức',
    tags: [RECIPES_TAG],
  }),
  zValidator('query', recipeSearchQuerySchema),
  async (c) => {
    const query = c.req.valid('query')
    const result = await recipesService.getAll(query)
    return c.json(response.success(result))
  },
)

recipesRoutes.get(
  '/:id',
  describeRoute({
    summary: 'Lấy thông tin công thức',
    tags: [RECIPES_TAG],
  }),
  zValidator('param', idParamSchema),
  async (c) => {
    const id = c.req.valid('param').id
    const recipe = await recipesService.getById(id)
    return c.json(response.success(recipe))
  },
)

// Find recipes by ingredients
recipesRoutes.post(
  '/find-by-ingredients',
  describeRoute({
    summary: 'Tìm công thức theo nguyên liệu',
    tags: [RECIPES_TAG],
  }),
  zValidator('json', findByIngredientsSchema),
  async (c) => {
    const body = c.req.valid('json')
    const { ingredientIds, matchType, limit } = body
    const recipes = await recipesService.findByIngredients(ingredientIds, matchType, limit)
    return c.json(response.success({
      recipes,
      matchType,
      ingredientCount: ingredientIds.length
    }))
  },
)

// Protected routes (auth required)
recipesRoutes.post(
  '/',
  describeRoute({
    summary: 'Tạo công thức mới',
    tags: [RECIPES_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator('json', createRecipeRequestSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    const newRecipe = await recipesService.create(user.userId, body)
    return c.json(response.success(newRecipe), 201)
  },
)

recipesRoutes.put(
  '/:id',
  describeRoute({
    summary: 'Cập nhật công thức',
    tags: [RECIPES_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator('param', idParamSchema),
  zValidator('json', updateRecipeRequestSchema),
  async (c) => {
    const user = c.get('user')
    const id = c.req.valid('param').id
    const body = c.req.valid('json')
    const updatedRecipe = await recipesService.update(user.userId, id, body)
    return c.json(response.success(updatedRecipe))
  },
)

recipesRoutes.delete(
  '/:id',
  describeRoute({
    summary: 'Xóa công thức',
    tags: [RECIPES_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator('param', idParamSchema),
  async (c) => {
    const user = c.get('user')
    const id = c.req.valid('param').id
    const result = await recipesService.delete(user.userId, id)
    return c.json(response.success(result))
  },
)

// Recipe ingredients management
recipesRoutes.put(
  '/:id/ingredients',
  describeRoute({
    summary: 'Cập nhật nguyên liệu cho công thức',
    tags: [RECIPES_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator('param', idParamSchema),
  zValidator('json', addRecipeIngredientsSchema),
  async (c) => {
    const user = c.get('user')
    const id = c.req.valid('param').id
    const body = c.req.valid('json')
    const result = await recipesService.addIngredients(
      user.userId,
      id,
      body.ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        amount: i.amount,
        unit: i.unit,
        notes: i.notes,
      })),
    )
    return c.json(response.success(result))
  },
)

// Recipe instructions management
recipesRoutes.put(
  '/:id/instructions',
  describeRoute({
    summary: 'Cập nhật các bước thực hiện cho công thức',
    tags: [RECIPES_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator('param', idParamSchema),
  zValidator('json', addRecipeInstructionsSchema),
  async (c) => {
    const user = c.get('user')
    const id = c.req.valid('param').id
    const body = c.req.valid('json')
    const result = await recipesService.addInstructions(
      user.userId,
      id,
      body.instructions.map((ins) => ({
        step: ins.step,
        description: ins.description,
      })),
    )
    return c.json(response.success(result))
  },
)

export { recipesRoutes }
