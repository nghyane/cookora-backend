import { relations } from 'drizzle-orm'
import { users, authProviders, sessions, userFavorites, pantryItems } from './users'
import { recipes, recipeIngredients, recipeInstructions } from './recipes'
import { ingredients } from './ingredients'

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  authProviders: many(authProviders),
  sessions: many(sessions),
  favorites: many(userFavorites),
  pantryItems: many(pantryItems),
}))

// Auth provider relations
export const authProvidersRelations = relations(authProviders, ({ one }) => ({
  user: one(users, {
    fields: [authProviders.userId],
    references: [users.id],
  }),
}))

// Session relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

// User favorites relations
export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
  recipe: one(recipes, {
    fields: [userFavorites.recipeId],
    references: [recipes.id],
  }),
}))

// Pantry items relations
export const pantryItemsRelations = relations(pantryItems, ({ one }) => ({
  user: one(users, {
    fields: [pantryItems.userId],
    references: [users.id],
  }),
  ingredient: one(ingredients, {
    fields: [pantryItems.ingredientId],
    references: [ingredients.id],
  }),
}))

// Recipe relations
export const recipesRelations = relations(recipes, ({ many }) => ({
  favoritedBy: many(userFavorites),
  ingredients: many(recipeIngredients),
  instructions: many(recipeInstructions),
}))

// Recipe ingredients relations
export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
  ingredient: one(ingredients, {
    fields: [recipeIngredients.ingredientId],
    references: [ingredients.id],
  }),
}))

// Recipe instructions relations
export const recipeInstructionsRelations = relations(recipeInstructions, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeInstructions.recipeId],
    references: [recipes.id],
  }),
}))

// Ingredient relations
export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  usedInRecipes: many(recipeIngredients),
  inPantries: many(pantryItems),
}))
