import { db } from "@/shared/database/connection";
import { users, authProviders } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/shared/utils/errors";

/**
 * User Profiles - Profile management functionality
 * Handles: get profile, update profile, provider info
 */

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
  providers: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lấy profile đầy đủ của user bao gồm providers
 */
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  // Get user's auth providers
  const userProviders = await db
    .select({ provider: authProviders.provider })
    .from(authProviders)
    .where(eq(authProviders.userId, userId));

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    providers: userProviders.map((p) => p.provider),
  };
}

/**
 * Cập nhật thông tin profile của user
 */
export async function updateUserProfile(
  userId: string,
  updates: { name?: string; avatarUrl?: string },
): Promise<UserProfile> {
  const [user] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Get providers to return the full profile
  const userProviders = await db
    .select({ provider: authProviders.provider })
    .from(authProviders)
    .where(eq(authProviders.userId, userId));

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    providers: userProviders.map((p) => p.provider),
  };
}
