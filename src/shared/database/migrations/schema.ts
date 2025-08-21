import { pgTable, index, unique, uuid, text, integer, jsonb, timestamp, boolean, foreignKey, numeric, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const userRole = pgEnum("user_role", ['user', 'admin'])


export const imageCache = pgTable("image_cache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	hash: text().notNull(),
	filePath: text("file_path").notNull(),
	originalName: text("original_name"),
	mimeType: text("mime_type"),
	size: integer(),
	detectedIngredients: jsonb("detected_ingredients"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("image_cache_hash_idx").using("btree", table.hash.asc().nullsLast().op("text_ops")),
	unique("image_cache_hash_unique").on(table.hash),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	name: text().notNull(),
	avatarUrl: text("avatar_url"),
	role: userRole().default('user').notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const authProviders = pgTable("auth_providers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	provider: text().notNull(),
	providerId: text("provider_id").notNull(),
	providerData: jsonb("provider_data"),
	passwordHash: text("password_hash"),
	verificationToken: text("verification_token"),
	verificationExpires: timestamp("verification_expires", { mode: 'string' }),
	resetToken: text("reset_token"),
	resetExpires: timestamp("reset_expires", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_auth_providers_provider").using("btree", table.provider.asc().nullsLast().op("text_ops")),
	index("idx_auth_providers_reset_token").using("btree", table.resetToken.asc().nullsLast().op("text_ops")),
	index("idx_auth_providers_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_auth_providers_verification_token").using("btree", table.verificationToken.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "auth_providers_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("unq_auth_providers_provider_id").on(table.provider, table.providerId),
]);

export const pantryItems = pgTable("pantry_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	ingredientId: uuid("ingredient_id").notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).notNull(),
	unit: text().notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	notes: text(),
}, (table) => [
	index("idx_pantry_items_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_pantry_items_ingredient_id").using("btree", table.ingredientId.asc().nullsLast().op("uuid_ops")),
	index("idx_pantry_items_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_pantry_items_user_ingredient").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.ingredientId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "pantry_items_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredients.id],
			name: "pantry_items_ingredient_id_ingredients_id_fk"
		}).onDelete("restrict"),
]);

export const ingredients = pgTable("ingredients", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	category: text(),
	aliases: jsonb().default([]).notNull(),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ingredients_aliases_idx").using("gin", table.aliases.asc().nullsLast().op("jsonb_ops")),
	index("ingredients_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("ingredients_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	unique("ingredients_name_unique").on(table.name),
]);

export const sessions = pgTable("sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_sessions_token").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("idx_sessions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("sessions_token_unique").on(table.token),
]);

export const userFavorites = pgTable("user_favorites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	recipeId: uuid("recipe_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_favorites_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.recipeId],
			foreignColumns: [recipes.id],
			name: "user_favorites_recipe_id_recipes_id_fk"
		}).onDelete("cascade"),
]);

export const recipes = pgTable("recipes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	imageUrl: text("image_url"),
	servings: integer().default(4).notNull(),
	cookingTime: integer("cooking_time").notNull(),
	authorId: uuid("author_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("recipes_author_id_idx").using("btree", table.authorId.asc().nullsLast().op("uuid_ops")),
	index("recipes_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("recipes_title_idx").using("btree", table.title.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "recipes_author_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const recipeInstructions = pgTable("recipe_instructions", {
	recipeId: uuid("recipe_id").notNull(),
	step: integer().notNull(),
	description: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.recipeId],
			foreignColumns: [recipes.id],
			name: "recipe_instructions_recipe_id_recipes_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.recipeId, table.step], name: "recipe_instructions_recipe_id_step_pk"}),
]);

export const recipeIngredients = pgTable("recipe_ingredients", {
	recipeId: uuid("recipe_id").notNull(),
	ingredientId: uuid("ingredient_id").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	unit: text().notNull(),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.recipeId],
			foreignColumns: [recipes.id],
			name: "recipe_ingredients_recipe_id_recipes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ingredientId],
			foreignColumns: [ingredients.id],
			name: "recipe_ingredients_ingredient_id_ingredients_id_fk"
		}).onDelete("restrict"),
	primaryKey({ columns: [table.recipeId, table.ingredientId], name: "recipe_ingredients_recipe_id_ingredient_id_pk"}),
]);
