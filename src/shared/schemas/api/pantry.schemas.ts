import { z } from 'zod'
import { pantryItemSchema } from '@/shared/schemas/refined/vietnamese-culinary'

/**
 * Pantry Domain Schemas - Pantry related validations
 * Handles: pantry CRUD, search, filtering
 */

// Add item to pantry
export const addPantryItemSchema = pantryItemSchema.omit({
    id: true,
    userId: true,
    addedAt: true,
})

// Update pantry item
export const updatePantryItemSchema = z.object({
    quantity: z.number().positive('Số lượng phải lớn hơn 0').optional(),
    unit: z.string().min(1, 'Đơn vị không được để trống').optional(),
    expiresAt: z.date().optional(),
    notes: z.string().optional(),
})

// Pantry search query
export const pantrySearchQuerySchema = z.object({
    ingredientId: z.string().uuid().optional(),
    expiringBefore: z.coerce.date().optional(), // Tìm nguyên liệu sắp hết hạn
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Export types
export type AddPantryItem = z.infer<typeof addPantryItemSchema>
export type UpdatePantryItem = z.infer<typeof updatePantryItemSchema>
export type PantrySearchQuery = z.infer<typeof pantrySearchQuerySchema>
