-- Fix match_movies function signature - add missing filter_ids parameter

-- Drop all possible variations
drop function if exists public.match_movies(vector, int);
drop function if exists public.match_movies(vector, int, bigint[]);

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
