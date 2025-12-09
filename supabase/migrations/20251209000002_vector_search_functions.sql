-- Movie Recommendr - Vector Search Functions
-- Day 1: Similarity search functions for movie recommendations

-- ============================================
-- 1. Match movies by embedding similarity
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
    1 - (m.embedding <=> query_embedding) as similarity
  from public.movies m
  where
    m.embedding is not null
    and (filter_ids is null or not (m.id = any(filter_ids)))
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================
-- 2. Match movies by user profile
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
-- 3. Get similar movies (for "More like this")
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

-- ============================================
-- 4. Update user profile embedding
-- ============================================
create or replace function public.update_user_profile_embedding (
  p_user_id uuid,
  min_rating int default 7
)
returns void
language plpgsql
as $$
declare
  avg_embedding vector(1536);
begin
  -- Calculate average embedding from highly-rated watched movies
  select avg(m.embedding)::vector(1536)
  into avg_embedding
  from public.user_watchlist uw
  join public.movies m on m.id = uw.movie_id
  where
    uw.user_id = p_user_id
    and uw.status = 'watched'
    and uw.rating >= min_rating
    and m.embedding is not null;

  -- Insert or update user profile
  if avg_embedding is not null then
    insert into public.user_profiles (user_id, prefs_embedding)
    values (p_user_id, avg_embedding)
    on conflict (user_id)
    do update set
      prefs_embedding = excluded.prefs_embedding,
      updated_at = now();
  end if;
end;
$$;

-- ============================================
-- 5. Trigger to auto-update user profile
-- ============================================
create or replace function public.handle_watchlist_update()
returns trigger
language plpgsql
as $$
begin
  -- Update user profile when a movie is rated
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') and
     new.status = 'watched' and
     new.rating >= 7 then
    perform public.update_user_profile_embedding(new.user_id, 7);
  end if;

  return new;
end;
$$;

create trigger watchlist_update_profile
  after insert or update on public.user_watchlist
  for each row
  execute function public.handle_watchlist_update();

-- ============================================
-- Migration complete!
-- ============================================
-- Functions created:
-- - match_movies: Find similar movies by embedding
-- - match_movies_by_profile: Recommend based on user profile
-- - get_similar_movies: "More like this" functionality
-- - update_user_profile_embedding: Calculate user preferences
-- Trigger: Auto-update user profile on watchlist changes
