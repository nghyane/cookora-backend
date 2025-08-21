import type { imageCache } from '@/shared/database/schema/cache'
import type { ingredients } from '@/shared/database/schema/ingredients'
import type { recipes, recipeIngredients, recipeInstructions } from '@/shared/database/schema/recipes'
import type { users, userFavorites, authProviders, sessions, pantryItems, userRoleEnum } from '@/shared/database/schema/users'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

// User role type
export type UserRole = (typeof userRoleEnum.enumValues)[number]

// User types
export type User = InferSelectModel<typeof users>
export type InsertUser = InferInsertModel<typeof users>

// Auth provider types
export type AuthProvider = InferSelectModel<typeof authProviders>
export type InsertAuthProvider = InferInsertModel<typeof authProviders>

// Session types
export type Session = InferSelectModel<typeof sessions>
export type InsertSession = InferInsertModel<typeof sessions>

// User favorites types
export type UserFavorite = InferSelectModel<typeof userFavorites>
export type InsertUserFavorite = InferInsertModel<typeof userFavorites>

// Pantry items types
export type PantryItem = InferSelectModel<typeof pantryItems>
export type InsertPantryItem = InferInsertModel<typeof pantryItems>

// Recipe types
export type Recipe = InferSelectModel<typeof recipes>
export type InsertRecipe = InferInsertModel<typeof recipes>

// Recipe ingredients types
export type RecipeIngredient = InferSelectModel<typeof recipeIngredients>
export type InsertRecipeIngredient = InferInsertModel<typeof recipeIngredients>

// Recipe instructions types
export type RecipeInstruction = InferSelectModel<typeof recipeInstructions>
export type InsertRecipeInstruction = InferInsertModel<typeof recipeInstructions>

// Ingredient types
export type Ingredient = InferSelectModel<typeof ingredients>
export type InsertIngredient = InferInsertModel<typeof ingredients>

// Image cache types
export type ImageCache = InferSelectModel<typeof imageCache>
export type InsertImageCache = InferInsertModel<typeof imageCache> 