import { db } from '@/shared/database/connection'
import { authProviders } from '@/shared/database/schema'
import { eq, and } from 'drizzle-orm'
import { BaseAuthProvider, type AuthResult } from './base.provider'

export class EmailAuthProvider extends BaseAuthProvider {
    readonly name = 'email'

    async authenticate(credentials: { email: string; password: string }): Promise<AuthResult> {
        const { email, password } = credentials

        // Find auth provider record
        const [authProvider] = await db
            .select()
            .from(authProviders)
            .where(and(eq(authProviders.provider, 'email'), eq(authProviders.providerId, email)))
            .limit(1)

        if (!authProvider || !authProvider.passwordHash) {
            throw new Error('Invalid email or password')
        }

        // Use Bun's built-in password verification
        const isValid = await Bun.password.verify(password, authProvider.passwordHash)
        if (!isValid) {
            throw new Error('Invalid email or password')
        }

        return {
            providerId: email,
            email,
            name: email.split('@')[0], // Default name from email
            emailVerified: authProvider.verificationToken === null,
            providerData: {},
        }
    }

    async register(data: {
        email: string
        password: string
        name: string
        userId: string
    }): Promise<{ authResult: AuthResult; verificationToken: string }> {
        const { email, password, name, userId } = data

        // Check if email already exists
        const [existing] = await db
            .select()
            .from(authProviders)
            .where(and(eq(authProviders.provider, 'email'), eq(authProviders.providerId, email)))
            .limit(1)

        if (existing) {
            throw new Error('Email already registered')
        }

        // Hash password using Bun's built-in hasher
        const passwordHash = await Bun.password.hash(password)

        // Generate verification token
        const verificationToken = crypto.randomUUID()
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        // Create auth provider record
        // ✅ AUTO-VERIFY for development/testing
        await db.insert(authProviders).values({
            userId,
            provider: 'email',
            providerId: email,
            passwordHash,
            verificationToken: null, // Auto-verified
            verificationExpires: null,
        })

        return {
            authResult: {
                providerId: email,
                email,
                name,
                emailVerified: false,
                providerData: {},
            },
            verificationToken,
        }
    }

    async verifyEmail(token: string): Promise<boolean> {
        const [authProvider] = await db
            .select()
            .from(authProviders)
            .where(eq(authProviders.verificationToken, token))
            .limit(1)

        if (!authProvider || !authProvider.verificationExpires) {
            return false
        }

        if (new Date() > authProvider.verificationExpires) {
            return false
        }

        // Clear verification token
        await db
            .update(authProviders)
            .set({
                verificationToken: null,
                verificationExpires: null,
                updatedAt: new Date(),
            })
            .where(eq(authProviders.id, authProvider.id))

        return true
    }

    async resetPassword(email: string): Promise<string> {
        const [authProvider] = await db
            .select()
            .from(authProviders)
            .where(and(eq(authProviders.provider, 'email'), eq(authProviders.providerId, email)))
            .limit(1)

        if (!authProvider) {
            // Don't reveal if email exists
            return ''
        }

        const resetToken = crypto.randomUUID()
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        await db
            .update(authProviders)
            .set({
                resetToken,
                resetExpires,
                updatedAt: new Date(),
            })
            .where(eq(authProviders.id, authProvider.id))

        return resetToken
    }

    async confirmResetPassword(token: string, newPassword: string): Promise<void> {
        const [authProvider] = await db
            .select()
            .from(authProviders)
            .where(eq(authProviders.resetToken, token))
            .limit(1)

        if (!authProvider || !authProvider.resetExpires) {
            throw new Error('Invalid or expired reset token')
        }

        if (new Date() > authProvider.resetExpires) {
            throw new Error('Reset token has expired')
        }

        const passwordHash = await Bun.password.hash(newPassword)

        await db
            .update(authProviders)
            .set({
                passwordHash,
                resetToken: null,
                resetExpires: null,
                updatedAt: new Date(),
            })
            .where(eq(authProviders.id, authProvider.id))
    }

    async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
        const [authProvider] = await db
            .select()
            .from(authProviders)
            .where(and(eq(authProviders.userId, userId), eq(authProviders.provider, 'email')))
            .limit(1)

        if (!authProvider || !authProvider.passwordHash) {
            throw new Error('Password authentication not found')
        }

        const isValid = await Bun.password.verify(oldPassword, authProvider.passwordHash)
        if (!isValid) {
            throw new Error('Current password is incorrect')
        }

        const passwordHash = await Bun.password.hash(newPassword)

        await db
            .update(authProviders)
            .set({
                passwordHash,
                updatedAt: new Date(),
            })
            .where(eq(authProviders.id, authProvider.id))
    }
} 