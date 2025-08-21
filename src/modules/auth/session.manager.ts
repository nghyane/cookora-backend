import { db } from '@/shared/database/connection'
import { sessions, users } from '@/shared/database/schema'
import { eq, and, lt, gt, desc } from 'drizzle-orm'
import { env } from '@/shared/config/env'
import { sign, verify } from 'hono/jwt'

interface JWTPayload {
    userId: string
    email: string
    // iat and exp are handled by hono/jwt automatically
}

interface SessionData {
    id: string
    userId: string
    token: string
    expiresAt: Date
    ipAddress?: string
    userAgent?: string
}

export class SessionManager {
    private readonly jwtSecret: string
    private readonly tokenExpiry: number = 7 * 24 * 60 * 60 * 1000 // 7 days

    constructor() {
        this.jwtSecret = env.JWT_SECRET
    }

    async createSession(
        userId: string,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<{ token: string; expiresAt: Date }> {
        const now = new Date()
        const expiresAt = new Date(now.getTime() + this.tokenExpiry)

        // Create JWT payload
        const payload = {
            userId,
            email: '', // Will be filled after user lookup
            exp: Math.floor(expiresAt.getTime() / 1000),
        }

        // Get user email for JWT
        const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
        if (user) {
            payload.email = user.email
        }

        // Generate JWT using hono/jwt
        const token = await sign(payload, this.jwtSecret)

        // Store session in database
        const [session] = await db
            .insert(sessions)
            .values({
                userId,
                token,
                expiresAt,
                ipAddress,
                userAgent,
            })
            .returning()

        return { token, expiresAt }
    }

    async validateToken(token: string): Promise<(JWTPayload & { exp: number; iat: number }) | null> {
        try {
            // Verify JWT using hono/jwt
            const payload = await verify(token, this.jwtSecret)

            // Check if session exists in database
            const [session] = await db
                .select()
                .from(sessions)
                .where(eq(sessions.token, token))
                .limit(1)

            if (!session) {
                return null
            }

            // Check if session is expired in DB (additional safety)
            if (new Date() > session.expiresAt) {
                // Clean up expired session
                await this.revokeSession(token)
                return null
            }

            return payload as unknown as (JWTPayload & { exp: number; iat: number })
        } catch {
            return null
        }
    }

    async revokeSession(token: string): Promise<void> {
        await db.delete(sessions).where(eq(sessions.token, token))
    }

    async revokeAllUserSessions(userId: string): Promise<void> {
        await db.delete(sessions).where(eq(sessions.userId, userId))
    }

    async getUserSessions(userId: string): Promise<SessionData[]> {
        return db
            .select()
            .from(sessions)
            .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
            .orderBy(desc(sessions.createdAt))
    }

    async cleanupExpiredSessions(): Promise<void> {
        await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
    }
}

// Export singleton instance
export const sessionManager = new SessionManager() 