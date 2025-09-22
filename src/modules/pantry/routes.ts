import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";
import { z } from "zod";

import { authMiddleware } from "@/shared/middleware/auth";
import {
  addPantryItemSchema,
  updatePantryItemSchema,
  pantrySearchQuerySchema,
} from "@/shared/schemas/api/pantry.schemas";
import { idParamSchema } from "@/shared/schemas/api/common.schemas";
import {
  addPantryItem,
  addPantryBatch,
  updatePantryItem,
  removePantryItem,
} from "./pantry.operations";
import { getPantryItems, getExpiringItems } from "./pantry.queries";
import { getPantryStats } from "./pantry.analytics";
import {
  suggestRecipes,
  checkRecipeAvailability,
} from "./pantry.recommendations";
import {
  getInviteCode,
  joinPantryByCode,
  getCurrentPantry,
  leavePantry,
  getMyFollowers,
  removeFollower,
} from "./pantry.sharing";
import { response } from "@/shared/utils/response";

const PANTRY_TAG = "Pantry";
const pantryRoutes = new Hono();

// Get user's pantry items
pantryRoutes.get(
  "/",
  describeRoute({
    summary: "Lấy danh sách nguyên liệu trong kho",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("query", pantrySearchQuerySchema),
  async (c) => {
    const user = c.get("user");
    const query = c.req.valid("query");
    const result = await getPantryItems(user.userId, query);
    return c.json(response.success(result));
  },
);

// Add item to pantry (current pantry)
pantryRoutes.post(
  "/",
  describeRoute({
    summary: "Thêm nguyên liệu vào kho hiện tại",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("json", addPantryItemSchema),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const newItem = await addPantryItem(user.userId, body);
    return c.json(response.success(newItem), 201);
  },
);

// Add multiple items (batch)
pantryRoutes.post(
  "/batch",
  describeRoute({
    summary: "Thêm nhiều nguyên liệu vào kho hiện tại",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator(
    "json",
    z.object({
      items: z.array(addPantryItemSchema).min(1).max(50),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const { items } = c.req.valid("json");
    const newItems = await addPantryBatch(user.userId, items);
    return c.json(
      response.success({ items: newItems, count: newItems.length }),
      201,
    );
  },
);

// Update pantry item
pantryRoutes.put(
  "/:id",
  describeRoute({
    summary: "Cập nhật nguyên liệu trong kho",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", idParamSchema),
  zValidator("json", updatePantryItemSchema),
  async (c) => {
    const user = c.get("user");
    const id = c.req.valid("param").id;
    const body = c.req.valid("json");
    const updated = await updatePantryItem(user.userId, id, body);
    return c.json(response.success(updated));
  },
);

// Remove item from pantry
pantryRoutes.delete(
  "/:id",
  describeRoute({
    summary: "Xóa nguyên liệu khỏi kho",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", idParamSchema),
  async (c) => {
    const user = c.get("user");
    const id = c.req.valid("param").id;
    const result = await removePantryItem(user.userId, id);
    return c.json(response.success(result));
  },
);

// Get expiring items
pantryRoutes.get(
  "/expiring",
  describeRoute({
    summary: "Lấy nguyên liệu sắp hết hạn",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator(
    "query",
    z.object({
      days: z.coerce.number().int().min(1).max(30).default(7),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const { days } = c.req.valid("query");
    const items = await getExpiringItems(user.userId, days);
    return c.json(response.success(items));
  },
);

// Get pantry statistics
pantryRoutes.get(
  "/stats",
  describeRoute({
    summary: "Thống kê kho nguyên liệu",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  async (c) => {
    const user = c.get("user");
    const stats = await getPantryStats(user.userId);
    return c.json(response.success(stats));
  },
);

// Suggest recipes based on pantry
pantryRoutes.get(
  "/suggest-recipes",
  describeRoute({
    summary: "Gợi ý món ăn từ nguyên liệu có sẵn",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator(
    "query",
    z.object({
      limit: z.coerce.number().int().min(1).max(20).default(10),
      cookingTime: z.coerce.number().int().min(1).optional(),
      servings: z.coerce.number().int().min(1).optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const options = c.req.valid("query");
    const suggestions = await suggestRecipes(user.userId, options);
    return c.json(response.success(suggestions));
  },
);

// Check recipe availability based on pantry
pantryRoutes.get(
  "/check-recipe/:recipeId",
  describeRoute({
    summary: "Kiểm tra khả năng làm món từ nguyên liệu có sẵn",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator(
    "param",
    z.object({
      recipeId: z.uuid("Recipe ID phải là UUID hợp lệ"),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const { recipeId } = c.req.valid("param");
    const availability = await checkRecipeAvailability(user.userId, recipeId);
    return c.json(response.success(availability));
  },
);

// ===== SHARING ENDPOINTS =====

// Get or create invite code
pantryRoutes.get(
  "/invite-code",
  describeRoute({
    summary: "Lấy mã mời kho của tôi",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  async (c) => {
    const user = c.get("user");
    const result = await getInviteCode(user.userId);
    return c.json(response.success(result));
  },
);

// Join pantry with invite code
pantryRoutes.post(
  "/join",
  describeRoute({
    summary: "Tham gia kho qua mã mời",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator(
    "json",
    z.object({
      code: z.string().length(6, "Mã mời phải có 6 ký tự"),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const { code } = c.req.valid("json");
    const result = await joinPantryByCode(code, user.userId);
    return c.json(response.success(result));
  },
);

// Get current pantry info
pantryRoutes.get(
  "/current",
  describeRoute({
    summary: "Thông tin kho hiện tại",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  async (c) => {
    const user = c.get("user");
    const result = await getCurrentPantry(user.userId);
    return c.json(response.success(result));
  },
);

// Get my followers
pantryRoutes.get(
  "/followers",
  describeRoute({
    summary: "Danh sách người theo dõi kho của tôi",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  async (c) => {
    const user = c.get("user");
    const result = await getMyFollowers(user.userId);
    return c.json(response.success(result));
  },
);

// Leave shared pantry and return to personal
pantryRoutes.post(
  "/leave",
  describeRoute({
    summary: "Rời kho chia sẻ, quay về kho cá nhân",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  async (c) => {
    const user = c.get("user");
    const result = await leavePantry(user.userId);
    return c.json(response.success(result));
  },
);

// Remove a follower
pantryRoutes.delete(
  "/followers/:followerId",
  describeRoute({
    summary: "Xóa người theo dõi",
    tags: [PANTRY_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator(
    "param",
    z.object({
      followerId: z.uuid("Follower ID phải là UUID hợp lệ"),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const { followerId } = c.req.valid("param");
    const result = await removeFollower(user.userId, followerId);
    return c.json(response.success(result));
  },
);

export { pantryRoutes };
