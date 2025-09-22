import type { Context, Next } from "hono";
import { sessionManager } from "@/modules/auth/session.manager";
import { response } from "@/shared/utils/response";
import { db } from "@/shared/database/connection";
import { users } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import { UnauthorizedError } from "@/shared/utils/errors";
import type { UserRole } from "@/shared/database/schema/types";

// Extend Hono context to include user
declare module "hono" {
  interface ContextVariableMap {
    user: {
      userId: string;
      email: string;
      role: UserRole;
    };
  }
}

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Yêu cầu header Authorization");
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  if (!token) {
    throw new UnauthorizedError("Yêu cầu token");
  }

  // Validate token using session manager
  const payload = await sessionManager.validateToken(token);

  if (!payload) {
    throw new UnauthorizedError("Token không hợp lệ hoặc đã hết hạn");
  }

  // No need to query database - role is now in JWT payload
  // This saves one DB query per authenticated request

  // Set user context for use in controllers
  c.set("user", {
    userId: payload.userId,
    email: payload.email,
    role: payload.role, // Get role directly from JWT payload
  });

  await next();
};

// Optional middleware for routes that work with or without auth
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    try {
      const payload = await sessionManager.validateToken(token);

      if (payload) {
        // No need to query database - role is now in JWT payload
        c.set("user", {
          userId: payload.userId,
          email: payload.email,
          role: payload.role, // Get role directly from JWT payload
        });
      }
    } catch {
      // Ignore auth errors for optional middleware
    }
  }

  await next();
};
