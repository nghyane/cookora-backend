import { sql } from 'drizzle-orm'
import { index, jsonb, pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core'

// Bảng ingredients - MVP version tập trung vào core features
export const ingredients = pgTable(
  'ingredients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(), // Tên chính (tiếng Việt)
    category: text('category'), // protein, vegetable, spice, etc.
    // Mảng các tên gọi khác để tìm kiếm linh hoạt
    // Ví dụ: ["green onion", "scallion", "hành hoa", "hành lá"]
    aliases: jsonb('aliases').default(sql`'[]'::jsonb`).notNull(),
    imageUrl: text('image_url'), // Ảnh hiển thị cho trực quan
    // Số ngày sử dụng gợi ý (tính từ lúc mua/thêm vào)
    // Ví dụ: 3 (ngày) cho thịt tươi, 7 cho sữa
    typicalShelfLifeDays: integer('typical_shelf_life_days'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('ingredients_name_idx').on(table.name),
    index('ingredients_category_idx').on(table.category),
    index('ingredients_aliases_idx').using('gin', table.aliases), // GIN index cho tìm kiếm trong JSON
  ],
)
