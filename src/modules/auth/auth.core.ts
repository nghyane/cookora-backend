import { db } from "@/shared/database/connection";
import { users } from "@/shared/database/schema";
import { providerRegistry } from "./providers";
import { sessionManager } from "./session.manager";
import { EmailAuthProvider } from "./providers/email.provider";
import { UserExistsError } from "@/shared/utils/errors";
import { findOrCreateUser, findUserByEmail } from "./auth.users";
import { emailService } from "@/shared/services/email.service";

/**
 * Authentication Core - Main authentication functionality
 * Handles: user authentication, registration
 */

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    emailVerified: boolean;
  };
  token: string;
  expiresAt: Date;
}

/**
 * Authenticate user với provider
 */
export async function authenticateUser(
  provider: string,
  credentials: any,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthResponse> {
  // Get provider instance
  const authProvider = providerRegistry.get(provider);

  // Authenticate with provider
  const authResult = await authProvider.authenticate(credentials);

  // Find or create user
  const user = await findOrCreateUser(provider, authResult);

  // Create session
  const session = await sessionManager.createSession(
    user.id,
    ipAddress,
    userAgent,
  );

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
  };
}

/**
 * Register new user với email
 */
export async function registerUser(
  email: string,
  password: string,
  name: string,
): Promise<{
  user: typeof users.$inferSelect & { providers: string[] };
  verificationToken: string;
}> {
  const emailProvider = providerRegistry.get("email") as EmailAuthProvider;

  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new UserExistsError("Email đã được đăng ký");
  }

  // Create user first
  const [user] = await db
    .insert(users)
    .values({
      email,
      name,
      emailVerified: false, // Will be set to true after email verification
    })
    .returning();

  // Register with email provider (now with valid userId)
  const { authResult, verificationToken } = await emailProvider.register({
    email,
    password,
    name,
    userId: user.id,
  });

  // Send verification email
  await emailService.sendVerificationEmail(email, verificationToken, name);

  return {
    user: {
      ...user,
      providers: ["email"],
    },
    verificationToken,
  };
}
