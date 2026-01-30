-- Add IMDb fields to movies table
ALTER TABLE movies ADD COLUMN IF NOT EXISTS imdb_id TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS imdb_rating DECIMAL(3,1);
ALTER TABLE movies ADD COLUMN IF NOT EXISTS imdb_votes INTEGER;

-- Add IMDb fields to tv_shows table
ALTER TABLE tv_shows ADD COLUMN IF NOT EXISTS imdb_id TEXT;
ALTER TABLE tv_shows ADD COLUMN IF NOT EXISTS imdb_rating DECIMAL(3,1);
ALTER TABLE tv_shows ADD COLUMN IF NOT EXISTS imdb_votes INTEGER;

-- Create indexes for faster lookup by IMDb ID
CREATE INDEX IF NOT EXISTS idx_movies_imdb_id ON movies(imdb_id);
CREATE INDEX IF NOT EXISTS idx_tv_shows_imdb_id ON tv_shows(imdb_id);

-- Comment on columns for documentation
COMMENT ON COLUMN movies.imdb_id IS 'IMDb ID (e.g., tt1234567)';
COMMENT ON COLUMN movies.imdb_rating IS 'IMDb rating (0.0-10.0)';
COMMENT ON COLUMN movies.imdb_votes IS 'Number of IMDb votes';
COMMENT ON COLUMN tv_shows.imdb_id IS 'IMDb ID (e.g., tt1234567)';
COMMENT ON COLUMN tv_shows.imdb_rating IS 'IMDb rating (0.0-10.0)';
COMMENT ON COLUMN tv_shows.imdb_votes IS 'Number of IMDb votes';
