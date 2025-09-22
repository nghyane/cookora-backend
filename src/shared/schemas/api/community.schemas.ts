import { z } from "zod";
import { ApiSchemas } from "./common.schemas";

// Post Category schemas
export const createCategorySchema = z.object({
  name: z.string().min(1).max(100).describe("Tên danh mục"),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .describe("Đường dẫn thân thiện URL"),
  description: z.string().optional().describe("Mô tả danh mục"),
  parentId: z
    .uuid()
    .optional()
    .describe("ID danh mục cha cho danh mục lồng nhau"),
  sortOrder: z.number().int().min(0).default(0).describe("Thứ tự sắp xếp"),
  isActive: z.boolean().default(true).describe("Danh mục có hoạt động không"),
});

export const categoryResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  parentId: z.uuid().nullable(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Post schemas
export const createPostSchema = z.object({
  title: z.string().min(1).max(200).describe("Tiêu đề bài viết"),
  content: z.string().min(1).describe("Nội dung bài viết (HTML hoặc markdown)"),
  excerpt: z.string().max(500).optional().describe("Mô tả ngắn"),
  imageUrl: z.string().url().optional().describe("Đường dẫn ảnh nổi bật"),
  categoryId: z.uuid().optional().describe("ID danh mục"),
  tags: z.array(z.string()).default([]).describe("Mảng các thẻ tag"),
  status: z
    .enum(["draft", "published"])
    .default("draft")
    .describe("Trạng thái bài viết"),
  isFeatured: z.boolean().default(false).describe("Hiển thị trên trang chủ"),
  metaTitle: z.string().max(100).optional().describe("Tiêu đề SEO"),
  metaDescription: z.string().max(160).optional().describe("Mô tả SEO"),
  metaKeywords: z.array(z.string()).default([]).describe("Từ khóa SEO"),
});

export const updatePostSchema = createPostSchema.partial().extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export const postResponseSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  content: z.string().nullable(),
  excerpt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  status: z.enum(["draft", "pending", "published", "rejected", "archived"]),
  categoryId: z.uuid().nullable(),
  category: categoryResponseSchema.nullable().optional(),
  tags: z.array(z.string()),
  authorId: z.uuid(),
  author: z
    .object({
      id: z.uuid(),
      name: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .optional(),
  viewsCount: z.number(),
  likesCount: z.number(),
  commentsCount: z.number(),
  sharesCount: z.number(),
  isFeatured: z.boolean(),
  isEditorPick: z.boolean(),
  featuredOrder: z.number().nullable(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  metaKeywords: z.array(z.string()),
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isLiked: z
    .boolean()
    .optional()
    .describe("Người dùng hiện tại đã thích bài viết này chưa"),
  isSaved: z
    .boolean()
    .optional()
    .describe("Người dùng hiện tại đã lưu bài viết này chưa"),
});

export const postListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["draft", "pending", "published", "rejected", "archived"])
    .optional(),
  categoryId: z.uuid().optional(),
  authorId: z.uuid().optional(),
  tag: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  editorPick: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum([
      "createdAt",
      "publishedAt",
      "viewsCount",
      "likesCount",
      "commentsCount",
    ])
    .default("publishedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Comment schemas
export const createCommentSchema = z.object({
  postId: z.uuid().describe("ID bài viết"),
  parentId: z.uuid().optional().describe("ID bình luận cha cho phản hồi"),
  content: z.string().min(1).max(1000).describe("Nội dung bình luận"),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1)
    .max(1000)
    .describe("Nội dung bình luận đã cập nhật"),
});

export const commentResponseSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  userId: z.uuid(),
  user: z
    .object({
      id: z.uuid(),
      name: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .optional(),
  parentId: z.uuid().nullable(),
  content: z.string(),
  status: z.enum(["pending", "approved", "rejected", "spam"]),
  isEdited: z.boolean(),
  editedAt: z.date().nullable(),
  likesCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isLiked: z
    .boolean()
    .optional()
    .describe("Người dùng hiện tại đã thích bình luận này chưa"),
  replies: z
    .array(z.lazy(() => commentResponseSchema))
    .optional()
    .describe("Các phản hồi lồng nhau"),
});

export const commentListQuerySchema = z.object({
  postId: z.uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "approved", "rejected", "spam"]).optional(),
  sortBy: z.enum(["createdAt", "likesCount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Like/Unlike schemas
export const likePostSchema = z.object({
  postId: z.uuid().describe("ID bài viết cần thích"),
});

export const likeCommentSchema = z.object({
  commentId: z.uuid().describe("ID bình luận cần thích"),
});

// Save post schema
export const savePostSchema = z.object({
  postId: z.uuid().describe("ID bài viết cần lưu"),
  collectionName: z
    .string()
    .max(100)
    .default("default")
    .describe("Tên bộ sưu tập"),
});

// Follow user schema
export const followUserSchema = z.object({
  userId: z.uuid().describe("ID người dùng cần theo dõi"),
});

// Share post schema
export const sharePostSchema = z.object({
  postId: z.uuid().describe("ID bài viết cần chia sẻ"),
  platform: z.string().optional().describe("Nền tảng chia sẻ"),
});

// Stats response schemas
export const postStatsSchema = z.object({
  totalViews: z.number(),
  totalLikes: z.number(),
  totalComments: z.number(),
  totalShares: z.number(),
  uniqueViewers: z.number(),
  averageReadTime: z.number().optional(),
});

export const userStatsSchema = z.object({
  totalPosts: z.number(),
  totalFollowers: z.number(),
  totalFollowing: z.number(),
  totalLikes: z.number(),
  totalComments: z.number(),
  totalViews: z.number(),
});

// API Schemas for OpenAPI documentation
export const CommunityApiSchemas = {
  // Categories
  CreateCategory: {
    body: createCategorySchema,
    response: {
      200: ApiSchemas.SuccessWithData(categoryResponseSchema),
      400: ApiSchemas.ErrorResponse,
      401: ApiSchemas.ErrorResponse,
    },
  },
  GetCategories: {
    response: {
      200: ApiSchemas.SuccessWithData(z.array(categoryResponseSchema)),
    },
  },

  // Posts
  CreatePost: {
    body: createPostSchema,
    response: {
      201: ApiSchemas.SuccessWithData(postResponseSchema),
      400: ApiSchemas.ErrorResponse,
      401: ApiSchemas.ErrorResponse,
    },
  },
  GetPosts: {
    query: postListQuerySchema,
    response: {
      200: ApiSchemas.PaginatedResponse(postResponseSchema),
    },
  },
  GetPost: {
    params: z.object({
      id: z.uuid(),
    }),
    response: {
      200: ApiSchemas.SuccessWithData(postResponseSchema),
      404: ApiSchemas.ErrorResponse,
    },
  },
  UpdatePost: {
    params: z.object({
      id: z.uuid(),
    }),
    body: updatePostSchema,
    response: {
      200: ApiSchemas.SuccessWithData(postResponseSchema),
      400: ApiSchemas.ErrorResponse,
      401: ApiSchemas.ErrorResponse,
      403: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },
  DeletePost: {
    params: z.object({
      id: z.uuid(),
    }),
    response: {
      200: ApiSchemas.SuccessResponse,
      401: ApiSchemas.ErrorResponse,
      403: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },

  // Comments
  CreateComment: {
    body: createCommentSchema,
    response: {
      201: ApiSchemas.SuccessWithData(commentResponseSchema),
      400: ApiSchemas.ErrorResponse,
      401: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },
  GetComments: {
    query: commentListQuerySchema,
    response: {
      200: ApiSchemas.PaginatedResponse(commentResponseSchema),
      404: ApiSchemas.ErrorResponse,
    },
  },
  UpdateComment: {
    params: z.object({
      id: z.uuid(),
    }),
    body: updateCommentSchema,
    response: {
      200: ApiSchemas.SuccessWithData(commentResponseSchema),
      400: ApiSchemas.ErrorResponse,
      401: ApiSchemas.ErrorResponse,
      403: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },
  DeleteComment: {
    params: z.object({
      id: z.uuid(),
    }),
    response: {
      200: ApiSchemas.SuccessResponse,
      401: ApiSchemas.ErrorResponse,
      403: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },

  // Likes
  LikePost: {
    params: z.object({
      id: z.uuid(),
    }),
    response: {
      200: ApiSchemas.SuccessResponse,
      401: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },
  UnlikePost: {
    params: z.object({
      id: z.uuid(),
    }),
    response: {
      200: ApiSchemas.SuccessResponse,
      401: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },
  LikeComment: {
    params: z.object({
      id: z.uuid(),
    }),
    response: {
      200: ApiSchemas.SuccessResponse,
      401: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },
  UnlikeComment: {
    params: z.object({
      id: z.uuid(),
    }),
    response: {
      200: ApiSchemas.SuccessResponse,
      401: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },

  // Save posts
  SavePost: {
    params: z.object({
      id: z.uuid(),
    }),
    body: z
      .object({
        collectionName: z.string().max(100).default("default"),
      })
      .optional(),
    response: {
      200: ApiSchemas.SuccessResponse,
      401: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },
  UnsavePost: {
    params: z.object({
      id: z.uuid(),
    }),
    response: {
      200: ApiSchemas.SuccessResponse,
      401: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },

  // Follow
  FollowUser: {
    params: z.object({
      id: z.uuid(),
    }),
    response: {
      200: ApiSchemas.SuccessResponse,
      401: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },
  UnfollowUser: {
    params: z.object({
      id: z.uuid(),
    }),
    response: {
      200: ApiSchemas.SuccessResponse,
      401: ApiSchemas.ErrorResponse,
      404: ApiSchemas.ErrorResponse,
    },
  },

  // Stats
  GetPostStats: {
    params: z.object({
      id: z.uuid(),
    }),
    response: {
      200: ApiSchemas.SuccessWithData(postStatsSchema),
      404: ApiSchemas.ErrorResponse,
    },
  },
  GetUserStats: {
    params: z.object({
      id: z.uuid(),
    }),
    response: {
      200: ApiSchemas.SuccessWithData(userStatsSchema),
      404: ApiSchemas.ErrorResponse,
    },
  },
};
