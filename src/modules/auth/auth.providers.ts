import { db } from '@/shared/database/connection'
import { authProviders } from '@/shared/database/schema'
import { eq, and } from 'drizzle-orm'
import { providerRegistry } from './providers'
import { ConflictError, ForbiddenError } from '@/shared/utils/errors'

/**
 * Authentication Provider Management - Provider linking/unlinking
 * Handles: linking providers, unlinking providers, provider conflicts
 */

/**
 * Link provider to existing user
 */
export async function linkProvider(
    userId: string,
    provider: string,
    credentials: any,
): Promise<void> {
    // Check if provider already linked
    const [existing] = await db
        .select()
        .from(authProviders)
        .where(and(eq(authProviders.userId, userId), eq(authProviders.provider, provider)))
        .limit(1)

    if (existing) {
        throw new ConflictError('Provider đã được liên kết với tài khoản này')
    }

    // Authenticate with new provider
    const authProvider = providerRegistry.get(provider)
    const authResult = await authProvider.authenticate(credentials)

    // Check if this provider ID is already used by another user
    const [conflicting] = await db
        .select()
        .from(authProviders)
        .where(
            and(
                eq(authProviders.provider, provider),
                eq(authProviders.providerId, authResult.providerId),
            ),
        )
        .limit(1)

    if (conflicting) {
        throw new ConflictError('Tài khoản này đã được liên kết với người dùng khác')
    }

    // Link provider
    await db.insert(authProviders).values({
        userId,
        provider,
        providerId: authResult.providerId,
        providerData: authResult.providerData,
    })
}

/**
 * Unlink provider from user
 */
export async function unlinkProvider(userId: string, provider: string): Promise<void> {
    // Check if user has other auth methods
    const userProviders = await db
        .select()
        .from(authProviders)
        .where(eq(authProviders.userId, userId))

    if (userProviders.length <= 1) {
        throw new ForbiddenError('Không thể hủy liên kết phương thức xác thực duy nhất')
    }

    await db
        .delete(authProviders)
        .where(and(eq(authProviders.userId, userId), eq(authProviders.provider, provider)))
}
