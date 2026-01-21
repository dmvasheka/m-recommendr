-- Add preferred_language column to users table
-- This allows users to save their language preference in the database

-- Add the column with default value 'en'
alter table public.users
add column preferred_language text default 'en' check (preferred_language in ('en', 'ru', 'uk'));

-- Add comment for documentation
comment on column public.users.preferred_language is 'User preferred language for UI (en, ru, uk)';

-- Update the handle_new_user function to include preferred_language
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, preferred_language, created_at, updated_at)
  values (
    new.id,
    new.email,
    'en', -- default language
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
