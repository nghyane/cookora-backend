import { z } from "zod";
import { INGREDIENT_CATEGORIES } from "@/shared/constants/vietnamese-culinary";

/**
 * MVP INGREDIENT SCHEMA - Tinh gọn cho giai đoạn đầu
 */
export const vietnameseIngredientBaseSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, "Tên nguyên liệu không được để trống"),
  category: z.enum(INGREDIENT_CATEGORIES).optional(), // Sync với DB categories
  aliases: z.array(z.string()).default([]), // Các tên gọi khác để tìm kiếm
  imageUrl: z.string().url().optional(),
  createdAt: z.date(),
});

// Refined schema (giữ nguyên cho tương lai mở rộng)
export const vietnameseIngredientSchema = vietnameseIngredientBaseSchema;

/**
 * MVP RECIPE SCHEMA - Chỉ giữ thông tin cốt lõi
 */
export const vietnameseRecipeBaseSchema = z.object({
  id: z.uuid(),
  title: z.string().min(3, "Tên món ăn phải có ít nhất 3 ký tự"),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  servings: z.number().int().min(1).max(20).default(4),
  cookingTime: z.number().int().min(1, "Thời gian nấu phải ít nhất 1 phút"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Refined schema
export const vietnameseRecipeSchema = vietnameseRecipeBaseSchema;

/**
 * RECIPE INGREDIENT SCHEMA - Nguyên liệu trong công thức
 */
export const recipeIngredientSchema = z.object({
  recipeId: z.uuid(),
  ingredientId: z.uuid(),
  amount: z.number().positive("Số lượng phải lớn hơn 0"),
  unit: z.string().min(1, "Đơn vị không được để trống"), // gram, ml, quả, muỗng,...
  notes: z.string().optional(), // "băm nhuyễn", "cắt lát mỏng"
});

/**
 * RECIPE INSTRUCTION SCHEMA - Các bước thực hiện
 */
export const recipeInstructionSchema = z.object({
  recipeId: z.uuid(),
  step: z.number().int().positive("Thứ tự bước phải lớn hơn 0"),
  description: z.string().min(10, "Mô tả bước làm phải có ít nhất 10 ký tự"),
});

/**
 * PANTRY ITEM SCHEMA - Kho nguyên liệu của người dùng
 */
export const pantryItemSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  ingredientId: z.uuid(),
  quantity: z.number().positive("Số lượng phải lớn hơn 0"),
  unit: z.string().min(1, "Đơn vị không được để trống"),
  addedAt: z.date(),
  expiresAt: z.date().optional(),
  notes: z.string().optional(),
  addedBy: z.uuid().optional(), // Who actually added this item (for shared pantries)
});

/**
 * RECIPE SEARCH SCHEMA - Đơn giản hoá cho MVP
 */
export const vietnameseRecipeSearchSchema = z.object({
  query: z.string().optional(),
  ingredients: z.array(z.string()).optional(), // Tìm món ăn có chứa những nguyên liệu này
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // Sorting
  sortBy: z
    .enum(["created_at", "updated_at", "cooking_time", "title"] as const)
    .default("created_at"),
  sortOrder: z.enum(["asc", "desc"] as const).default("desc"),
});

/**
 * INGREDIENT SEARCH SCHEMA - Đơn giản hoá cho MVP
 */
export const ingredientSearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Export types
export type VietnameseIngredientBase = z.infer<
  typeof vietnameseIngredientBaseSchema
>;
export type VietnameseIngredient = z.infer<typeof vietnameseIngredientSchema>;
export type VietnameseRecipeBase = z.infer<typeof vietnameseRecipeBaseSchema>;
export type VietnameseRecipe = z.infer<typeof vietnameseRecipeSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type RecipeInstruction = z.infer<typeof recipeInstructionSchema>;
export type PantryItem = z.infer<typeof pantryItemSchema>;
export type VietnameseRecipeSearch = z.infer<
  typeof vietnameseRecipeSearchSchema
>;
export type IngredientSearch = z.infer<typeof ingredientSearchSchema>;
