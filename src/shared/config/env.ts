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

  // Email Configuration (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Cookora <noreply@cookora.vn>"), // Allow "Name <email>" format
  APP_URL: z.url().default("http://localhost:3000"),
  FRONTEND_URL: z.url().default("http://localhost:5173"), // Frontend app URL for redirects

  // Optional fields with secure defaults
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // R2 Storage Configuration (Cloudflare R2)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(), // CDN URL for serving files
});

export const env = envSchema.parse(process.env);
export type EnvType = z.infer<typeof envSchema>;

// Export for type-safe context access
export const getEnvForContext = () => env;
