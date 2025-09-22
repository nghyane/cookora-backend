-- pg_trgm extension already enabled on Supabase (verified)

-- Add GIN trigram index for fast similarity search on ingredient names
CREATE INDEX IF NOT EXISTS ingredients_name_trgm_idx ON ingredients USING gin (name gin_trgm_ops);

-- Optional: Add index for combined text search (name + aliases as text)
-- This helps with both trigram and full-text search
CREATE INDEX IF NOT EXISTS ingredients_search_idx ON ingredients
USING gin (
  to_tsvector('simple', name || ' ' || COALESCE(aliases::text, ''))
);
