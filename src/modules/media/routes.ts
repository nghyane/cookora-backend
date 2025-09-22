import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";
import { z } from "zod";
import { authMiddleware } from "@/shared/middleware/auth";
import { response } from "@/shared/utils/response";
import { AppError } from "@/shared/utils/errors";
import { mediaService } from "./media.service";

const MEDIA_TAG = "Media";
const mediaRoutes = new Hono();

// Upload media file
mediaRoutes.post(
  "/upload",
  describeRoute({
    summary: "Upload media file to R2 storage",
    tags: [MEDIA_TAG],
    security: [{ Bearer: [] }],
    requestBody: {
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
              file: {
                type: "string",
                format: "binary",
                description: "File to upload (max 10MB)",
              },
              category: {
                type: "string",
                enum: [
                  "avatar",
                  "recipe",
                  "ingredient",
                  "community",
                  "news",
                  "tutorial",
                ],
                description: "Media category for organizing files",
              },
            },
            required: ["file", "category"],
          },
        },
      },
    },
  }),
  authMiddleware,
  zValidator(
    "query",
    z.object({
      category: z.enum([
        "avatar",
        "recipe",
        "ingredient",
        "community",
        "news",
        "tutorial",
      ]),
    }),
  ),
  async (c) => {
    const { category } = c.req.valid("query");
    const user = c.get("user")!;

    // Parse multipart form data
    const body = await c.req.parseBody();
    const file = body.file as File;

    if (!file) {
      return c.json(response.error("No file provided", "MISSING_FILE"), 400);
    }

    try {
      const result = await mediaService.upload(file, category, user.userId);
      return c.json(
        response.success(result, "File uploaded successfully"),
        201,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(response.error(error.message, error.code), error.status);
      }
      return c.json(
        response.error("Failed to upload file", "UPLOAD_FAILED"),
        500,
      );
    }
  },
);

// Get media by ID
mediaRoutes.get(
  "/:id",
  describeRoute({
    summary: "Get media information by ID",
    tags: [MEDIA_TAG],
  }),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");

    const mediaRecord = await mediaService.getById(id);

    if (!mediaRecord) {
      return c.json(response.error("Media not found", "MEDIA_NOT_FOUND"), 404);
    }

    return c.json(response.success(mediaRecord));
  },
);

// Delete media
mediaRoutes.delete(
  "/:id",
  describeRoute({
    summary: "Delete media file",
    tags: [MEDIA_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator("param", z.object({ id: z.uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user")!;

    try {
      await mediaService.delete(id, user.userId);
      return c.json(response.success(null, "Media deleted successfully"));
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(response.error(error.message, error.code), error.status);
      }
      return c.json(
        response.error("Failed to delete media", "DELETE_FAILED"),
        500,
      );
    }
  },
);

export { mediaRoutes };
