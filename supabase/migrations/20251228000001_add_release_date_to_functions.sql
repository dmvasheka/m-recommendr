-- Add release_date to vector search functions
-- Fix for movie cards showing N/A for year

-- Drop existing functions first (required to change return type)
drop function if exists public.match_movies(vector, int, bigint[]);
drop function if exists public.match_movies_by_profile(uuid, int);
drop function if exists public.get_similar_movies(bigint, int);

-- ============================================
-- 1. Update match_movies function
-- ============================================
create or replace function public.match_movies (
  query_embedding vector(1536),
  match_count int default 10,
  filter_ids bigint[] default null
)
returns table (
  id bigint,
  title text,
  description text,
  poster_url text,
  backdrop_url text,
  genres text[],
  vote_average float,
  popularity float,
  release_date date,
  similarity float
)
language sql
stable
as $$
  select
    m.id,
    m.title,
    m.description,
    m.poster_url,
    m.backdrop_url,
    m.genres,
    m.vote_average,
    m.popularity,
    m.release_date,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.movies m
  where
    m.embedding is not null
    and (filter_ids is null or not (m.id = any(filter_ids)))
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================
-- 2. Update match_movies_by_profile function
-- ============================================
create or replace function public.match_movies_by_profile (
  p_user_id uuid,
  match_count int default 10
)
returns table (
  id bigint,
  title text,
  description text,
  poster_url text,
  backdrop_url text,
  genres text[],
  vote_average float,
  popularity float,
  release_date date,
  similarity float
)
language sql
stable
as $$
  select
    m.id,
    m.title,
    m.description,
    m.poster_url,
    m.backdrop_url,
    m.genres,
    m.vote_average,
    m.popularity,
    m.release_date,
    1 - (m.embedding <=> up.prefs_embedding) as similarity
  from public.movies m
  cross join public.user_profiles up
  where
    up.user_id = p_user_id
    and m.embedding is not null
    and up.prefs_embedding is not null
    -- Exclude already watched movies
    and not exists (
      select 1 from public.user_watchlist uw
      where uw.user_id = p_user_id
        and uw.movie_id = m.id
        and uw.status = 'watched'
    )
  order by m.embedding <=> up.prefs_embedding
  limit match_count;
$$;

-- ============================================
-- 3. Update get_similar_movies function
-- ============================================
create or replace function public.get_similar_movies (
  p_movie_id bigint,
  match_count int default 10
)
returns table (
  id bigint,
  title text,
  description text,
  poster_url text,
  backdrop_url text,
  genres text[],
  vote_average float,
  popularity float,
  release_date date,
  similarity float
)
language sql
stable
as $$
  select
    m.id,
    m.title,
    m.description,
    m.poster_url,
    m.backdrop_url,
    m.genres,
    m.vote_average,
    m.popularity,
    m.release_date,
    1 - (m.embedding <=> ref.embedding) as similarity
  from public.movies m
  cross join public.movies ref
  where
    ref.id = p_movie_id
    and m.id != p_movie_id
    and m.embedding is not null
    and ref.embedding is not null
  order by m.embedding <=> ref.embedding
  limit match_count;
$$;
