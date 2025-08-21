import { decimal, index, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { ingredients } from './ingredients'
import { users } from './users'

// Bảng recipes - MVP version chỉ giữ thông tin cốt lõi
export const recipes = pgTable(
  'recipes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    servings: integer('servings').default(4).notNull(),
    cookingTime: integer('cooking_time').notNull(), // phút
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('recipes_title_idx').on(table.title),
    index('recipes_created_at_idx').on(table.createdAt),
    index('recipes_author_id_idx').on(table.authorId),
  ],
)

// Bảng recipe_ingredients - Nguyên liệu cần cho mỗi món
export const recipeIngredients = pgTable(
  'recipe_ingredients',
  {
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id, { onDelete: 'restrict' }),
    amount: decimal('amount', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    unit: text('unit').notNull(), // gram, ml, quả, muỗng,...
    notes: text('notes'), // "băm nhuyễn", "cắt lát mỏng"
  },
  (table) => [
    primaryKey({ columns: [table.recipeId, table.ingredientId] }),
  ],
)

// Bảng recipe_instructions - Các bước thực hiện
export const recipeInstructions = pgTable(
  'recipe_instructions',
  {
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    step: integer('step').notNull(), // Thứ tự bước
    description: text('description').notNull(), // Mô tả bước làm
  },
  (table) => [
    primaryKey({ columns: [table.recipeId, table.step] }),
  ],
)
