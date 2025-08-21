import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Image cache cho AI detection
export const imageCache = pgTable(
  'image_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hash: text('hash').notNull().unique(), // SHA-256 hash
    filePath: text('file_path').notNull(),
    originalName: text('original_name'),
    mimeType: text('mime_type'),
    size: integer('size'),
    detectedIngredients: jsonb('detected_ingredients'), // AI results
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('image_cache_hash_idx').on(table.hash)],
)
