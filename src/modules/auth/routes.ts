import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";
import { z } from "zod";

import { authMiddleware } from "@/shared/middleware/auth";
import { providerRegistry } from "./providers";
import { response } from "@/shared/utils/response";
import { env } from "@/shared/config/env";
import {
  BadRequestError,
  ValidationError,
  InvalidTokenError,
  UserExistsError,
  UnauthorizedError,
  ConflictError,
} from "@/shared/utils/errors";
import {
  verifyEmailRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  userRegistrationSchema,
  emailLoginSchema,
  googleLoginSchema,
} from "@/shared/schemas/api/auth.schemas";

// Static imports for better performance
import { authenticateUser, registerUser } from "./auth.core";
import {
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  resendVerificationEmail,
} from "./auth.email";
import { logoutUser, logoutAllUserSessions } from "./auth.sessions";
import { linkProvider, unlinkProvider } from "./auth.providers";

const AUTH_TAG = "Authentication";
const authRoutes = new Hono();

// List available providers
authRoutes.get(
  "/providers",
  describeRoute({
    summary: "Lấy danh sách providers hỗ trợ",
    tags: [AUTH_TAG],
  }),
  (c) => {
    const providers = providerRegistry.list();
    return c.json(response.success({ providers }, "Available providers"));
  },
);

// Generic provider login endpoint
authRoutes.post(
  "/:provider/login",
  describeRoute({
    summary: "Đăng nhập với provider",
    tags: [AUTH_TAG],
    description: "Hỗ trợ email/password và OAuth providers",
  }),
  zValidator(
    "param",
    z.object({
      provider: z.enum(["email", "google"]).meta({ example: "email" }),
    }),
  ),
  zValidator(
    "json",
    z.union([emailLoginSchema, googleLoginSchema]).or(z.any()),
  ),
  async (c) => {
    const provider = c.req.valid("param").provider;
    const body = c.req.valid("json");

    if (!providerRegistry.has(provider)) {
      throw new BadRequestError(
        "Provider không được hỗ trợ",
        "INVALID_PROVIDER",
      );
    }

    // Handle email login validation
    if (provider === "email") {
      if (!body.email || !body.password) {
        throw new ValidationError("Yêu cầu email và mật khẩu");
      }
    }

    const ipAddress = c.req.header("x-forwarded-for");
    const userAgent = c.req.header("user-agent");

    // Let authenticateUser handle its own errors properly
    const { user, token, expiresAt } = await authenticateUser(
      provider,
      body,
      ipAddress,
      userAgent,
    );

    return c.json(
      response.success({ user, token, expiresAt }, "Đăng nhập thành công"),
    );
  },
);

// OAuth callback endpoint
authRoutes.get(
  "/:provider/callback",
  describeRoute({
    summary: "OAuth callback endpoint",
    tags: [AUTH_TAG],
    description: "Handles OAuth callbacks from providers like Google",
  }),
  zValidator(
    "param",
    z.object({
      provider: z.enum(["google"]),
    }),
  ),
  async (c) => {
    const provider = c.req.valid("param").provider;

    if (provider !== "google") {
      throw new BadRequestError(
        "Provider không được hỗ trợ",
        "INVALID_PROVIDER",
      );
    }

    const code = c.req.query("code");
    if (!code) {
      throw new BadRequestError("Yêu cầu authorization code", "MISSING_CODE");
    }

    // Let authenticateUser handle its own errors properly
    const { user, token, expiresAt } = await authenticateUser(provider, {
      code,
    });
    return c.json(
      response.success({ user, token, expiresAt }, "Đăng nhập thành công"),
    );
  },
);

// Email registration
authRoutes.post(
  "/register",
  describeRoute({
    summary: "Đăng ký tài khoản email",
    tags: [AUTH_TAG],
  }),
  zValidator("json", userRegistrationSchema),
  async (c) => {
    const body = c.req.valid("json");

    // Zod validation already ensures required fields
    const { user, verificationToken } = await registerUser(
      body.email,
      body.password,
      body.name,
    );

    // TODO: Send verification email with the token
    return c.json(
      response.success(
        { user },
        "Đăng ký thành công. Vui lòng kiểm tra email để xác thực.",
      ),
      201,
    );
  },
);

// Email verification - GET route for clicking link from email
authRoutes.get(
  "/verify-email",
  describeRoute({
    summary: "Xác thực email qua link",
    tags: [AUTH_TAG],
  }),
  zValidator(
    "query",
    z.object({
      token: z.string().min(1, "Token is required"),
    }),
  ),
  async (c) => {
    const { token } = c.req.valid("query");

    const isVerified = await verifyEmail(token);

    if (!isVerified) {
      // Redirect to frontend with error status
      return c.redirect(
        `${env.FRONTEND_URL}/auth/verify-email?status=error&message=invalid_token`,
        301,
      );
    }

    // Redirect to frontend with success status
    return c.redirect(
      `${env.FRONTEND_URL}/auth/verify-email?status=success`,
      301,
    );
  },
);

// Email verification - POST route for API calls
authRoutes.post(
  "/verify-email",
  describeRoute({
    summary: "Xác thực email qua API",
    tags: [AUTH_TAG],
  }),
  zValidator("json", verifyEmailRequestSchema),
  async (c) => {
    const body = c.req.valid("json");

    // Zod validation already ensures token is present
    const isVerified = await verifyEmail(body.token);

    if (!isVerified) {
      throw new InvalidTokenError(
        "Token xác thực không hợp lệ hoặc đã hết hạn",
      );
    }

    return c.json(response.success(null, "Xác thực email thành công"));
  },
);

// Resend verification email
authRoutes.post(
  "/resend-verification",
  describeRoute({
    summary: "Gửi lại email xác thực",
    tags: [AUTH_TAG],
  }),
  zValidator("json", forgotPasswordRequestSchema), // Reuse schema - only needs email
  async (c) => {
    const body = c.req.valid("json");

    const success = await resendVerificationEmail(body.email);

    if (!success) {
      return c.json(
        response.success(null, "Email đã được xác thực hoặc không tồn tại."),
      );
    }

    return c.json(
      response.success(
        null,
        "Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư của bạn.",
      ),
    );
  },
);

// Password reset flow
authRoutes.post(
  "/forgot-password",
  describeRoute({
    summary: "Yêu cầu đặt lại mật khẩu",
    tags: [AUTH_TAG],
  }),
  zValidator("json", forgotPasswordRequestSchema),
  async (c) => {
    const body = c.req.valid("json");

    // Zod validation already ensures email is present
    await requestPasswordReset(body.email);
    return c.json(
      response.success(
        null,
        "Nếu email tồn tại, một email đặt lại mật khẩu đã được gửi.",
      ),
    );
  },
);

authRoutes.post(
  "/reset-password",
  describeRoute({
    summary: "Đặt lại mật khẩu",
    tags: [AUTH_TAG],
  }),
  zValidator("json", resetPasswordRequestSchema),
  async (c) => {
    const body = c.req.valid("json");

    // Zod validation already ensures required fields
    await resetPassword(body.token, body.newPassword);
    return c.json(response.success(null, "Đặt lại mật khẩu thành công"));
  },
);

// Session management
authRoutes.post(
  "/logout",
  describeRoute({
    summary: "Đăng xuất",
    tags: [AUTH_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  async (c) => {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.substring(7);

    if (token) {
      await logoutUser(token);
    }
    return c.json(
      response.success({ loggedOut: true }, "Đăng xuất thành công"),
    );
  },
);

authRoutes.post(
  "/logout-all",
  describeRoute({
    summary: "Đăng xuất tất cả thiết bị",
    tags: [AUTH_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  async (c) => {
    const user = c.get("user");
    await logoutAllUserSessions(user.userId);
    return c.json(
      response.success(null, "Đã đăng xuất khỏi tất cả các thiết bị"),
    );
  },
);

// Provider management (link/unlink additional auth methods)
authRoutes.post(
  "/link/:provider",
  describeRoute({
    summary: "Liên kết provider mới",
    tags: [AUTH_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator(
    "param",
    z.object({
      provider: z.enum(["email", "google"]),
    }),
  ),
  zValidator("json", z.any()),
  async (c) => {
    const user = c.get("user");
    const provider = c.req.valid("param").provider;
    const body = c.req.valid("json");

    if (!providerRegistry.has(provider)) {
      throw new BadRequestError(
        "Provider không được hỗ trợ",
        "INVALID_PROVIDER",
      );
    }

    // Let linkProvider handle its own errors properly
    await linkProvider(user.userId, provider, body);
    return c.json(
      response.success(null, `Đã liên kết thành công với ${provider}`),
    );
  },
);

authRoutes.delete(
  "/unlink/:provider",
  describeRoute({
    summary: "Hủy liên kết provider",
    tags: [AUTH_TAG],
    security: [{ Bearer: [] }],
  }),
  authMiddleware,
  zValidator(
    "param",
    z.object({
      provider: z.enum(["email", "google"]),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const provider = c.req.valid("param").provider;

    await unlinkProvider(user.userId, provider);
    return c.json(response.success(null, `Đã hủy liên kết với ${provider}`));
  },
);

export { authRoutes };
