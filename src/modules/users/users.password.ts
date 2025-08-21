import { providerRegistry } from '@/modules/auth/providers'
import type { EmailAuthProvider } from '@/modules/auth/providers/email.provider'

/**
 * User Password - Password management functionality
 * Handles: change password via auth providers
 */

/**
 * Đổi mật khẩu của user thông qua email provider
 */
export async function changeUserPassword(
  userId: string, 
  oldPassword: string, 
  newPassword: string
): Promise<void> {
  const emailProvider = providerRegistry.get('email') as EmailAuthProvider
  // Let email provider handle its own errors - it already throws meaningful errors
  await emailProvider.changePassword(userId, oldPassword, newPassword)
}
