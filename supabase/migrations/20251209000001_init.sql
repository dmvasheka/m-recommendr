-- Movie Recommendr - Initial Database Schema
-- Day 1: Users, Movies, Watchlist, User Profiles with Vector Embeddings

-- ============================================
-- 1. Enable pgvector extension for embeddings
-- ============================================
create extension if not exists vector;

-- ============================================
-- 2. Users table
-- ============================================
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- 3. Movies table with vector embeddings
-- ============================================
create table public.movies (
  id bigint primary key,                    -- TMDB movie ID
  title text not null,
  description text,
  poster_url text,
  backdrop_url text,
  genres text[],
  release_date date,
  vote_average float,
  vote_count int,
  popularity float,
  runtime int,
  original_language text,
  embedding vector(1536),                   -- OpenAI text-embedding-3-small (1536 dimensions)
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- 4. User watchlist & watched tracking
-- ============================================
create table public.user_watchlist (
  user_id uuid references public.users(id) on delete cascade,
  movie_id bigint references public.movies(id) on delete cascade,
  status text check (status in ('planned', 'watched')) not null,
  rating int check (rating >= 1 and rating <= 10),
  watched_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (user_id, movie_id)
);

-- ============================================
-- 5. User profiles (aggregated preference embeddings)
-- ============================================
create table public.user_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  prefs_embedding vector(1536),             -- Averaged embedding from liked movies
  updated_at timestamp with time zone default now()
);

-- ============================================
-- 6. Indexes for performance
-- ============================================

-- Vector similarity search indexes (ivfflat for approximate nearest neighbor)
create index movies_embedding_idx on public.movies
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index user_profiles_embedding_idx on public.user_profiles
  using ivfflat (prefs_embedding vector_cosine_ops)
  with (lists = 100);

-- Regular indexes for filtering and sorting
create index movies_popularity_idx on public.movies (popularity desc);
create index movies_vote_average_idx on public.movies (vote_average desc);
create index movies_release_date_idx on public.movies (release_date desc);
create index user_watchlist_user_id_idx on public.user_watchlist (user_id);
create index user_watchlist_status_idx on public.user_watchlist (user_id, status);

-- ============================================
-- 7. Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.movies enable row level security;
alter table public.user_watchlist enable row level security;
alter table public.user_profiles enable row level security;

-- Movies: readable by everyone (public data)
create policy "Movies are viewable by everyone"
  on public.movies for select
  using (true);

-- Users: users can only view their own data
create policy "Users can view their own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own data"
  on public.users for update
  using (auth.uid() = id);

-- Watchlist: users can only manage their own watchlist
create policy "Users can view their own watchlist"
  on public.user_watchlist for select
  using (auth.uid() = user_id);

create policy "Users can insert to their own watchlist"
  on public.user_watchlist for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own watchlist"
  on public.user_watchlist for update
  using (auth.uid() = user_id);

create policy "Users can delete from their own watchlist"
  on public.user_watchlist for delete
  using (auth.uid() = user_id);

-- User profiles: users can only view/update their own profile
create policy "Users can view their own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

-- ============================================
-- 8. Helper Functions
-- ============================================

-- Function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger users_updated_at
  before update on public.users
  for each row
  execute function public.handle_updated_at();

create trigger movies_updated_at
  before update on public.movies
  for each row
  execute function public.handle_updated_at();

create trigger user_watchlist_updated_at
  before update on public.user_watchlist
  for each row
  execute function public.handle_updated_at();

create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row
  execute function public.handle_updated_at();

-- ============================================
-- Migration complete!
-- ============================================
-- Tables created: users, movies, user_watchlist, user_profiles
-- Vector indexes created for similarity search
-- RLS policies enabled for security
-- Auto-update triggers configured
