import { env } from "@/shared/config/env";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

import { SQL } from "bun";

const connectionString = env.DATABASE_URL;

const queryClient = new SQL(connectionString, {
  prepare: false, // Disable prepared statements for Supabase pooler
  max: 20,
});

export const db = drizzle(queryClient, {
  schema,
  logger: env.NODE_ENV === "development",
});

export { sql } from "drizzle-orm";
