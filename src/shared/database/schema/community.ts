import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, unique } from 'drizzle-orm/pg-core'
import { users } from './users'

// Post status enum
export const postStatusEnum = pgEnum('post_status', ['draft', 'pending', 'published', 'rejected', 'archived'])

// Comment status enum
export const commentStatusEnum = pgEnum('comment_status', ['pending', 'approved', 'rejected', 'spam'])

// Post categories table - Chuyên mục tạp chí
export const postCategories = pgTable(
  'post_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(), // review, trends, stories
    description: text('description'),
    parentId: uuid('parent_id'), // For nested categories
    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('post_categories_slug_idx').on(table.slug),
    index('post_categories_parent_id_idx').on(table.parentId),
  ],
)

// Posts table - Bài viết tạp chí & cộng đồng
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    slug: text('slug').unique(), // SEO-friendly URL
    content: text('content'), // Rich text content
    excerpt: text('excerpt'), // Short description
    imageUrl: text('image_url'), // Featured image
    status: postStatusEnum('status').default('draft').notNull(),
    categoryId: uuid('category_id').references(() => postCategories.id, { onDelete: 'set null' }),
    tags: jsonb('tags').default([]).notNull(), // Array of tags
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Statistics (denormalized for performance)
    viewsCount: integer('views_count').default(0).notNull(),
    likesCount: integer('likes_count').default(0).notNull(),
    commentsCount: integer('comments_count').default(0).notNull(),
    sharesCount: integer('shares_count').default(0).notNull(),

    // Editorial features
    isFeatured: boolean('is_featured').default(false).notNull(), // Hiển thị nổi bật
    isEditorPick: boolean('is_editor_pick').default(false).notNull(), // BTV chọn
    featuredOrder: integer('featured_order'), // Thứ tự hiển thị khi featured

    // SEO & Meta
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    metaKeywords: jsonb('meta_keywords').default([]),

    // Timestamps
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('posts_status_idx').on(table.status),
    index('posts_category_id_idx').on(table.categoryId),
    index('posts_author_id_idx').on(table.authorId),
    index('posts_is_featured_idx').on(table.isFeatured),
    index('posts_is_editor_pick_idx').on(table.isEditorPick),
    index('posts_published_at_idx').on(table.publishedAt),
    index('posts_created_at_idx').on(table.createdAt),
    index('posts_slug_idx').on(table.slug),
    // GIN index for full-text search on tags
    index('posts_tags_idx').using('gin', table.tags),
  ],
)

// Comments table - Bình luận với hệ thống phân cấp
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'), // For nested comments (replies)
    content: text('content').notNull(),
    status: commentStatusEnum('status').default('pending').notNull(),

    // Moderation
    isEdited: boolean('is_edited').default(false).notNull(),
    editedAt: timestamp('edited_at'),
    moderatedBy: uuid('moderated_by').references(() => users.id, { onDelete: 'set null' }),
    moderatedAt: timestamp('moderated_at'),
    moderationNote: text('moderation_note'), // Lý do từ chối nếu có

    // Statistics
    likesCount: integer('likes_count').default(0).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('comments_post_id_idx').on(table.postId),
    index('comments_user_id_idx').on(table.userId),
    index('comments_parent_id_idx').on(table.parentId),
    index('comments_status_idx').on(table.status),
    index('comments_created_at_idx').on(table.createdAt),
  ],
)

// Post likes table - Lượt thích bài viết
export const postLikes = pgTable(
  'post_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Ensure one like per user per post
    unique('post_likes_post_user_unique').on(table.postId, table.userId),
    index('post_likes_post_id_idx').on(table.postId),
    index('post_likes_user_id_idx').on(table.userId),
  ],
)

// Comment likes table - Lượt thích bình luận
export const commentLikes = pgTable(
  'comment_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('comment_likes_comment_user_unique').on(table.commentId, table.userId),
    index('comment_likes_comment_id_idx').on(table.commentId),
    index('comment_likes_user_id_idx').on(table.userId),
  ],
)

// User follows table - Theo dõi người dùng (social network)
export const userFollows = pgTable(
  'user_follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Ensure one follow relationship per pair
    unique('user_follows_follower_following_unique').on(table.followerId, table.followingId),
    index('user_follows_follower_id_idx').on(table.followerId),
    index('user_follows_following_id_idx').on(table.followingId),
  ],
)

// Post shares table - Chia sẻ bài viết
export const postShares = pgTable(
  'post_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: text('platform'), // facebook, twitter, etc.
    sharedAt: timestamp('shared_at').defaultNow().notNull(),
  },
  (table) => [
    index('post_shares_post_id_idx').on(table.postId),
    index('post_shares_user_id_idx').on(table.userId),
  ],
)

// Post views table - Tracking lượt xem (optional, for analytics)
export const postViews = pgTable(
  'post_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Nullable for anonymous views
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    referrer: text('referrer'),
    viewedAt: timestamp('viewed_at').defaultNow().notNull(),
  },
  (table) => [
    index('post_views_post_id_idx').on(table.postId),
    index('post_views_user_id_idx').on(table.userId),
    index('post_views_viewed_at_idx').on(table.viewedAt),
  ],
)

// Saved posts table - Bài viết đã lưu (bookmarks)
export const savedPosts = pgTable(
  'saved_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    collectionName: text('collection_name').default('default'), // User can organize saved posts
    savedAt: timestamp('saved_at').defaultNow().notNull(),
  },
  (table) => [
    unique('saved_posts_post_user_unique').on(table.postId, table.userId),
    index('saved_posts_post_id_idx').on(table.postId),
    index('saved_posts_user_id_idx').on(table.userId),
    index('saved_posts_collection_idx').on(table.collectionName),
  ],
)
