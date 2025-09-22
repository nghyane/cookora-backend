import { z } from "zod";

const envSchema = z.object({
  // Server configuration
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3000),

  // Security: Required fields, no defaults for sensitive data
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // Google OAuth (optional for development)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // AI Provider Configuration
  AI_PROVIDER: z.enum(["openai", "gemini"]).optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // Optional fields with secure defaults
  REDIS_URL: z.string().default("redis://localhost:6379"),
});

export const env = envSchema.parse(process.env);
export type EnvType = z.infer<typeof envSchema>;

// Export for type-safe context access
export const getEnvForContext = () => env;
