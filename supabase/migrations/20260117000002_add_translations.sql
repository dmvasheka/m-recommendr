-- Migration: Add translations support for movies and TV shows
-- Created: 2026-01-17
-- Description: Add JSONB field to store translations in multiple languages

-- Add translations column to movies table
ALTER TABLE movies ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb;

-- Add translations column to tv_shows table
ALTER TABLE tv_shows ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb;

-- Create GIN index on translations for faster JSONB queries
CREATE INDEX IF NOT EXISTS movies_translations_idx ON movies USING GIN (translations);
CREATE INDEX IF NOT EXISTS tv_shows_translations_idx ON tv_shows USING GIN (translations);

-- Add comments
COMMENT ON COLUMN movies.translations IS 'Translations in multiple languages: {"en": {"title": "...", "description": "..."}, "ru": {...}}';
COMMENT ON COLUMN tv_shows.translations IS 'Translations in multiple languages: {"en": {"name": "...", "overview": "..."}, "ru": {...}}';

-- Helper function to get translated field with fallback
CREATE OR REPLACE FUNCTION get_translated_field(
    translations_json jsonb,
    field_name text,
    language text DEFAULT 'en',
    fallback_value text DEFAULT NULL
) RETURNS text AS $$
BEGIN
    -- Try to get translation for requested language
    IF translations_json ? language THEN
        RETURN translations_json->language->>field_name;
    END IF;

    -- Fallback to English
    IF translations_json ? 'en' THEN
        RETURN translations_json->'en'->>field_name;
    END IF;

    -- Return fallback value if provided
    RETURN fallback_value;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_translated_field IS 'Get translated field from translations JSON with fallback to English and then to fallback_value';

-- Example of how to use:
-- SELECT
--   id,
--   get_translated_field(translations, 'title', 'ru', title) as title_localized,
--   get_translated_field(translations, 'description', 'ru', description) as description_localized
-- FROM movies;
