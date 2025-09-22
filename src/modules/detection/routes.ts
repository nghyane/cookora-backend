import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";

import { authMiddleware } from "@/shared/middleware/auth";
import { detectionUploadSchema } from "@/shared/schemas/api/detection.schemas";
import { detectIngredients } from "./detection.service";
import { response } from "@/shared/utils/response";

const DETECTION_TAG = "Detection";
const detectionRoutes = new Hono();

// Upload image for ingredient detection
detectionRoutes.post(
  "/upload",
  describeRoute({
    summary: "Nhận diện nguyên liệu từ ảnh",
    tags: [DETECTION_TAG],
    security: [{ Bearer: [] }],
    requestBody: {
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
              image: {
                type: "string",
                format: "binary",
                description: "Max 10MB",
              },
            },
            required: ["image"],
          },
        },
      },
    },
  }),
  authMiddleware,
  zValidator("query", detectionUploadSchema),
  async (c) => {
    const query = c.req.valid("query");

    // Parse multipart form data
    const body = await c.req.parseBody();
    const imageFile = body.image as File;

    if (!imageFile) {
      return c.json(
        response.error("Không tìm thấy file ảnh", "MISSING_IMAGE"),
        400,
      );
    }

    // Validate file type
    if (!imageFile.type.startsWith("image/")) {
      return c.json(
        response.error("File phải là ảnh", "INVALID_FILE_TYPE"),
        400,
      );
    }

    // Validate file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return c.json(
        response.error(
          "Kích thước ảnh không được vượt quá 10MB",
          "FILE_TOO_LARGE",
        ),
        400,
      );
    }

    // Convert to buffer with size optimization
    // Use chunks to avoid loading entire file into memory at once
    const arrayBuffer = await imageFile.arrayBuffer();

    // Check actual size before converting
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      return c.json(
        response.error("File quá lớn sau khi xử lý", "FILE_TOO_LARGE"),
        400,
      );
    }

    const imageBuffer = Buffer.from(arrayBuffer);

    // Detect ingredients with optional provider
    const result = await detectIngredients(imageBuffer, {
      maxResults: query.maxResults,
      confidenceThreshold: query.confidenceThreshold,
    });

    return c.json(
      response.success({
        detectedIngredients: result.detectedIngredients,
        totalDetected: result.detectedIngredients.length,
      }),
    );
  },
);

export { detectionRoutes };
