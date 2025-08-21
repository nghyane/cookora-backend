import { env } from '@/shared/config/env'
import { drizzle } from 'drizzle-orm/bun-sql'
import * as schema from './schema'

const connectionString = env.DATABASE_URL

export const db = drizzle(connectionString, {
  schema,
  logger: env.NODE_ENV === 'development',
})

export { sql } from 'drizzle-orm'
