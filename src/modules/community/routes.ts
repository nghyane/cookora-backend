import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";
import { z } from "zod";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "@/shared/middleware/auth";
import { adminMiddleware } from "@/shared/middleware/admin";
import { response } from "@/shared/utils/response";
import {
  createCategorySchema,
  createPostSchema,
  updatePostSchema,
  postListQuerySchema,
  createCommentSchema,
  updateCommentSchema,
  commentListQuerySchema,
} from "@/shared/schemas/api/community.schemas";
import { communityService } from "./service";

const COMMUNITY_TAG = "Cộng đồng";
const communityRoutes = new Hono();

// =================== DANH MỤC ===================
// Lấy danh sách danh mục
communityRoutes.get(
  "/categories",
  describeRoute({
    summary: "Lấy danh sách danh mục bài viết",
    tags: [COMMUNITY_TAG],
  }),
  async (c) => {
    const categories = await communityService.getCategories();
    return c.json(response.success(categories));
  },
);

// Tạo danh mục mới (admin)
communityRoutes.post(
  "/categories",
  describeRoute({
    summary: "Tạo danh mục bài viết mới",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  adminMiddleware,
  zValidator("json", createCategorySchema),
  async (c) => {
    const data = c.req.valid("json");
    const category = await communityService.createCategory(data);
    return c.json(response.success(category, "Tạo danh mục thành công"), 201);
  },
);

// =================== BÀI VIẾT ===================
// Lấy danh sách bài viết
communityRoutes.get(
  "/posts",
  describeRoute({
    summary: "Lấy danh sách bài viết",
    tags: [COMMUNITY_TAG],
  }),
  optionalAuthMiddleware, // Added to safely handle authenticated and non-authenticated users
  zValidator("query", postListQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const user = c.get("user");

    const result = await communityService.getPosts({
      ...query,
      userId: user?.userId,
      // Only admin can see drafts, others see published only
      status: user?.role === "admin" ? query.status : "published",
    });

    return c.json(response.success(result));
  },
);

// Xem chi tiết bài viết
communityRoutes.get(
  "/posts/:id",
  describeRoute({
    summary: "Xem chi tiết bài viết",
    tags: [COMMUNITY_TAG],
  }),
  optionalAuthMiddleware, // Added to handle optional authentication
  zValidator("param", z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user");

    const post = await communityService.getPostById(id, user?.userId);
    return c.json(response.success(post));
  },
);

// Tạo bài viết mới
communityRoutes.post(
  "/posts",
  describeRoute({
    summary: "Tạo bài viết mới",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("json", createPostSchema),
  async (c) => {
    const data = c.req.valid("json");
    const user = c.get("user")!;

    const post = await communityService.createPost(data, user.userId);
    return c.json(response.success(post, "Tạo bài viết thành công"), 201);
  },
);

// Cập nhật bài viết
communityRoutes.put(
  "/posts/:id",
  describeRoute({
    summary: "Cập nhật bài viết",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  zValidator("json", updatePostSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const user = c.get("user")!;

    const post = await communityService.updatePost(id, data, user.userId);
    return c.json(response.success(post, "Cập nhật bài viết thành công"));
  },
);

// Xóa bài viết
communityRoutes.delete(
  "/posts/:id",
  describeRoute({
    summary: "Xóa bài viết",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user")!;

    await communityService.deletePost(id, user.userId);
    return c.json(response.success(null, "Xóa bài viết thành công"));
  },
);

// =================== TƯƠNG TÁC BÀI VIẾT ===================
// Thích bài viết
communityRoutes.post(
  "/posts/:id/like",
  describeRoute({
    summary: "Thích bài viết",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user")!;

    await communityService.likePost(id, user.userId);
    return c.json(response.success(null, "Đã thích bài viết"));
  },
);

// Bỏ thích bài viết
communityRoutes.delete(
  "/posts/:id/like",
  describeRoute({
    summary: "Bỏ thích bài viết",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user")!;

    await communityService.unlikePost(id, user.userId);
    return c.json(response.success(null, "Đã bỏ thích bài viết"));
  },
);

// Lưu bài viết
communityRoutes.post(
  "/posts/:id/save",
  describeRoute({
    summary: "Lưu bài viết",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  zValidator(
    "json",
    z
      .object({ collectionName: z.string().max(100).default("default") })
      .optional(),
  ),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const user = c.get("user")!;

    await communityService.savePost(id, user.userId, data?.collectionName);
    return c.json(response.success(null, "Đã lưu bài viết"));
  },
);

// Bỏ lưu bài viết
communityRoutes.delete(
  "/posts/:id/save",
  describeRoute({
    summary: "Bỏ lưu bài viết",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user")!;

    await communityService.unsavePost(id, user.userId);
    return c.json(response.success(null, "Đã bỏ lưu bài viết"));
  },
);

// Chia sẻ bài viết
communityRoutes.post(
  "/posts/:id/share",
  describeRoute({
    summary: "Chia sẻ bài viết",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  zValidator("json", z.object({ platform: z.string().optional() }).optional()),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const user = c.get("user")!;

    await communityService.sharePost(id, user.userId, data?.platform);
    return c.json(response.success(null, "Đã chia sẻ bài viết"));
  },
);

// =================== BÌNH LUẬN ===================
// Lấy danh sách bình luận
communityRoutes.get(
  "/comments",
  describeRoute({
    summary: "Lấy danh sách bình luận của bài viết",
    tags: [COMMUNITY_TAG],
  }),
  optionalAuthMiddleware, // Added to handle optional authentication
  zValidator("query", commentListQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const user = c.get("user");

    const result = await communityService.getComments({
      ...query,
      userId: user?.userId,
    });

    return c.json(response.success(result));
  },
);

// Tạo bình luận mới
communityRoutes.post(
  "/comments",
  describeRoute({
    summary: "Tạo bình luận mới",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("json", createCommentSchema),
  async (c) => {
    const data = c.req.valid("json");
    const user = c.get("user")!;

    const comment = await communityService.createComment(data, user.userId);
    return c.json(response.success(comment, "Đã thêm bình luận"), 201);
  },
);

// Cập nhật bình luận
communityRoutes.put(
  "/comments/:id",
  describeRoute({
    summary: "Cập nhật bình luận",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  zValidator("json", updateCommentSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { content } = c.req.valid("json");
    const user = c.get("user")!;

    const comment = await communityService.updateComment(
      id,
      content,
      user.userId,
    );
    return c.json(response.success(comment, "Cập nhật bình luận thành công"));
  },
);

// Xóa bình luận
communityRoutes.delete(
  "/comments/:id",
  describeRoute({
    summary: "Xóa bình luận",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user")!;

    await communityService.deleteComment(id, user.userId);
    return c.json(response.success(null, "Xóa bình luận thành công"));
  },
);

// Thích bình luận
communityRoutes.post(
  "/comments/:id/like",
  describeRoute({
    summary: "Thích bình luận",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user")!;

    await communityService.likeComment(id, user.userId);
    return c.json(response.success(null, "Đã thích bình luận"));
  },
);

// Bỏ thích bình luận
communityRoutes.delete(
  "/comments/:id/like",
  describeRoute({
    summary: "Bỏ thích bình luận",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user")!;

    await communityService.unlikeComment(id, user.userId);
    return c.json(response.success(null, "Đã bỏ thích bình luận"));
  },
);

// =================== THEO DÕI NGƯỜI DÙNG ===================
// Theo dõi người dùng
communityRoutes.post(
  "/users/:id/follow",
  describeRoute({
    summary: "Theo dõi người dùng",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user")!;

    await communityService.followUser(id, user.userId);
    return c.json(response.success(null, "Đã theo dõi người dùng"));
  },
);

// Bỏ theo dõi người dùng
communityRoutes.delete(
  "/users/:id/follow",
  describeRoute({
    summary: "Bỏ theo dõi người dùng",
    tags: [COMMUNITY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user")!;

    await communityService.unfollowUser(id, user.userId);
    return c.json(response.success(null, "Đã bỏ theo dõi"));
  },
);

export { communityRoutes };
