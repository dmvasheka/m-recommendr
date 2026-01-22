-- Migration: Import Progress Tracking
-- Created: 2026-01-17
-- Description: Table for tracking TMDB import progress to avoid re-importing same content

-- Create import_progress table
create table if not exists import_progress (
    id uuid primary key default gen_random_uuid(),
    content_type text not null check (content_type in ('movies', 'tv_shows')),
    category text not null, -- 'popular', 'top_rated', 'now_playing', 'upcoming', 'by_year'
    year integer, -- For year-based imports
    last_page integer not null default 1,
    last_run timestamp with time zone default now(),
    total_imported integer default 0,
    total_skipped integer default 0,
    notes text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create unique constraint to prevent duplicate tracking entries
create unique index import_progress_unique_idx
on import_progress(content_type, category, coalesce(year, 0));

-- Create index for faster queries
create index import_progress_last_run_idx on import_progress(last_run desc);
create index import_progress_content_type_idx on import_progress(content_type, category);

-- Add comments
comment on table import_progress is 'Tracks TMDB import progress to avoid re-importing same content';
comment on column import_progress.content_type is 'Type of content: movies or tv_shows';
comment on column import_progress.category is 'TMDB category: popular, top_rated, now_playing, upcoming, by_year';
comment on column import_progress.year is 'Year for year-based imports (null for category-based)';
comment on column import_progress.last_page is 'Last successfully processed page number';
comment on column import_progress.total_imported is 'Total count of items successfully imported';
comment on column import_progress.total_skipped is 'Total count of items skipped (duplicates)';

-- Function to update progress
create or replace function update_import_progress(
    p_content_type text,
    p_category text,
    p_year integer,
    p_last_page integer,
    p_imported integer default 0,
    p_skipped integer default 0
) returns void as $$
begin
    insert into import_progress (
        content_type,
        category,
        year,
        last_page,
        total_imported,
        total_skipped,
        updated_at
    ) values (
        p_content_type,
        p_category,
        p_year,
        p_last_page,
        p_imported,
        p_skipped,
        now()
    )
    on conflict (content_type, category, coalesce(year, 0))
    do update set
        last_page = p_last_page,
        total_imported = import_progress.total_imported + p_imported,
        total_skipped = import_progress.total_skipped + p_skipped,
        last_run = now(),
        updated_at = now();
end;
$$ language plpgsql;

-- Function to get next page to import
create or replace function get_next_import_page(
    p_content_type text,
    p_category text,
    p_year integer default null
) returns integer as $$
declare
    v_last_page integer;
begin
    select last_page into v_last_page
    from import_progress
    where content_type = p_content_type
      and category = p_category
      and (year = p_year or (year is null and p_year is null));

    -- If no record exists, start from page 1
    -- Otherwise, return next page
    return coalesce(v_last_page, 0) + 1;
end;
$$ language plpgsql;
