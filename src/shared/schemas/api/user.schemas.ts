import { z } from 'zod'

import { emailSchema, strongPasswordSchema } from './auth.schemas'

/**
 * User Domain Schemas - User management related validations  
 * Handles: profile updates, password changes
 */

// Update user profile
export const updateUserProfileSchema = z.object({
    name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100).optional(),
    email: z.string().email('Email không hợp lệ').optional(),
    avatarUrl: z.string().url('Avatar phải là URL hợp lệ').optional(),
})

// Change password
export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống'),
        newPassword: strongPasswordSchema,
        confirmPassword: z.string().min(1, 'Xác nhận mật khẩu không được để trống'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Mật khẩu xác nhận không khớp',
        path: ['confirmPassword'],
    })

// Export types
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>
export type ChangePassword = z.infer<typeof changePasswordSchema>
