import { BaseAuthProvider, type AuthResult } from './base.provider'

interface GoogleTokenResponse {
    access_token: string
    id_token: string
    expires_in: number
    scope: string
    token_type: string
}

interface GoogleUserInfo {
    id: string
    email: string
    verified_email: boolean
    name: string
    given_name: string
    family_name: string
    picture: string
    locale: string
}

export class GoogleAuthProvider extends BaseAuthProvider {
    readonly name = 'google'

    private clientId: string
    private clientSecret: string
    private redirectUri: string

    constructor() {
        super()
        this.clientId = process.env.GOOGLE_CLIENT_ID || ''
        this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
        this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/v1/auth/google/callback'
    }

    getAuthUrl(): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'online',
        })

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    }

    async authenticate(credentials: { code: string }): Promise<AuthResult> {
        const { code } = credentials

        // Exchange code for tokens
        const tokenResponse = await this.exchangeCodeForTokens(code)

        // Get user info
        const userInfo = await this.fetchUserInfo(tokenResponse.access_token)

        return {
            providerId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            avatarUrl: userInfo.picture,
            emailVerified: userInfo.verified_email,
            providerData: {
                locale: userInfo.locale,
                given_name: userInfo.given_name,
                family_name: userInfo.family_name,
            },
        }
    }

    private async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: this.redirectUri,
                grant_type: 'authorization_code',
            }),
        })

        if (!response.ok) {
            throw new Error('Failed to exchange code for tokens')
        }

        return response.json() as Promise<GoogleTokenResponse>
    }

    private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })

        if (!response.ok) {
            throw new Error('Failed to fetch user info from Google')
        }

        return response.json() as Promise<GoogleUserInfo>
    }
} 