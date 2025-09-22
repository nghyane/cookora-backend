import { S3Client } from "bun";
import { db } from "@/shared/database/connection";
import {
  media,
  users,
  type mediaCategoryEnum,
  type mediaTypeEnum,
} from "@/shared/database/schema";
import { AppError } from "@/shared/utils/errors";
import { env } from "@/shared/config/env";
import { eq } from "drizzle-orm";
import { logger } from "@/shared/utils/logger";

type MediaCategory = (typeof mediaCategoryEnum.enumValues)[number];
type MediaType = (typeof mediaTypeEnum.enumValues)[number];

// Initialize S3 client for R2
const r2Client =
  env.R2_ACCOUNT_ID &&
  env.R2_ACCESS_KEY_ID &&
  env.R2_SECRET_ACCESS_KEY &&
  env.R2_BUCKET_NAME
    ? new S3Client({
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        bucket: env.R2_BUCKET_NAME,
        endpoint:
          env.R2_PUBLIC_URL ||
          `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      })
    : null;

class MediaService {
  // Permission helpers
  private isUserContent(category: MediaCategory): boolean {
    return ["avatar", "community"].includes(category);
  }

  private isCuratedContent(category: MediaCategory): boolean {
    return ["recipe", "ingredient", "news", "tutorial"].includes(category);
  }

  private async canUserUpload(
    category: MediaCategory,
    userId: string,
  ): Promise<boolean> {
    if (this.isUserContent(category)) {
      return true; // All users can upload avatar and community content
    }

    if (this.isCuratedContent(category)) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      return user?.role === "admin" || user?.role === "staff";
    }

    return false;
  }

  private async canUserDelete(
    mediaRecord: typeof media.$inferSelect,
    userId: string,
  ): Promise<boolean> {
    const isOwner = mediaRecord.userId === userId;

    // User content: owner only
    if (this.isUserContent(mediaRecord.category)) {
      return isOwner;
    }

    // Curated content: staff/admin only
    if (this.isCuratedContent(mediaRecord.category)) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      return user?.role === "admin" || user?.role === "staff";
    }

    return false;
  }

  private generateKey(category: MediaCategory, fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return `${category}/${uniqueId}.${ext}`;
  }

  private getMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    return "document";
  }

  async upload(
    file: File,
    category: MediaCategory,
    userId: string,
  ): Promise<{ id: string; url: string }> {
    if (!r2Client) {
      throw new AppError("R2 storage not configured", 500, "R2_NOT_CONFIGURED");
    }

    if (!env.R2_PUBLIC_URL) {
      throw new AppError("R2 public URL not configured", 500, "R2_URL_MISSING");
    }

    // Check upload permission
    const canUpload = await this.canUserUpload(category, userId);
    if (!canUpload) {
      throw new AppError(
        `You don't have permission to upload to ${category}`,
        403,
        "UPLOAD_PERMISSION_DENIED",
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      throw new AppError("File size exceeds 10MB limit", 400, "FILE_TOO_LARGE");
    }

    // Validate file type based on category
    const allowedTypes: Record<MediaCategory, string[]> = {
      avatar: ["image/jpeg", "image/png", "image/webp"],
      recipe: ["image/jpeg", "image/png", "image/webp"],
      ingredient: ["image/jpeg", "image/png", "image/webp"],
      community: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      news: ["image/jpeg", "image/png", "image/webp"],
      tutorial: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
    };

    const categoryAllowedTypes = allowedTypes[category];
    if (!categoryAllowedTypes.includes(file.type)) {
      throw new AppError(
        `Invalid file type. Allowed: ${categoryAllowedTypes.join(", ")}`,
        400,
        "INVALID_FILE_TYPE",
      );
    }

    try {
      // Generate unique key
      const key = this.generateKey(category, file.name);

      // Upload to R2 using Bun's native S3 API
      const s3File = r2Client.file(key);
      await s3File.write(file, {
        type: file.type,
      });

      // Generate public URL
      const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

      // Save to database
      const [mediaRecord] = await db
        .insert(media)
        .values({
          url: publicUrl,
          key,
          category,
          type: this.getMediaType(file.type),
          size: file.size,
          mimeType: file.type,
          userId,
        })
        .returning();

      return {
        id: mediaRecord.id,
        url: mediaRecord.url,
      };
    } catch (error) {
      logger.error("Failed to upload media", {
        error: error instanceof Error ? error.message : "Unknown error",
        category,
        userId,
      });
      throw new AppError("Failed to upload media", 500, "UPLOAD_FAILED");
    }
  }

  async delete(mediaId: string, userId: string): Promise<void> {
    if (!r2Client) {
      throw new AppError("R2 storage not configured", 500, "R2_NOT_CONFIGURED");
    }

    // Get media record
    const mediaRecord = await db.query.media.findFirst({
      where: eq(media.id, mediaId),
    });

    if (!mediaRecord) {
      throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
    }

    // Check delete permission
    const canDelete = await this.canUserDelete(mediaRecord, userId);
    if (!canDelete) {
      throw new AppError(
        "You don't have permission to delete this media",
        403,
        "DELETE_PERMISSION_DENIED",
      );
    }

    try {
      // Delete from R2 using Bun's native S3 API
      const s3File = r2Client.file(mediaRecord.key);
      await s3File.delete();

      // Delete from database
      await db.delete(media).where(eq(media.id, mediaId));
    } catch (error) {
      logger.error("Failed to delete media", {
        error: error instanceof Error ? error.message : "Unknown error",
        mediaId,
      });
      throw new AppError("Failed to delete media", 500, "DELETE_FAILED");
    }
  }

  async getById(mediaId: string): Promise<typeof media.$inferSelect | null> {
    return await db.query.media.findFirst({
      where: eq(media.id, mediaId),
    });
  }
}

export const mediaService = new MediaService();
