import { z } from 'zod'

/**
 * Auth Domain Schemas - Authentication related validations
 * Handles: registration, login, email verification, password management
 */

// Common field schemas
export const emailSchema = z.string().email('Email không hợp lệ')
export const strongPasswordSchema = z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
    )

// User registration
export const userRegistrationSchema = z.object({
    name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100),
    email: emailSchema,
    password: strongPasswordSchema,
})

// Email verification
export const verifyEmailRequestSchema = z.object({
    token: z.string().min(1, 'Verification token is required'),
})

// Forgot password
export const forgotPasswordRequestSchema = z.object({
    email: emailSchema,
})

// Reset password
export const resetPasswordRequestSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: strongPasswordSchema,
})

// Export types
export type UserRegistration = z.infer<typeof userRegistrationSchema>
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>
