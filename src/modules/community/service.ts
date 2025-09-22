import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/shared/database/connection";
import {
  posts,
  comments,
  postLikes,
  commentLikes,
  userFollows,
  postShares,
  postViews,
  savedPosts,
  postCategories,
  users,
} from "@/shared/database/schema";
import { AppError } from "@/shared/utils/errors";
import { logger } from "@/shared/utils/logger";

// Helper function to generate slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
    .replace(/[èéẹẻẽêềếệểễ]/g, "e")
    .replace(/[ìíịỉĩ]/g, "i")
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
    .replace(/[ùúụủũưừứựửữ]/g, "u")
    .replace(/[ỳýỵỷỹ]/g, "y")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class CommunityService {
  // =================== CATEGORIES ===================
  async createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
    parentId?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const slug = data.slug || generateSlug(data.name);

    // Check if slug already exists
    const existing = await db.query.postCategories.findFirst({
      where: eq(postCategories.slug, slug),
    });

    if (existing) {
      throw new AppError("Category slug already exists", 400, "DUPLICATE_SLUG");
    }

    const [category] = await db
      .insert(postCategories)
      .values({
        ...data,
        slug,
      })
      .returning();

    return category;
  }

  async getCategories(options: { includeInactive?: boolean } = {}) {
    const conditions = options.includeInactive
      ? undefined
      : eq(postCategories.isActive, true);

    return db.query.postCategories.findMany({
      where: conditions,
      orderBy: [postCategories.sortOrder, postCategories.name],
    });
  }

  async getCategoryBySlug(slug: string) {
    const category = await db.query.postCategories.findFirst({
      where: eq(postCategories.slug, slug),
    });

    if (!category) {
      throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
    }

    return category;
  }

  // =================== POSTS ===================
  async createPost(
    data: {
      title: string;
      slug?: string;
      content?: string;
      excerpt?: string;
      imageUrl?: string;
      categoryId?: string;
      tags?: string[];
      status?: "draft" | "published";
      isFeatured?: boolean;
      metaTitle?: string;
      metaDescription?: string;
      metaKeywords?: string[];
    },
    authorId: string,
  ) {
    const slug = data.slug || generateSlug(data.title);

    // Check if slug already exists
    const existing = await db.query.posts.findFirst({
      where: eq(posts.slug, slug),
    });

    if (existing) {
      // Append timestamp to make it unique
      data.slug = `${slug}-${Date.now()}`;
    } else {
      data.slug = slug;
    }

    const [post] = await db
      .insert(posts)
      .values({
        ...data,
        authorId,
        publishedAt: data.status === "published" ? new Date() : null,
      })
      .returning();

    return post;
  }

  async getPosts(options: {
    page?: number;
    limit?: number;
    status?: "draft" | "pending" | "published" | "rejected" | "archived";
    categoryId?: string;
    authorId?: string;
    tag?: string;
    featured?: boolean;
    editorPick?: boolean;
    search?: string;
    sortBy?:
      | "createdAt"
      | "publishedAt"
      | "viewsCount"
      | "likesCount"
      | "commentsCount";
    sortOrder?: "asc" | "desc";
    userId?: string; // For checking if user liked/saved posts
  }) {
    const {
      page = 1,
      limit = 20,
      status,
      categoryId,
      authorId,
      tag,
      featured,
      editorPick,
      search,
      sortBy = "publishedAt",
      sortOrder = "desc",
      userId,
    } = options;

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (status) conditions.push(eq(posts.status, status));
    if (categoryId) conditions.push(eq(posts.categoryId, categoryId));
    if (authorId) conditions.push(eq(posts.authorId, authorId));
    if (featured !== undefined) conditions.push(eq(posts.isFeatured, featured));
    if (editorPick !== undefined)
      conditions.push(eq(posts.isEditorPick, editorPick));

    if (tag) {
      conditions.push(sql`${posts.tags} @> ${JSON.stringify([tag])}`);
    }

    if (search) {
      conditions.push(
        or(
          ilike(posts.title, `%${search}%`),
          ilike(posts.content, `%${search}%`),
          ilike(posts.excerpt, `%${search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by
    const orderMap = {
      createdAt: posts.createdAt,
      publishedAt: posts.publishedAt,
      viewsCount: posts.viewsCount,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
    };

    const orderColumn = orderMap[sortBy];
    const orderByClause =
      sortOrder === "desc" ? desc(orderColumn) : orderColumn;

    // Get posts with author info
    const postsQuery = db
      .select({
        post: posts,
        author: {
          id: posts.authorId,
          name: sql<string>`(SELECT name FROM users WHERE id = ${posts.authorId})`,
          avatarUrl: sql<
            string | null
          >`(SELECT avatar_url FROM users WHERE id = ${posts.authorId})`,
        },
        category: postCategories,
        isLiked: userId
          ? sql<boolean>`EXISTS(SELECT 1 FROM post_likes WHERE post_id = ${posts.id} AND user_id = ${userId})`
          : sql<boolean>`false`,
        isSaved: userId
          ? sql<boolean>`EXISTS(SELECT 1 FROM saved_posts WHERE post_id = ${posts.id} AND user_id = ${userId})`
          : sql<boolean>`false`,
      })
      .from(posts)
      .leftJoin(postCategories, eq(posts.categoryId, postCategories.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(whereClause);

    const [postsList, [{ count: total }]] = await Promise.all([
      postsQuery,
      totalQuery,
    ]);

    return {
      data: postsList.map((item) => ({
        ...item.post,
        author: item.author,
        category: item.category,
        isLiked: item.isLiked,
        isSaved: item.isSaved,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPostById(id: string, userId?: string) {
    const result = await db
      .select({
        post: posts,
        author: {
          id: posts.authorId,
          name: sql<string>`(SELECT name FROM users WHERE id = ${posts.authorId})`,
          avatarUrl: sql<
            string | null
          >`(SELECT avatar_url FROM users WHERE id = ${posts.authorId})`,
        },
        category: postCategories,
        isLiked: userId
          ? sql<boolean>`EXISTS(SELECT 1 FROM post_likes WHERE post_id = ${posts.id} AND user_id = ${userId})`
          : sql<boolean>`false`,
        isSaved: userId
          ? sql<boolean>`EXISTS(SELECT 1 FROM saved_posts WHERE post_id = ${posts.id} AND user_id = ${userId})`
          : sql<boolean>`false`,
      })
      .from(posts)
      .leftJoin(postCategories, eq(posts.categoryId, postCategories.id))
      .where(eq(posts.id, id))
      .limit(1);

    if (!result[0]) {
      throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }

    // Track view (async, don't await)
    if (userId) {
      this.trackPostView(id, userId).catch((error) => {
        // Log error with context but don't crash
        logger.error("Failed to track post view:", {
          error: error.message,
          postId: id,
          userId,
        });
      });
    }

    return {
      ...result[0].post,
      author: result[0].author,
      category: result[0].category,
      isLiked: result[0].isLiked,
      isSaved: result[0].isSaved,
    };
  }

  async updatePost(
    id: string,
    data: Partial<{
      title: string;
      slug: string;
      content: string;
      excerpt: string;
      imageUrl: string;
      categoryId: string;
      tags: string[];
      status: "draft" | "published" | "archived";
      isFeatured: boolean;
      metaTitle: string;
      metaDescription: string;
      metaKeywords: string[];
    }>,
    userId: string,
  ) {
    // Check ownership or admin
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, id),
    });

    if (!post) {
      throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }

    if (post.authorId !== userId) {
      // Check if user is admin
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (user?.role !== "admin") {
        throw new AppError(
          "Not authorized to update this post",
          403,
          "FORBIDDEN",
        );
      }
    }

    // Update slug if title changed
    if (data.title && !data.slug) {
      data.slug = generateSlug(data.title);
    }

    // Update publishedAt if status changes to published
    const updates: any = { ...data, updatedAt: new Date() };
    if (data.status === "published" && post.status !== "published") {
      updates.publishedAt = new Date();
    }

    const [updated] = await db
      .update(posts)
      .set(updates)
      .where(eq(posts.id, id))
      .returning();

    return updated;
  }

  async deletePost(id: string, userId: string) {
    // Check ownership or admin
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, id),
    });

    if (!post) {
      throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }

    if (post.authorId !== userId) {
      // Check if user is admin
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (user?.role !== "admin") {
        throw new AppError(
          "Not authorized to delete this post",
          403,
          "FORBIDDEN",
        );
      }
    }

    await db.delete(posts).where(eq(posts.id, id));
  }

  // =================== COMMENTS ===================
  async createComment(
    data: {
      postId: string;
      parentId?: string;
      content: string;
    },
    userId: string,
  ) {
    // Check if post exists
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, data.postId),
    });

    if (!post) {
      throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }

    // Check if parent comment exists (if provided)
    if (data.parentId) {
      const parentComment = await db.query.comments.findFirst({
        where: eq(comments.id, data.parentId),
      });

      if (!parentComment) {
        throw new AppError(
          "Parent comment not found",
          404,
          "PARENT_COMMENT_NOT_FOUND",
        );
      }

      // Ensure parent comment belongs to same post
      if (parentComment.postId !== data.postId) {
        throw new AppError(
          "Parent comment belongs to different post",
          400,
          "INVALID_PARENT",
        );
      }
    }

    const [comment] = await db
      .insert(comments)
      .values({
        ...data,
        userId,
        status: "approved", // Auto-approve for now, can add moderation later
      })
      .returning();

    // Update post comment count
    await db
      .update(posts)
      .set({
        commentsCount: sql`${posts.commentsCount} + 1`,
      })
      .where(eq(posts.id, data.postId));

    return comment;
  }

  async getComments(options: {
    postId: string;
    page?: number;
    limit?: number;
    status?: "pending" | "approved" | "rejected" | "spam";
    sortBy?: "createdAt" | "likesCount";
    sortOrder?: "asc" | "desc";
    userId?: string;
  }) {
    const {
      postId,
      page = 1,
      limit = 20,
      status = "approved",
      sortBy = "createdAt",
      sortOrder = "asc",
      userId,
    } = options;

    const offset = (page - 1) * limit;

    // Build where conditions for root comments (no parent)
    const conditions = [eq(comments.postId, postId), isNull(comments.parentId)];

    if (status) {
      conditions.push(eq(comments.status, status));
    }

    const whereClause = and(...conditions);

    // Build order by
    const orderColumn =
      sortBy === "likesCount" ? comments.likesCount : comments.createdAt;
    const orderByClause =
      sortOrder === "desc" ? desc(orderColumn) : orderColumn;

    // Get root comments with user info
    const commentsQuery = db
      .select({
        comment: comments,
        user: {
          id: comments.userId,
          name: sql<string>`(SELECT name FROM users WHERE id = ${comments.userId})`,
          avatarUrl: sql<
            string | null
          >`(SELECT avatar_url FROM users WHERE id = ${comments.userId})`,
        },
        isLiked: userId
          ? sql<boolean>`EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = ${comments.id} AND user_id = ${userId})`
          : sql<boolean>`false`,
      })
      .from(comments)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(whereClause);

    const [commentsList, [{ count: total }]] = await Promise.all([
      commentsQuery,
      totalQuery,
    ]);

    // Get replies for each comment (simplified - just first level)
    const commentIds = commentsList.map((c) => c.comment.id);
    const replies =
      commentIds.length > 0
        ? await db
            .select({
              comment: comments,
              user: {
                id: comments.userId,
                name: sql<string>`(SELECT name FROM users WHERE id = ${comments.userId})`,
                avatarUrl: sql<
                  string | null
                >`(SELECT avatar_url FROM users WHERE id = ${comments.userId})`,
              },
              isLiked: userId
                ? sql<boolean>`EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = ${comments.id} AND user_id = ${userId})`
                : sql<boolean>`false`,
            })
            .from(comments)
            .where(
              and(
                inArray(comments.parentId, commentIds),
                eq(comments.status, "approved"),
              ),
            )
            .orderBy(comments.createdAt)
        : [];

    // Group replies by parent
    const repliesMap = new Map();
    for (const reply of replies) {
      const parentId = reply.comment.parentId!;
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId).push({
        ...reply.comment,
        user: reply.user,
        isLiked: reply.isLiked,
      });
    }

    return {
      data: commentsList.map((item) => ({
        ...item.comment,
        user: item.user,
        isLiked: item.isLiked,
        replies: repliesMap.get(item.comment.id) || [],
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateComment(id: string, content: string, userId: string) {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, id),
    });

    if (!comment) {
      throw new AppError("Comment not found", 404, "COMMENT_NOT_FOUND");
    }

    if (comment.userId !== userId) {
      throw new AppError(
        "Not authorized to update this comment",
        403,
        "FORBIDDEN",
      );
    }

    const [updated] = await db
      .update(comments)
      .set({
        content,
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(comments.id, id))
      .returning();

    return updated;
  }

  async deleteComment(id: string, userId: string) {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, id),
    });

    if (!comment) {
      throw new AppError("Comment not found", 404, "COMMENT_NOT_FOUND");
    }

    if (comment.userId !== userId) {
      // Check if user is admin
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (user?.role !== "admin") {
        throw new AppError(
          "Not authorized to delete this comment",
          403,
          "FORBIDDEN",
        );
      }
    }

    await db.delete(comments).where(eq(comments.id, id));

    // Update post comment count
    await db
      .update(posts)
      .set({
        commentsCount: sql`${posts.commentsCount} - 1`,
      })
      .where(eq(posts.id, comment.postId));
  }

  // =================== LIKES ===================
  async likePost(postId: string, userId: string) {
    // Check if post exists
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!post) {
      throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }

    // Check if already liked
    const existing = await db.query.postLikes.findFirst({
      where: and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)),
    });

    if (existing) {
      return; // Already liked, just return
    }

    // Add like
    await db.insert(postLikes).values({
      postId,
      userId,
    });

    // Update post like count
    await db
      .update(posts)
      .set({
        likesCount: sql`${posts.likesCount} + 1`,
      })
      .where(eq(posts.id, postId));
  }

  async unlikePost(postId: string, userId: string) {
    const deleted = await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .returning();

    if (deleted.length > 0) {
      // Update post like count
      await db
        .update(posts)
        .set({
          likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)`,
        })
        .where(eq(posts.id, postId));
    }
  }

  async likeComment(commentId: string, userId: string) {
    // Check if comment exists
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!comment) {
      throw new AppError("Comment not found", 404, "COMMENT_NOT_FOUND");
    }

    // Check if already liked
    const existing = await db.query.commentLikes.findFirst({
      where: and(
        eq(commentLikes.commentId, commentId),
        eq(commentLikes.userId, userId),
      ),
    });

    if (existing) {
      return; // Already liked
    }

    // Add like
    await db.insert(commentLikes).values({
      commentId,
      userId,
    });

    // Update comment like count
    await db
      .update(comments)
      .set({
        likesCount: sql`${comments.likesCount} + 1`,
      })
      .where(eq(comments.id, commentId));
  }

  async unlikeComment(commentId: string, userId: string) {
    const deleted = await db
      .delete(commentLikes)
      .where(
        and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.userId, userId),
        ),
      )
      .returning();

    if (deleted.length > 0) {
      // Update comment like count
      await db
        .update(comments)
        .set({
          likesCount: sql`GREATEST(${comments.likesCount} - 1, 0)`,
        })
        .where(eq(comments.id, commentId));
    }
  }

  // =================== FOLLOWS ===================
  async followUser(followingId: string, followerId: string) {
    if (followingId === followerId) {
      throw new AppError("Cannot follow yourself", 400, "INVALID_FOLLOW");
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, followingId),
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Check if already following
    const existing = await db.query.userFollows.findFirst({
      where: and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followingId, followingId),
      ),
    });

    if (existing) {
      return; // Already following
    }

    await db.insert(userFollows).values({
      followerId,
      followingId,
    });
  }

  async unfollowUser(followingId: string, followerId: string) {
    await db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          eq(userFollows.followingId, followingId),
        ),
      );
  }

  // =================== SAVED POSTS ===================
  async savePost(postId: string, userId: string, collectionName = "default") {
    // Check if post exists
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!post) {
      throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }

    // Check if already saved
    const existing = await db.query.savedPosts.findFirst({
      where: and(eq(savedPosts.postId, postId), eq(savedPosts.userId, userId)),
    });

    if (existing) {
      // Update collection if different
      if (existing.collectionName !== collectionName) {
        await db
          .update(savedPosts)
          .set({ collectionName })
          .where(eq(savedPosts.id, existing.id));
      }
      return;
    }

    await db.insert(savedPosts).values({
      postId,
      userId,
      collectionName,
    });
  }

  async unsavePost(postId: string, userId: string) {
    await db
      .delete(savedPosts)
      .where(and(eq(savedPosts.postId, postId), eq(savedPosts.userId, userId)));
  }

  // =================== TRACKING ===================
  private async trackPostView(postId: string, userId?: string) {
    // Simple view tracking - can be enhanced with IP, user agent, etc.
    await db.insert(postViews).values({
      postId,
      userId,
    });

    // Update view count
    await db
      .update(posts)
      .set({
        viewsCount: sql`${posts.viewsCount} + 1`,
      })
      .where(eq(posts.id, postId));
  }

  async sharePost(postId: string, userId: string, platform?: string) {
    // Check if post exists
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!post) {
      throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }

    await db.insert(postShares).values({
      postId,
      userId,
      platform,
    });

    // Update share count
    await db
      .update(posts)
      .set({
        sharesCount: sql`${posts.sharesCount} + 1`,
      })
      .where(eq(posts.id, postId));
  }
}

export const communityService = new CommunityService();
