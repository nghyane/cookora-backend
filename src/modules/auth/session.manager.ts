import { db } from "@/shared/database/connection";
import { sessions, users } from "@/shared/database/schema";
import { eq, and, lt, gt, desc } from "drizzle-orm";
import { env } from "@/shared/config/env";
import { sign, verify } from "hono/jwt";
import { createHash } from "crypto";
import type { UserRole } from "@/shared/database/schema/types";

interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole; // Use proper type from database schema
  // iat and exp are handled by hono/jwt automatically
}

interface SessionData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class SessionManager {
  private readonly jwtSecret: string;
  private readonly tokenExpiry: number = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.jwtSecret = env.JWT_SECRET;
  }

  /**
   * Hash token for secure storage in database
   */
  private hashToken(token: string): string {
    return createHash("sha256")
      .update(token + this.jwtSecret) // Add salt for extra security
      .digest("hex");
  }

  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.tokenExpiry);

    // Create JWT payload
    const payload = {
      userId,
      email: "", // Will be filled after user lookup
      role: "user", // Default role, will be filled after user lookup
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    // Get user email and role for JWT
    const [user] = await db
      .select({
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (user) {
      payload.email = user.email;
      payload.role = user.role;
    }

    // Generate JWT using hono/jwt
    const token = await sign(payload, this.jwtSecret);

    // Hash token before storing for security
    const hashedToken = this.hashToken(token);

    // Store session in database with hashed token
    const [session] = await db
      .insert(sessions)
      .values({
        userId,
        token: hashedToken, // Store hash instead of raw token
        expiresAt,
        ipAddress,
        userAgent,
      })
      .returning();

    return { token, expiresAt }; // Return raw token to user
  }

  async validateToken(
    token: string,
  ): Promise<(JWTPayload & { exp: number; iat: number }) | null> {
    try {
      // Verify JWT using hono/jwt
      const payload = await verify(token, this.jwtSecret);

      // Hash token to find in database
      const hashedToken = this.hashToken(token);

      // Check if session exists in database using hashed token
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, hashedToken))
        .limit(1);

      if (!session) {
        return null;
      }

      // Check if session is expired in DB (additional safety)
      if (new Date() > session.expiresAt) {
        // Clean up expired session
        await this.revokeSession(token);
        return null;
      }

      return payload as unknown as JWTPayload & { exp: number; iat: number };
    } catch {
      return null;
    }
  }

  async revokeSession(token: string): Promise<void> {
    // Hash token to find in database
    const hashedToken = this.hashToken(token);
    await db.delete(sessions).where(eq(sessions.token, hashedToken));
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    return db
      .select()
      .from(sessions)
      .where(
        and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())),
      )
      .orderBy(desc(sessions.createdAt));
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
