import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { recipes } from "./recipes";
import { ingredients } from "./ingredients";

// User role enum
export const userRoleEnum = pgEnum("user_role", ["user", "staff", "admin"]);

// Users table - Core user information
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").default("user").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  pantryInviteCode: text("pantry_invite_code").unique(),
  primaryPantryOwnerId: uuid("primary_pantry_owner_id").references(
    () => users.id,
    {
      onDelete: "set null",
    },
  ), // NULL = own pantry, UUID = following someone else's pantry
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Auth providers table - Flexible authentication methods
export const authProviders = pgTable(
  "auth_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'google', 'email', 'facebook', 'apple'
    providerId: text("provider_id").notNull(), // google_id, email, facebook_id, etc.
    providerData: jsonb("provider_data"), // Extra data from provider

    // For email provider only
    passwordHash: text("password_hash"),
    verificationToken: text("verification_token"),
    verificationExpires: timestamp("verification_expires"),
    resetToken: text("reset_token"),
    resetExpires: timestamp("reset_expires"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_auth_providers_user_id").on(table.userId),
    index("idx_auth_providers_provider").on(table.provider),
    index("idx_auth_providers_verification_token").on(table.verificationToken),
    index("idx_auth_providers_reset_token").on(table.resetToken),
    // Ensure one provider_id per provider (e.g., one Google account can't be used by multiple users)
    unique("unq_auth_providers_provider_id").on(
      table.provider,
      table.providerId,
    ),
  ],
);

// Sessions table - JWT session management
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_token").on(table.token),
  ],
);

// User favorites - Keep existing functionality
export const userFavorites = pgTable("user_favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pantry followers - Track who follows whose pantry
export const pantryFollowers = pgTable(
  "pantry_followers",
  {
    pantryOwnerId: uuid("pantry_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followedAt: timestamp("followed_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_pantry_followers_owner").on(table.pantryOwnerId),
    index("idx_pantry_followers_follower").on(table.followerId),
    unique("unq_pantry_followers").on(table.pantryOwnerId, table.followerId),
  ],
);

// Pantry items - Quản lý kho nguyên liệu của người dùng (MVP Thông Minh)
export const pantryItems = pgTable(
  "pantry_items",
  {
    id: uuid("id").primaryKey().defaultRandom(), // ID duy nhất cho mỗi lô hàng
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "restrict" }),
    quantity: decimal("quantity", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    unit: text("unit").notNull(), // gram, ml, quả, lít,...
    addedBy: uuid("added_by").references(() => users.id, {
      onDelete: "set null",
    }), // Who added this item (for shared pantries)
    addedAt: timestamp("added_at").defaultNow().notNull(), // Ngày thêm vào kho
    expiresAt: timestamp("expires_at"), // Ngày hết hạn (optional)
    notes: text("notes"), // Ghi chú thêm nếu cần
  },
  (table) => [
    index("idx_pantry_items_user_id").on(table.userId),
    index("idx_pantry_items_added_by").on(table.addedBy),
    index("idx_pantry_items_ingredient_id").on(table.ingredientId),
    index("idx_pantry_items_expires_at").on(table.expiresAt),
    // Index composite để query nhanh các item của user theo ingredient
    index("idx_pantry_items_user_ingredient").on(
      table.userId,
      table.ingredientId,
    ),
  ],
);
