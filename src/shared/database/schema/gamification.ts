import { boolean, decimal, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, unique } from 'drizzle-orm/pg-core'
import { users } from './users'
import { posts } from './community'

// Challenge status enum
export const challengeStatusEnum = pgEnum('challenge_status', ['draft', 'upcoming', 'active', 'ended', 'cancelled'])

// Submission status enum
export const submissionStatusEnum = pgEnum('submission_status', ['pending', 'approved', 'rejected', 'winner'])

// Badge level enum - Cấp bậc theo chương trình Bếp Trưởng Sáng Tạo
export const badgeLevelEnum = pgEnum('badge_level', [
  'beginner',      // Tập Sự Bếp (0-100 điểm)
  'sous_chef',     // Bếp Phó (101-500 điểm)
  'head_chef',     // Bếp Trưởng (501-1500 điểm)
  'expert',        // Chuyên Gia Ẩm Thực (1501-5000 điểm)
  'ambassador'     // Đại Sứ Cookora (>5000 điểm)
])

// Achievement type enum
export const achievementTypeEnum = pgEnum('achievement_type', [
  'first_post',           // Bài viết đầu tiên
  'ten_posts',           // 10 bài viết
  'hundred_likes',       // 100 lượt thích
  'featured_writer',     // Được chọn lên tạp chí
  'challenge_winner',    // Thắng thử thách
  'community_helper',    // Giúp đỡ cộng đồng
  'recipe_master',       // Chuyên gia công thức
  'trending_creator',    // Tác giả hot
  'year_member'         // Thành viên 1 năm
])

// Reward item type enum
export const rewardTypeEnum = pgEnum('reward_type', [
  'voucher',      // Phiếu giảm giá
  'physical',     // Quà tặng vật lý (tạp dề, sổ tay, dao dĩa)
  'digital',      // Quà tặng số (ebook, khóa học)
  'badge',        // Huy hiệu đặc biệt
  'feature'       // Tính năng độc quyền
])

// Points action enum - Các hành động được thưởng điểm
export const pointsActionEnum = pgEnum('points_action', [
  'create_post',          // +10 điểm
  'post_featured',        // +50 điểm (BTV chọn lên tạp chí)
  'post_trending',        // +30 điểm (lọt top nổi bật)
  'receive_like',         // +1 điểm
  'receive_comment',      // +2 điểm
  'join_challenge',       // +20 điểm
  'win_challenge',        // +100 điểm
  'daily_login',          // +1 điểm
  'complete_profile',     // +10 điểm
  'refer_friend',         // +25 điểm
  'first_recipe',         // +15 điểm
  'help_answer'          // +5 điểm (trả lời câu hỏi)
])

// Challenges table - Thử thách sáng tạo
export const challenges = pgTable(
  'challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    slug: text('slug').unique(),
    description: text('description'),
    rules: text('rules'), // Luật chơi chi tiết
    requirements: jsonb('requirements').default([]), // Yêu cầu tham gia
    prizes: jsonb('prizes').default([]), // Giải thưởng

    // Images
    bannerUrl: text('banner_url'),
    thumbnailUrl: text('thumbnail_url'),

    // Timing
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    submissionDeadline: timestamp('submission_deadline'), // Hạn nộp bài

    // Status & Limits
    status: challengeStatusEnum('status').default('draft').notNull(),
    maxParticipants: integer('max_participants'),
    currentParticipants: integer('current_participants').default(0).notNull(),

    // Judging
    judgingCriteria: jsonb('judging_criteria').default([]), // Tiêu chí chấm điểm
    judges: jsonb('judges').default([]), // Danh sách giám khảo (user IDs)

    // Meta
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    sponsorInfo: jsonb('sponsor_info'), // Thông tin nhà tài trợ nếu có

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('challenges_status_idx').on(table.status),
    index('challenges_start_date_idx').on(table.startDate),
    index('challenges_end_date_idx').on(table.endDate),
    index('challenges_created_by_idx').on(table.createdBy),
    index('challenges_slug_idx').on(table.slug),
  ],
)

// Challenge submissions table - Bài dự thi
export const challengeSubmissions = pgTable(
  'challenge_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }), // Link to actual content

    // Scoring
    score: decimal('score', { precision: 5, scale: 2 }), // Điểm từ giám khảo
    judgeNotes: jsonb('judge_notes'), // Nhận xét từ giám khảo
    publicVotes: integer('public_votes').default(0), // Bình chọn từ cộng đồng

    // Status
    status: submissionStatusEnum('status').default('pending').notNull(),
    rank: integer('rank'), // Thứ hạng cuối cùng

    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => [
    // One submission per user per challenge
    unique('challenge_submissions_user_challenge_unique').on(table.userId, table.challengeId),
    index('challenge_submissions_challenge_id_idx').on(table.challengeId),
    index('challenge_submissions_user_id_idx').on(table.userId),
    index('challenge_submissions_status_idx').on(table.status),
    index('challenge_submissions_submitted_at_idx').on(table.submittedAt),
  ],
)

// Rewards points table - Điểm thưởng tích lũy
export const rewardsPoints = pgTable(
  'rewards_points',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: pointsActionEnum('action').notNull(),
    points: integer('points').notNull(), // Can be negative for deductions
    description: text('description'),

    // Reference to related entity
    referenceType: text('reference_type'), // 'post', 'challenge', 'comment', etc.
    referenceId: uuid('reference_id'), // ID of related entity

    // Tracking
    ipAddress: text('ip_address'),
    metadata: jsonb('metadata'), // Extra data for debugging

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('rewards_points_user_id_idx').on(table.userId),
    index('rewards_points_action_idx').on(table.action),
    index('rewards_points_created_at_idx').on(table.createdAt),
    index('rewards_points_reference_idx').on(table.referenceType, table.referenceId),
  ],
)

// User badges table - Huy hiệu và cấp bậc
export const userBadges = pgTable(
  'user_badges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeLevel: badgeLevelEnum('badge_level').notNull(),

    // Points tracking
    currentPoints: integer('current_points').default(0).notNull(),
    totalPointsEarned: integer('total_points_earned').default(0).notNull(),

    // Level progression
    nextLevelPoints: integer('next_level_points'), // Points needed for next level
    progressPercentage: integer('progress_percentage'), // 0-100

    // Special badges
    isVerified: boolean('is_verified').default(false).notNull(), // Tick xanh
    isPremium: boolean('is_premium').default(false).notNull(), // Thành viên cao cấp
    specialBadges: jsonb('special_badges').default([]), // Huy hiệu đặc biệt khác

    earnedAt: timestamp('earned_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('user_badges_user_unique').on(table.userId), // One badge record per user
    index('user_badges_user_id_idx').on(table.userId),
    index('user_badges_level_idx').on(table.badgeLevel),
    index('user_badges_current_points_idx').on(table.currentPoints),
  ],
)

// User achievements table - Thành tích đạt được
export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementType: achievementTypeEnum('achievement_type').notNull(),

    // Achievement details
    title: text('title').notNull(),
    description: text('description'),
    iconUrl: text('icon_url'),

    // Progress tracking (for multi-step achievements)
    currentProgress: integer('current_progress').default(0),
    targetProgress: integer('target_progress'),
    isCompleted: boolean('is_completed').default(false).notNull(),

    // Rewards
    pointsAwarded: integer('points_awarded').default(0),

    // Metadata
    metadata: jsonb('metadata'), // Extra achievement-specific data

    unlockedAt: timestamp('unlocked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('user_achievements_user_type_unique').on(table.userId, table.achievementType),
    index('user_achievements_user_id_idx').on(table.userId),
    index('user_achievements_type_idx').on(table.achievementType),
    index('user_achievements_completed_idx').on(table.isCompleted),
  ],
)

// Rewards items table - Kho quà tặng đổi thưởng
export const rewardsItems = pgTable(
  'rewards_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    type: rewardTypeEnum('type').notNull(),

    // Images
    imageUrl: text('image_url'),
    thumbnailUrl: text('thumbnail_url'),

    // Requirements & Availability
    pointsRequired: integer('points_required').notNull(),
    stock: integer('stock'), // NULL means unlimited
    maxPerUser: integer('max_per_user').default(1), // Limit per user

    // Validity
    isActive: boolean('is_active').default(true).notNull(),
    availableFrom: timestamp('available_from'),
    availableUntil: timestamp('available_until'),

    // Value & Partner info
    actualValue: decimal('actual_value', { precision: 10, scale: 2 }), // Giá trị thực
    partnerName: text('partner_name'), // Đối tác cung cấp
    partnerLogo: text('partner_logo'),

    // Redemption details
    redemptionInstructions: text('redemption_instructions'),
    termsConditions: text('terms_conditions'),

    // Metadata
    metadata: jsonb('metadata'), // Extra item-specific data

    // Stats
    totalRedeemed: integer('total_redeemed').default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('rewards_items_type_idx').on(table.type),
    index('rewards_items_active_idx').on(table.isActive),
    index('rewards_items_points_idx').on(table.pointsRequired),
  ],
)

// Rewards redemptions table - Lịch sử đổi thưởng
export const rewardsRedemptions = pgTable(
  'rewards_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => rewardsItems.id, { onDelete: 'restrict' }),

    // Transaction details
    pointsUsed: integer('points_used').notNull(),
    quantity: integer('quantity').default(1).notNull(),

    // Status tracking
    status: pgEnum('redemption_status', ['pending', 'processing', 'completed', 'cancelled', 'failed'])('status')
      .default('pending')
      .notNull(),

    // Fulfillment
    redemptionCode: text('redemption_code'), // Mã đổi thưởng
    shippingAddress: jsonb('shipping_address'), // For physical items
    contactInfo: jsonb('contact_info'), // Email/phone for digital items

    // Processing
    processedBy: uuid('processed_by').references(() => users.id, { onDelete: 'set null' }),
    processedAt: timestamp('processed_at'),
    processingNotes: text('processing_notes'),

    // Tracking
    trackingNumber: text('tracking_number'), // For shipped items
    deliveredAt: timestamp('delivered_at'),

    redeemedAt: timestamp('redeemed_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'), // For time-limited rewards
  },
  (table) => [
    index('rewards_redemptions_user_id_idx').on(table.userId),
    index('rewards_redemptions_item_id_idx').on(table.itemId),
    index('rewards_redemptions_status_idx').on(table.status),
    index('rewards_redemptions_redeemed_at_idx').on(table.redeemedAt),
  ],
)

// Challenge votes table - Bình chọn cho bài dự thi (community voting)
export const challengeVotes = pgTable(
  'challenge_votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => challengeSubmissions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    votedAt: timestamp('voted_at').defaultNow().notNull(),
  },
  (table) => [
    unique('challenge_votes_user_submission_unique').on(table.userId, table.submissionId),
    index('challenge_votes_submission_id_idx').on(table.submissionId),
    index('challenge_votes_user_id_idx').on(table.userId),
  ],
)
