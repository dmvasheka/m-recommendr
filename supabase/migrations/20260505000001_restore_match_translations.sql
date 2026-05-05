-- Migration: restore translations field in match_movies / match_movies_by_profile / get_similar_movies
-- Created: 2026-05-05
--
-- Why this exists:
--   The earlier migrations 20251228000001 and 20251228000002 used to reference
--   `m.translations` and return `translations jsonb`, but the `translations`
--   column is only added later by 20260117000002_add_translations.sql. That
--   ordering broke `supabase db reset` from scratch with
--   `column m.translations does not exist`. Production already had these
--   functions populated (the broken files were edited in place after
--   translations existed in prod), so this fix:
--     1. Removes the premature translations references from the two December
--        migrations (see those files).
--     2. Restores translations in the function signatures here, AFTER the
--        translations column has been created.
--
--   On production this CREATE OR REPLACE is a no-op (functions already match
--   this shape). On a fresh dev DB it brings the functions back in sync with
--   what the application code expects.

-- match_movies needs DROP first because the return type changes (adding the
-- translations column to RETURNS TABLE).
DROP FUNCTION IF EXISTS public.match_movies(vector, int, bigint[]);
DROP FUNCTION IF EXISTS public.match_movies_by_profile(uuid, int);
DROP FUNCTION IF EXISTS public.get_similar_movies(bigint, int);

CREATE OR REPLACE FUNCTION public.match_movies (
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  filter_ids bigint[] DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  title text,
  description text,
  poster_url text,
  backdrop_url text,
  genres text[],
  vote_average float,
  popularity float,
  release_date date,
  similarity float,
  translations jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id,
    m.title,
    m.description,
    m.poster_url,
    m.backdrop_url,
    m.genres,
    m.vote_average,
    m.popularity,
    m.release_date,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.translations
  FROM public.movies m
  WHERE
    m.embedding IS NOT NULL
    AND (filter_ids IS NULL OR NOT (m.id = ANY(filter_ids)))
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_movies_by_profile (
  p_user_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  title text,
  description text,
  poster_url text,
  backdrop_url text,
  genres text[],
  vote_average float,
  popularity float,
  release_date date,
  similarity float,
  translations jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id,
    m.title,
    m.description,
    m.poster_url,
    m.backdrop_url,
    m.genres,
    m.vote_average,
    m.popularity,
    m.release_date,
    1 - (m.embedding <=> up.prefs_embedding) AS similarity,
    m.translations
  FROM public.movies m
  CROSS JOIN public.user_profiles up
  WHERE
    up.user_id = p_user_id
    AND m.embedding IS NOT NULL
    AND up.prefs_embedding IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.user_watchlist uw
      WHERE uw.user_id = p_user_id
        AND uw.movie_id = m.id
        AND uw.status = 'watched'
    )
  ORDER BY m.embedding <=> up.prefs_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.get_similar_movies (
  p_movie_id bigint,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  title text,
  description text,
  poster_url text,
  backdrop_url text,
  genres text[],
  vote_average float,
  popularity float,
  release_date date,
  similarity float,
  translations jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id,
    m.title,
    m.description,
    m.poster_url,
    m.backdrop_url,
    m.genres,
    m.vote_average,
    m.popularity,
    m.release_date,
    1 - (m.embedding <=> ref.embedding) AS similarity,
    m.translations
  FROM public.movies m
  CROSS JOIN public.movies ref
  WHERE
    ref.id = p_movie_id
    AND m.id != p_movie_id
    AND m.embedding IS NOT NULL
    AND ref.embedding IS NOT NULL
  ORDER BY m.embedding <=> ref.embedding
  LIMIT match_count;
$$;
