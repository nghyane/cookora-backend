import type { imageCache } from '@/shared/database/schema/cache'
import type { ingredients } from '@/shared/database/schema/ingredients'
import type { recipes } from '@/shared/database/schema/recipes'
import type { userFavorites, users } from '@/shared/database/schema/users'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

export type User = InferSelectModel<typeof users>
export type InsertUser = InferInsertModel<typeof users>

export type UserFavorite = InferSelectModel<typeof userFavorites>
export type InsertUserFavorite = InferInsertModel<typeof userFavorites>

export type Recipe = InferSelectModel<typeof recipes>
export type InsertRecipe = InferInsertModel<typeof recipes>

export type Ingredient = InferSelectModel<typeof ingredients>
export type InsertIngredient = InferInsertModel<typeof ingredients>

export type ImageCache = InferSelectModel<typeof imageCache>
export type InsertImageCache = InferInsertModel<typeof imageCache>
