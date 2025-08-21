// Base provider interface for extensible authentication
export interface AuthResult {
    providerId: string
    email: string
    name: string
    avatarUrl?: string
    emailVerified: boolean
    providerData?: Record<string, any>
}

export interface UserInfo {
    id: string
    email: string
    name: string
    avatarUrl?: string
}

export abstract class BaseAuthProvider {
    abstract readonly name: string

    abstract authenticate(credentials: any): Promise<AuthResult>

    async getUserInfo?(token: string): Promise<UserInfo> {
        throw new Error('Get user info not supported by this provider')
    }

    // Optional methods for providers that need them
    async verifyEmail?(token: string): Promise<boolean> {
        throw new Error('Email verification not supported by this provider')
    }

    async resetPassword?(email: string): Promise<string> {
        throw new Error('Password reset not supported by this provider')
    }

    async changePassword?(userId: string, oldPassword: string, newPassword: string): Promise<void> {
        throw new Error('Password change not supported by this provider')
    }
} 