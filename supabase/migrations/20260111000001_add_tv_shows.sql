-- Migration: Add TV Shows support
-- Date: 2026-01-11
-- Purpose: Implement Stage 5 (TV Series Support)

-- 1. TV Shows Table
create table public.tv_shows (
  id bigint primary key,                    -- TMDB TV ID
  name text not null,                       -- TV shows use 'name' instead of 'title'
  overview text,
  poster_url text,
  backdrop_url text,
  genres text[],
  first_air_date date,
  last_air_date date,
  vote_average float,
  vote_count int,
  popularity float,
  number_of_seasons int,
  number_of_episodes int,
  original_language text,
  origin_country text[],
  status text,                              -- 'Returning Series', 'Ended', 'Canceled'
  keywords text[],
  tagline text,
  tv_cast jsonb,                            -- JSON array: [{name, character, profile_path}]
  crew jsonb,                               -- JSON array: [{name, job, department}]
  production_companies text[],
  embedding vector(1536),                   -- OpenAI text-embedding-3-small
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. TV Seasons Table
create table public.tv_seasons (
  id bigint primary key,                    -- TMDB Season ID
  tv_show_id bigint references public.tv_shows(id) on delete cascade,
  season_number int not null,
  name text,
  overview text,
  poster_url text,
  air_date date,
  episode_count int,
  vote_average float,
  created_at timestamp with time zone default now()
);

-- 3. TV Episodes Table
create table public.tv_episodes (
  id bigint primary key,                    -- TMDB Episode ID
  tv_show_id bigint references public.tv_shows(id) on delete cascade,
  season_id bigint references public.tv_seasons(id) on delete cascade,
  episode_number int not null,
  name text,
  overview text,
  still_url text,
  air_date date,
  vote_average float,
  vote_count int,
  runtime int,
  created_at timestamp with time zone default now()
);

-- 4. User TV Watchlist
create table public.user_tv_watchlist (
  user_id uuid references public.users(id) on delete cascade,
  tv_show_id bigint references public.tv_shows(id) on delete cascade,
  status text check (status in ('planned', 'watching', 'watched', 'dropped')) not null,
  rating int check (rating >= 1 and rating <= 10),
  progress_season int default 1,
  progress_episode int default 1,
  watched_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (user_id, tv_show_id)
);

-- 5. Indexes for performance
create index tv_shows_embedding_idx on public.tv_shows using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index tv_shows_popularity_idx on public.tv_shows (popularity desc);
create index tv_shows_vote_average_idx on public.tv_shows (vote_average desc);
create index tv_shows_first_air_date_idx on public.tv_shows (first_air_date desc);
create index tv_seasons_show_idx on public.tv_seasons (tv_show_id);
create index tv_episodes_show_season_idx on public.tv_episodes (tv_show_id, season_id);
create index user_tv_watchlist_user_idx on public.user_tv_watchlist (user_id);
create index user_tv_watchlist_status_idx on public.user_tv_watchlist (user_id, status);

-- 6. RLS Policies (Security)
alter table public.tv_shows enable row level security;
alter table public.tv_seasons enable row level security;
alter table public.tv_episodes enable row level security;
alter table public.user_tv_watchlist enable row level security;

-- Public read access
create policy "TV Shows are viewable by everyone" on public.tv_shows for select using (true);
create policy "TV Seasons are viewable by everyone" on public.tv_seasons for select using (true);
create policy "TV Episodes are viewable by everyone" on public.tv_episodes for select using (true);

-- User Watchlist policies
create policy "Users can view their own tv watchlist"
  on public.user_tv_watchlist for select using (auth.uid() = user_id);

create policy "Users can insert to their own tv watchlist"
  on public.user_tv_watchlist for insert with check (auth.uid() = user_id);

create policy "Users can update their own tv watchlist"
  on public.user_tv_watchlist for update using (auth.uid() = user_id);

create policy "Users can delete from their own tv watchlist"
  on public.user_tv_watchlist for delete using (auth.uid() = user_id);

-- 7. Triggers for updated_at
create trigger tv_shows_updated_at
  before update on public.tv_shows
  for each row execute function public.handle_updated_at();

create trigger user_tv_watchlist_updated_at
  before update on public.user_tv_watchlist
  for each row execute function public.handle_updated_at();

-- 8. Vector Search Function for TV Shows
create or replace function match_tv_shows (
  query_embedding vector(1536),
  match_count int default 10,
  filter_ids bigint[] default null
)
returns table (
  id bigint,
  name text,
  overview text,
  poster_url text,
  backdrop_url text,
  vote_average float,
  popularity float,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    tv.id,
    tv.name,
    tv.overview,
    tv.poster_url,
    tv.backdrop_url,
    tv.vote_average,
    tv.popularity,
    1 - (tv.embedding <=> query_embedding) as similarity
  from tv_shows tv
  where (filter_ids is null or tv.id = any(filter_ids))
  order by (tv.embedding <=> query_embedding) asc
  limit match_count;
end;
$$;
