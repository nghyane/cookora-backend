import { db } from '@/shared/database/connection'
import { users, authProviders } from '@/shared/database/schema'
import { eq } from 'drizzle-orm'
import { providerRegistry } from './providers'
import { EmailAuthProvider } from './providers/email.provider'

/**
 * Authentication Email Management - Email verification and password reset
 * Handles: email verification, password reset flow
 */

/**
 * Verify email với token
 */
export async function verifyEmail(token: string): Promise<boolean> {
    const emailProvider = providerRegistry.get('email') as EmailAuthProvider
    const isValid = await emailProvider.verifyEmail(token)

    if (isValid) {
        // Update user email_verified status
        const [authProvider] = await db
            .select()
            .from(authProviders)
            .where(eq(authProviders.verificationToken, token))
            .limit(1)

        if (authProvider) {
            await db
                .update(users)
                .set({ emailVerified: true, updatedAt: new Date() })
                .where(eq(users.id, authProvider.userId))
        }
    }

    return isValid
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
    const emailProvider = providerRegistry.get('email') as EmailAuthProvider
    await emailProvider.resetPassword(email)
    // In real app, send email with reset link
}

/**
 * Reset password với token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
    const emailProvider = providerRegistry.get('email') as EmailAuthProvider
    await emailProvider.confirmResetPassword(token, newPassword)
}
