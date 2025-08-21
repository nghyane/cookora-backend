import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/shared/database/schema/index.ts',
  out: './src/shared/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://cookora:cookora123@localhost:5433/cookora',
  },
  verbose: true,
  strict: true,
})
