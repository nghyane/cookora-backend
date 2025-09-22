import { S3Client } from "bun";
import { db } from "@/shared/database/connection";
import { media } from "@/shared/database/schema";
import { env } from "@/shared/config/env";
import { eq } from "drizzle-orm";

// Simple R2 client
const r2 = env.R2_ACCESS_KEY_ID && env.R2_BUCKET_NAME
  ? new S3Client({
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      bucket: env.R2_BUCKET_NAME,
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    })
  : null;

export const mediaService = {
  async upload(file: File, category: string, userId: string) {
    if (!r2) throw new Error('R2 not configured');

    // Simple unique key
    const ext = file.name.split('.').pop() || 'jpg';
    const key = `${category}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload to R2
    await r2.file(key).write(file);

    // Save to DB
    const [record] = await db.insert(media).values({
      url: `${env.R2_PUBLIC_URL}/${key}`,
      key,
      category: category as any,
      type: file.type.startsWith('image/') ? 'image' : 'document',
      size: file.size,
      userId,
    }).returning();

    return { id: record.id, url: record.url };
  },

  async delete(mediaId: string, userId: string) {
    if (!r2) throw new Error('R2 not configured');

    // Get record
    const record = await db.query.media.findFirst({
      where: eq(media.id, mediaId),
    });

    if (!record || record.userId !== userId) {
      throw new Error('Not found or unauthorized');
    }

    // Delete from R2 and DB
    await r2.file(record.key).delete();
    await db.delete(media).where(eq(media.id, mediaId));
  }
};
