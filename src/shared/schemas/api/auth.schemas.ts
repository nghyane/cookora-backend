import { z } from "zod";
import { TEST_ACCOUNTS } from "@/shared/constants/test-accounts";

/**
 * Auth Domain Schemas - Authentication related validations
 * Handles: registration, login, email verification, password management
 */

// Common field schemas
export const emailSchema = z.email("Email không hợp lệ");
export const strongPasswordSchema = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 số",
  );

// User registration
export const userRegistrationSchema = z.object({
  name: z
    .string()
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(100)
    .meta({ example: "Nguyễn Thị Hoa" }),
  email: emailSchema.meta({ example: TEST_ACCOUNTS[0].email }),
  password: strongPasswordSchema.meta({ example: TEST_ACCOUNTS[0].password }),
});

// Email login
export const emailLoginSchema = z.object({
  email: emailSchema.meta({ example: TEST_ACCOUNTS[0].email }),
  password: z
    .string()
    .min(1, "Mật khẩu là bắt buộc")
    .meta({ example: TEST_ACCOUNTS[0].password }),
});

// Google OAuth login
export const googleLoginSchema = z.object({
  code: z
    .string()
    .min(1, "Authorization code is required")
    .meta({ example: "auth_code_from_google_oauth" }),
});

// Email verification
export const verifyEmailRequestSchema = z.object({
  token: z
    .string()
    .min(1, "Verification token is required")
    .meta({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
});

// Forgot password
export const forgotPasswordRequestSchema = z.object({
  email: emailSchema.meta({ example: TEST_ACCOUNTS[0].email }),
});

// Reset password
export const resetPasswordRequestSchema = z.object({
  token: z
    .string()
    .min(1, "Reset token is required")
    .meta({ example: "reset-token-12345" }),
  newPassword: strongPasswordSchema.meta({ example: "NewStrongPass456!" }),
});

// Export types
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type EmailLogin = z.infer<typeof emailLoginSchema>;
export type GoogleLogin = z.infer<typeof googleLoginSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
