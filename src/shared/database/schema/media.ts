import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Media category enum - for organizing files in R2 buckets
export const mediaCategoryEnum = pgEnum("media_category", [
  "avatar", // User profile pictures
  "recipe", // Recipe images
  "ingredient", // Ingredient images
  "community", // Community post images
  "news", // News article images
  "tutorial", // Cooking tutorial images
]);

// Media type enum
export const mediaTypeEnum = pgEnum("media_type", [
  "image",
  "video",
  "document",
]);

// Media table - centralized storage for all uploaded files
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // URLs and storage
    url: text("url").notNull(), // Public CDN URL
    key: text("key").notNull().unique(), // R2 object key (path in bucket)

    // Categorization
    category: mediaCategoryEnum("category").notNull(),
    type: mediaTypeEnum("type").notNull(),

    // File metadata
    size: integer("size").notNull(), // File size in bytes
    mimeType: text("mime_type"), // e.g., 'image/jpeg', 'video/mp4'

    // Ownership
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("media_category_idx").on(table.category),
    index("media_user_id_idx").on(table.userId),
    index("media_created_at_idx").on(table.createdAt),
    index("media_key_idx").on(table.key),
  ],
);
