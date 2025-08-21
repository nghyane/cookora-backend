import { sessionManager } from './session.manager'

/**
 * Authentication Session Management - Session handling
 * Handles: logout, logout all sessions
 */

/**
 * Logout user
 */
export async function logoutUser(token: string): Promise<void> {
    await sessionManager.revokeSession(token)
}

/**
 * Logout all user sessions
 */
export async function logoutAllUserSessions(userId: string): Promise<void> {
    await sessionManager.revokeAllUserSessions(userId)
}
