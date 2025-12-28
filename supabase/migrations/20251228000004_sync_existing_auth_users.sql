-- Sync existing auth.users to public.users table
-- This ensures any users who signed up before the trigger was created are also in public.users

insert into public.users (id, email, created_at, updated_at)
select
  id,
  email,
  created_at,
  updated_at
from auth.users
on conflict (id) do nothing;
