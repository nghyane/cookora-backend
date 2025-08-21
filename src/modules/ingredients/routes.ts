import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { zValidator } from '@hono/zod-validator'

import { authMiddleware } from '@/shared/middleware/auth'
import { adminMiddleware } from '@/shared/middleware/admin'
import {
  createIngredientRequestSchema,
  idParamSchema,
  ingredientSearchQuerySchema,
  ingredientSuggestionQuerySchema,
} from '@/shared/schemas/api/requests'
import { ingredientsService } from './service'
import { response } from '@/shared/utils/response'

const INGREDIENTS_TAG = 'Ingredients'
const ingredientsRoutes = new Hono()

// Public routes - specific routes FIRST to avoid fallback
ingredientsRoutes.get(
  '/',
  describeRoute({
    summary: 'Lấy danh sách nguyên liệu với tìm kiếm',
    tags: [INGREDIENTS_TAG],
    description: 'Hỗ trợ tìm kiếm theo tên, aliases và lọc theo category. Categories có sẵn trong response data.',
  }),
  zValidator('query', ingredientSearchQuerySchema),
  async (c) => {
    const query = c.req.valid('query')
    const result = await ingredientsService.getAll(query)
    return c.json(response.success(result))
  },
)

ingredientsRoutes.get(
  '/suggestions',
  describeRoute({
    summary: 'Gợi ý nguyên liệu theo từ khóa',
    tags: [INGREDIENTS_TAG],
  }),
  zValidator('query', ingredientSuggestionQuerySchema),
  async (c) => {
    const params = c.req.valid('query')
    const query = params.q || ''
    const limit = params.limit ?? 10
    const suggestions = await ingredientsService.getSuggestions(query, limit)
    return c.json(response.success(suggestions))
  },
)

// Generic /:id route LAST to catch only actual UUIDs
ingredientsRoutes.get(
  '/:id',
  describeRoute({
    summary: 'Lấy thông tin nguyên liệu theo ID',
    tags: [INGREDIENTS_TAG],
  }),
  zValidator('param', idParamSchema),
  async (c) => {
    const id = c.req.valid('param').id
    const ingredient = await ingredientsService.getById(id)
    return c.json(response.success(ingredient))
  },
)

// Admin-only CRUD operations (supports API key or JWT)
ingredientsRoutes.post(
  '/',
  describeRoute({
    summary: 'Tạo nguyên liệu mới',
    tags: [INGREDIENTS_TAG],
    security: [{ Bearer: [] }, { ApiKey: [] }],
  }),
  authMiddleware,
  adminMiddleware,
  zValidator('json', createIngredientRequestSchema),
  async (c) => {
    const body = c.req.valid('json')
    const ingredient = await ingredientsService.create(body)
    return c.json(response.success(ingredient), 201)
  },
)

ingredientsRoutes.put(
  '/:id',
  describeRoute({
    summary: 'Cập nhật nguyên liệu',
    tags: [INGREDIENTS_TAG],
    security: [{ Bearer: [] }, { ApiKey: [] }],
  }),
  authMiddleware,
  adminMiddleware,
  zValidator('param', idParamSchema),
  zValidator('json', createIngredientRequestSchema.partial()),
  async (c) => {
    const id = c.req.valid('param').id
    const body = c.req.valid('json')
    const ingredient = await ingredientsService.update(id, body)
    return c.json(response.success(ingredient))
  },
)

ingredientsRoutes.delete(
  '/:id',
  describeRoute({
    summary: 'Xóa nguyên liệu',
    tags: [INGREDIENTS_TAG],
    security: [{ Bearer: [] }, { ApiKey: [] }],
  }),
  authMiddleware,
  adminMiddleware,
  zValidator('param', idParamSchema),
  async (c) => {
    const id = c.req.valid('param').id
    const result = await ingredientsService.delete(id)
    return c.json(response.success(result))
  },
)

export { ingredientsRoutes }
