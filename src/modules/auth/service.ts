import { db } from '@/shared/database/connection'
import { users, authProviders } from '@/shared/database/schema'
import { eq, and, or } from 'drizzle-orm'
import { providerRegistry } from './providers'
import type { AuthResult } from './providers/base.provider'
import { sessionManager } from './session.manager'
import { EmailAuthProvider } from './providers/email.provider'
import { ConflictError, ForbiddenError, UserExistsError } from '@/shared/utils/errors'

interface AuthResponse {
  user: {
    id: string
    email: string
    name: string
    avatarUrl?: string
    emailVerified: boolean
  }
  token: string
  expiresAt: Date
}

export class AuthService {
  async authenticate(
    provider: string,
    credentials: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    // Get provider instance
    const authProvider = providerRegistry.get(provider)

    // Authenticate with provider
    const authResult = await authProvider.authenticate(credentials)

    // Find or create user
    const user = await this.findOrCreateUser(provider, authResult)

    // Create session
    const session = await sessionManager.createSession(user.id, ipAddress, userAgent)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      },
      token: session.token,
      expiresAt: session.expiresAt,
    }
  }

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<{ user: typeof users.$inferSelect & { providers: string[] }; verificationToken: string }> {
    const emailProvider = providerRegistry.get('email') as EmailAuthProvider

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email)
    if (existingUser) {
      throw new UserExistsError('Email đã được đăng ký')
    }

    // Create user first
    const [user] = await db
      .insert(users)
      .values({
        email,
        name,
        emailVerified: false, // Will be set to true after email verification
      })
      .returning()

    // Register with email provider (now with valid userId)
    const { authResult, verificationToken } = await emailProvider.register({
      email,
      password,
      name,
      userId: user.id,
    })

    return {
      user: {
        ...user,
        providers: ['email'],
      },
      verificationToken,
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
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

  async requestPasswordReset(email: string): Promise<void> {
    const emailProvider = providerRegistry.get('email') as EmailAuthProvider
    await emailProvider.resetPassword(email)
    // In real app, send email with reset link
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const emailProvider = providerRegistry.get('email') as EmailAuthProvider
    await emailProvider.confirmResetPassword(token, newPassword)
  }

  async linkProvider(
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

  async unlinkProvider(userId: string, provider: string): Promise<void> {
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

  async logout(token: string): Promise<void> {
    await sessionManager.revokeSession(token)
  }

  async logoutAllSessions(userId: string): Promise<void> {
    await sessionManager.revokeAllUserSessions(userId)
  }

  private async findOrCreateUser(provider: string, authResult: AuthResult) {
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
    const existingUser = await this.findUserByEmail(authResult.email)

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

  private async findUserByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return user || null
  }
}

// Export singleton instance
export const authService = new AuthService()
