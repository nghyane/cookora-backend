import { relations } from "drizzle-orm/relations";
import { users, authProviders, pantryItems, ingredients, sessions, userFavorites, recipes, recipeInstructions, recipeIngredients } from "./schema";

export const authProvidersRelations = relations(authProviders, ({one}) => ({
	user: one(users, {
		fields: [authProviders.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	authProviders: many(authProviders),
	pantryItems: many(pantryItems),
	sessions: many(sessions),
	userFavorites: many(userFavorites),
	recipes: many(recipes),
}));

export const pantryItemsRelations = relations(pantryItems, ({one}) => ({
	user: one(users, {
		fields: [pantryItems.userId],
		references: [users.id]
	}),
	ingredient: one(ingredients, {
		fields: [pantryItems.ingredientId],
		references: [ingredients.id]
	}),
}));

export const ingredientsRelations = relations(ingredients, ({many}) => ({
	pantryItems: many(pantryItems),
	recipeIngredients: many(recipeIngredients),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const userFavoritesRelations = relations(userFavorites, ({one}) => ({
	user: one(users, {
		fields: [userFavorites.userId],
		references: [users.id]
	}),
	recipe: one(recipes, {
		fields: [userFavorites.recipeId],
		references: [recipes.id]
	}),
}));

export const recipesRelations = relations(recipes, ({one, many}) => ({
	userFavorites: many(userFavorites),
	user: one(users, {
		fields: [recipes.authorId],
		references: [users.id]
	}),
	recipeInstructions: many(recipeInstructions),
	recipeIngredients: many(recipeIngredients),
}));

export const recipeInstructionsRelations = relations(recipeInstructions, ({one}) => ({
	recipe: one(recipes, {
		fields: [recipeInstructions.recipeId],
		references: [recipes.id]
	}),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({one}) => ({
	recipe: one(recipes, {
		fields: [recipeIngredients.recipeId],
		references: [recipes.id]
	}),
	ingredient: one(ingredients, {
		fields: [recipeIngredients.ingredientId],
		references: [ingredients.id]
	}),
}));