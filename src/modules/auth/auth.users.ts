import { db } from '@/shared/database/connection'
import { users, authProviders } from '@/shared/database/schema'
import { eq, and } from 'drizzle-orm'
import type { AuthResult } from './providers/base.provider'

/**
 * Authentication User Management - User utilities
 * Handles: finding users, creating users, user-provider relationships
 */

/**
 * Find user by email
 */
export async function findUserByEmail(email: string) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

    return user || null
}

/**
 * Find or create user based on provider authentication result
 */
export async function findOrCreateUser(provider: string, authResult: AuthResult) {
    // First, try to find user by provider ID
    const [existingProvider] = await db
        .select()
        .from(authProviders)
        .innerJoin(users, eq(authProviders.userId, users.id))
        .where(
            and(
                eq(authProviders.provider, provider),
                eq(authProviders.providerId, authResult.providerId),
            ),
        )
        .limit(1)

    if (existingProvider) {
        // Update user info if needed
        const [updatedUser] = await db
            .update(users)
            .set({
                name: authResult.name,
                avatarUrl: authResult.avatarUrl,
                emailVerified: authResult.emailVerified || existingProvider.users.emailVerified,
                updatedAt: new Date(),
            })
            .where(eq(users.id, existingProvider.users.id))
            .returning()

        return updatedUser
    }

    // Try to find user by email (for linking accounts)
    const existingUser = await findUserByEmail(authResult.email)

    if (existingUser) {
        // Link new provider to existing user
        await db.insert(authProviders).values({
            userId: existingUser.id,
            provider,
            providerId: authResult.providerId,
            providerData: authResult.providerData,
        })

        // Update user info
        const [updatedUser] = await db
            .update(users)
            .set({
                name: authResult.name,
                avatarUrl: authResult.avatarUrl,
                emailVerified: authResult.emailVerified || existingUser.emailVerified,
                updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id))
            .returning()

        return updatedUser
    }

    // Create new user
    const [newUser] = await db
        .insert(users)
        .values({
            email: authResult.email,
            name: authResult.name,
            avatarUrl: authResult.avatarUrl,
            emailVerified: authResult.emailVerified,
        })
        .returning()

    // Create auth provider record
    await db.insert(authProviders).values({
        userId: newUser.id,
        provider,
        providerId: authResult.providerId,
        providerData: authResult.providerData,
    })

    return newUser
}
