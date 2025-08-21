import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

import { authMiddleware } from '@/shared/middleware/auth'
import {
    addPantryItemSchema,
    updatePantryItemSchema,
    pantrySearchQuerySchema,
    idParamSchema,
} from '@/shared/schemas/api/requests'
import { pantryService } from './service'
import { response } from '@/shared/utils/response'

const PANTRY_TAG = 'Pantry'
const pantryRoutes = new Hono()

// Get user's pantry items
pantryRoutes.get(
    '/',
    describeRoute({
        summary: 'Lấy danh sách nguyên liệu trong kho',
        tags: [PANTRY_TAG],
        security: [{ Bearer: [] }],
    }),
    authMiddleware,
    zValidator('query', pantrySearchQuerySchema),
    async (c) => {
        const user = c.get('user')
        const query = c.req.valid('query')
        const result = await pantryService.getPantryItems(user.userId, query)
        return c.json(response.success(result))
    },
)

// Add item to pantry
pantryRoutes.post(
    '/',
    describeRoute({
        summary: 'Thêm nguyên liệu vào kho',
        tags: [PANTRY_TAG],
        security: [{ Bearer: [] }],
    }),
    authMiddleware,
    zValidator('json', addPantryItemSchema),
    async (c) => {
        const user = c.get('user')
        const body = c.req.valid('json')
        const newItem = await pantryService.addItem(user.userId, body)
        return c.json(response.success(newItem), 201)
    },
)

// Add multiple items (batch)
pantryRoutes.post(
    '/batch',
    describeRoute({
        summary: 'Thêm nhiều nguyên liệu vào kho',
        tags: [PANTRY_TAG],
        security: [{ Bearer: [] }],
    }),
    authMiddleware,
    zValidator(
        'json',
        z.object({
            items: z.array(addPantryItemSchema).min(1).max(50),
        }),
    ),
    async (c) => {
        const user = c.get('user')
        const { items } = c.req.valid('json')
        const newItems = await pantryService.addBatch(user.userId, items)
        return c.json(response.success({ items: newItems, count: newItems.length }), 201)
    },
)

// Update pantry item
pantryRoutes.put(
    '/:id',
    describeRoute({
        summary: 'Cập nhật nguyên liệu trong kho',
        tags: [PANTRY_TAG],
        security: [{ Bearer: [] }],
    }),
    authMiddleware,
    zValidator('param', idParamSchema),
    zValidator('json', updatePantryItemSchema),
    async (c) => {
        const user = c.get('user')
        const id = c.req.valid('param').id
        const body = c.req.valid('json')
        const updated = await pantryService.updateItem(user.userId, id, body)
        return c.json(response.success(updated))
    },
)

// Remove item from pantry
pantryRoutes.delete(
    '/:id',
    describeRoute({
        summary: 'Xóa nguyên liệu khỏi kho',
        tags: [PANTRY_TAG],
        security: [{ Bearer: [] }],
    }),
    authMiddleware,
    zValidator('param', idParamSchema),
    async (c) => {
        const user = c.get('user')
        const id = c.req.valid('param').id
        const result = await pantryService.removeItem(user.userId, id)
        return c.json(response.success(result))
    },
)

// Get expiring items
pantryRoutes.get(
    '/expiring',
    describeRoute({
        summary: 'Lấy nguyên liệu sắp hết hạn',
        tags: [PANTRY_TAG],
        security: [{ Bearer: [] }],
    }),
    authMiddleware,
    zValidator(
        'query',
        z.object({
            days: z.coerce.number().int().min(1).max(30).default(7),
        }),
    ),
    async (c) => {
        const user = c.get('user')
        const { days } = c.req.valid('query')
        const items = await pantryService.getExpiringItems(user.userId, days)
        return c.json(response.success(items))
    },
)

// Get pantry statistics
pantryRoutes.get(
    '/stats',
    describeRoute({
        summary: 'Thống kê kho nguyên liệu',
        tags: [PANTRY_TAG],
        security: [{ Bearer: [] }],
    }),
    authMiddleware,
    async (c) => {
        const user = c.get('user')
        const stats = await pantryService.getStats(user.userId)
        return c.json(response.success(stats))
    },
)

// Suggest recipes based on pantry
pantryRoutes.get(
    '/suggest-recipes',
    describeRoute({
        summary: 'Gợi ý món ăn từ nguyên liệu có sẵn',
        tags: [PANTRY_TAG],
        security: [{ Bearer: [] }],
    }),
    authMiddleware,
    zValidator(
        'query',
        z.object({
            limit: z.coerce.number().int().min(1).max(20).default(10),
            cookingTime: z.coerce.number().int().min(1).optional(),
            servings: z.coerce.number().int().min(1).optional(),
        }),
    ),
    async (c) => {
        const user = c.get('user')
        const options = c.req.valid('query')
        const suggestions = await pantryService.suggestRecipes(user.userId, options)
        return c.json(response.success(suggestions))
    },
)

export { pantryRoutes } 