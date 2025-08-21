import { BaseAuthProvider } from './base.provider'
import { EmailAuthProvider } from './email.provider'
import { GoogleAuthProvider } from './google.provider'


class ProviderRegistry {
    private providers = new Map<string, BaseAuthProvider>()

    register(name: string, provider: BaseAuthProvider) {
        this.providers.set(name, provider)
    }

    get(name: string): BaseAuthProvider {
        const provider = this.providers.get(name)
        if (!provider) {
            throw new Error(`Auth provider '${name}' not found`)
        }
        return provider
    }

    has(name: string): boolean {
        return this.providers.has(name)
    }

    list(): string[] {
        return Array.from(this.providers.keys())
    }
}

// Create singleton registry
export const providerRegistry = new ProviderRegistry()

// Register built-in providers
providerRegistry.register('email', new EmailAuthProvider())
providerRegistry.register('google', new GoogleAuthProvider())

// Export provider instances for direct access
export const emailProvider = providerRegistry.get('email') as EmailAuthProvider
export const googleProvider = providerRegistry.get('google') as GoogleAuthProvider 