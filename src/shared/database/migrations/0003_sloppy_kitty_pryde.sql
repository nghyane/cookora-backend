-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
-- Create trigram GIN index for fast ILIKE/similarity search on ingredients.name
CREATE INDEX "ingredients_name_trgm_idx" ON "ingredients" USING gin ("name" gin_trgm_ops);