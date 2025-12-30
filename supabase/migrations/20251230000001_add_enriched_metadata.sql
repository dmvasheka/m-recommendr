-- Migration: Add enriched metadata fields to movies table
-- Date: 2025-12-30
-- Purpose: Support RAG pipeline with richer movie context

-- Add new columns to movies table
ALTER TABLE movies
    ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS movie_cast JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS crew JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS production_companies TEXT[] DEFAULT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_movies_keywords ON movies USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_movies_movie_cast ON movies USING GIN (movie_cast);
CREATE INDEX IF NOT EXISTS idx_movies_crew ON movies USING GIN (crew);

-- Add comments for documentation
COMMENT ON COLUMN movies.keywords IS 'Array of keyword strings from TMDB (e.g., ["space", "artificial intelligence"])';
COMMENT ON COLUMN movies.tagline IS 'Movie tagline/slogan from TMDB';
COMMENT ON COLUMN movies.movie_cast IS 'JSON array of top cast members: [{name, character, profile_path}]';
COMMENT ON COLUMN movies.crew IS 'JSON array of key crew members: [{name, job, department}]';
COMMENT ON COLUMN movies.production_companies IS 'Array of production company names';