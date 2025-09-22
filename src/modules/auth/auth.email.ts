import { db } from "@/shared/database/connection";
import { users, authProviders } from "@/shared/database/schema";
import { eq, and } from "drizzle-orm";
import { providerRegistry } from "./providers";
import { EmailAuthProvider } from "./providers/email.provider";
import { emailService } from "@/shared/services/email.service";

/**
 * Authentication Email Management - Email verification and password reset
 * Handles: email verification, password reset flow
 */

/**
 * Verify email với token
 */
export async function verifyEmail(token: string): Promise<boolean> {
  const emailProvider = providerRegistry.get("email") as EmailAuthProvider;
  const isValid = await emailProvider.verifyEmail(token);

  if (isValid) {
    // Update user email_verified status
    const [authProvider] = await db
      .select()
      .from(authProviders)
      .where(eq(authProviders.verificationToken, token))
      .limit(1);

    if (authProvider) {
      // Update user as verified
      const [updatedUser] = await db
        .update(users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, authProvider.userId))
        .returning();

      // Send welcome email
      if (updatedUser) {
        await emailService.sendWelcomeEmail(
          updatedUser.email,
          updatedUser.name,
        );
      }
    }
  }

  return isValid;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const emailProvider = providerRegistry.get("email") as EmailAuthProvider;
  const resetToken = await emailProvider.resetPassword(email);

  // Only send email if token was generated (user exists)
  if (resetToken) {
    // Get user info for email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      await emailService.sendPasswordResetEmail(email, resetToken, user.name);
    }
  }
}

/**
 * Reset password với token
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const emailProvider = providerRegistry.get("email") as EmailAuthProvider;
  await emailProvider.confirmResetPassword(token, newPassword);
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<boolean> {
  // Find user and their auth provider
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || user.emailVerified) {
    return false; // User not found or already verified
  }

  // Find auth provider
  const [authProvider] = await db
    .select()
    .from(authProviders)
    .where(
      and(
        eq(authProviders.userId, user.id),
        eq(authProviders.provider, "email"),
      ),
    )
    .limit(1);

  if (!authProvider) {
    return false;
  }

  // Generate new verification token
  const verificationToken = crypto.randomUUID();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Update auth provider with new token
  await db
    .update(authProviders)
    .set({
      verificationToken,
      verificationExpires,
      updatedAt: new Date(),
    })
    .where(eq(authProviders.id, authProvider.id));

  // Send verification email
  await emailService.sendVerificationEmail(email, verificationToken, user.name);

  return true;
}
