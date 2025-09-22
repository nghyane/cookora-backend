import { z } from "zod";
import "zod-openapi";
import { pantryItemSchema } from "@/shared/schemas/refined/vietnamese-culinary";

/**
 * Pantry Domain Schemas - Pantry related validations
 * Handles: pantry CRUD, search, filtering
 */

// Add item to pantry (current pantry only)
export const addPantryItemSchema = pantryItemSchema.omit({
  id: true,
  userId: true,
  addedAt: true,
  addedBy: true, // Server sets this automatically
});

// Update pantry item
export const updatePantryItemSchema = z.object({
  quantity: z.number().positive("Số lượng phải lớn hơn 0").optional(),
  unit: z.string().min(1, "Đơn vị không được để trống").optional(),
  expiresAt: z.date().optional(),
  notes: z.string().optional(),
});

// Pantry search query
export const pantrySearchQuerySchema = z.object({
  ingredientId: z
    .uuid()
    .optional()
    .meta({ example: "b3f1f1f1-1234-5678-9abc-def012345678" }),
  expiringBefore: z.coerce.date().optional().meta({ example: "2025-12-31" }),
  page: z.coerce.number().int().min(1).default(1).meta({ example: 1 }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .meta({ example: 20 }),
});

// Export types
export type AddPantryItem = z.infer<typeof addPantryItemSchema>;
export type UpdatePantryItem = z.infer<typeof updatePantryItemSchema>;
export type PantrySearchQuery = z.infer<typeof pantrySearchQuerySchema>;
