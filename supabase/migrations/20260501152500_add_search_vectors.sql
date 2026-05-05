-- Migration: Add per-language tsvector columns, triggers, GIN indexes, and candidate-restricted vector RPCs
-- Created: 2026-05-01
-- Phase 1 of Smart Search implementation

-- ============================================================
-- A) Movies tsvector setup
-- ============================================================

ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS search_vector_en tsvector,
  ADD COLUMN IF NOT EXISTS search_vector_ru tsvector,
  ADD COLUMN IF NOT EXISTS search_vector_uk tsvector;

-- Movies translations payload uses keys {title, description} per the column
-- COMMENT in supabase/migrations/20260117000002_add_translations.sql.
-- (TV shows translations use {name, overview} — see section B below.)
CREATE OR REPLACE FUNCTION public.movies_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector_en := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.translations->'en'->>'title', '') || ' ' ||
    coalesce(NEW.translations->'en'->>'description', '')
  );
  NEW.search_vector_ru := to_tsvector('russian',
    coalesce(NEW.translations->'ru'->>'title', '') || ' ' ||
    coalesce(NEW.translations->'ru'->>'description', '')
  );
  NEW.search_vector_uk := to_tsvector('simple',
    coalesce(NEW.translations->'uk'->>'title', '') || ' ' ||
    coalesce(NEW.translations->'uk'->>'description', '')
  );
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS movies_search_vector_trigger ON public.movies;
CREATE TRIGGER movies_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description, translations ON public.movies
  FOR EACH ROW EXECUTE FUNCTION public.movies_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_movies_search_en ON public.movies USING gin(search_vector_en);
CREATE INDEX IF NOT EXISTS idx_movies_search_ru ON public.movies USING gin(search_vector_ru);
CREATE INDEX IF NOT EXISTS idx_movies_search_uk ON public.movies USING gin(search_vector_uk);

CREATE INDEX IF NOT EXISTS idx_movies_genres ON public.movies USING gin(genres);

-- ============================================================
-- B) TV Shows tsvector setup
-- tv_shows uses 'name' (not 'title') and 'overview' (not 'description')
-- translations JSONB keys: {"en": {"name": "...", "overview": "..."}, "ru": {...}}
-- ============================================================

ALTER TABLE public.tv_shows
  ADD COLUMN IF NOT EXISTS search_vector_en tsvector,
  ADD COLUMN IF NOT EXISTS search_vector_ru tsvector,
  ADD COLUMN IF NOT EXISTS search_vector_uk tsvector;

CREATE OR REPLACE FUNCTION public.tv_shows_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector_en := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.overview, '') || ' ' ||
    coalesce(NEW.translations->'en'->>'name', '') || ' ' ||
    coalesce(NEW.translations->'en'->>'overview', '')
  );
  NEW.search_vector_ru := to_tsvector('russian',
    coalesce(NEW.translations->'ru'->>'name', '') || ' ' ||
    coalesce(NEW.translations->'ru'->>'overview', '')
  );
  NEW.search_vector_uk := to_tsvector('simple',
    coalesce(NEW.translations->'uk'->>'name', '') || ' ' ||
    coalesce(NEW.translations->'uk'->>'overview', '')
  );
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tv_shows_search_vector_trigger ON public.tv_shows;
CREATE TRIGGER tv_shows_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, overview, translations ON public.tv_shows
  FOR EACH ROW EXECUTE FUNCTION public.tv_shows_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_tv_shows_search_en ON public.tv_shows USING gin(search_vector_en);
CREATE INDEX IF NOT EXISTS idx_tv_shows_search_ru ON public.tv_shows USING gin(search_vector_ru);
CREATE INDEX IF NOT EXISTS idx_tv_shows_search_uk ON public.tv_shows USING gin(search_vector_uk);

CREATE INDEX IF NOT EXISTS idx_tv_shows_genres ON public.tv_shows USING gin(genres);

-- ============================================================
-- C) Candidate-restricted vector match RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.match_movies_in_set (
  query_embedding vector(1536),
  candidate_ids bigint[],
  match_count int DEFAULT 50
)
RETURNS TABLE (id bigint, similarity float)
LANGUAGE sql
STABLE
AS $$
  SELECT m.id, 1 - (m.embedding <=> query_embedding) AS similarity
  FROM public.movies m
  WHERE m.embedding IS NOT NULL
    AND (candidate_ids IS NULL OR m.id = ANY(candidate_ids))
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_tv_shows_in_set (
  query_embedding vector(1536),
  candidate_ids bigint[],
  match_count int DEFAULT 50
)
RETURNS TABLE (id bigint, similarity float)
LANGUAGE sql
STABLE
AS $$
  SELECT t.id, 1 - (t.embedding <=> query_embedding) AS similarity
  FROM public.tv_shows t
  WHERE t.embedding IS NOT NULL
    AND (candidate_ids IS NULL OR t.id = ANY(candidate_ids))
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================
-- D) Backfill helper RPC
-- Re-writes a column to itself for given IDs to fire the BEFORE UPDATE
-- trigger that populates tsvector columns. Allowlists table/column to
-- prevent injection.
-- ============================================================

CREATE OR REPLACE FUNCTION public.touch_rows_for_tsvector(
    p_table text,
    p_column text,
    p_ids bigint[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_table NOT IN ('movies', 'tv_shows') THEN
        RAISE EXCEPTION 'invalid table: %', p_table;
    END IF;
    IF p_column NOT IN ('title', 'name') THEN
        RAISE EXCEPTION 'invalid column: %', p_column;
    END IF;
    EXECUTE format('UPDATE public.%I SET %I = %I WHERE id = ANY($1::bigint[])', p_table, p_column, p_column) USING p_ids;
END $$;
REVOKE ALL ON FUNCTION public.touch_rows_for_tsvector(text, text, bigint[]) FROM PUBLIC;
-- Backfill is a server-side admin operation invoked with SUPABASE_SERVICE_KEY.
-- service_role needs explicit EXECUTE; regular `authenticated` users must NOT
-- be able to fire trigger-cascading UPDATEs across the catalogue.
GRANT EXECUTE ON FUNCTION public.touch_rows_for_tsvector(text, text, bigint[]) TO service_role;
