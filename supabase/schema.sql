-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Creates the profiles table that usernames live in, plus a trigger so every
-- new auth user automatically gets one.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_format
    check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

-- Case-insensitive uniqueness: "Kenneth" and "kenneth" cannot both exist,
-- but the original capitalisation is still stored for display.
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- Nobody can read the table with the publishable key. Username lookup at login
-- happens server-side with the secret key, which bypasses RLS. This is what
-- stops the login form being used to harvest usernames and emails.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Creates the profile row whenever an auth user is created, including users
-- added by hand in the dashboard.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  desired text;
  candidate text;
begin
  -- Prefer a username passed at signup; otherwise derive one from the email.
  desired := coalesce(
    new.raw_user_meta_data ->> 'username',
    regexp_replace(split_part(new.email, '@', 1), '[^A-Za-z0-9_]', '', 'g')
  );

  -- Pad short names so the format check cannot fail.
  desired := rpad(nullif(desired, ''), 3, '0');
  desired := left(desired, 20);

  candidate := desired;

  -- On collision, append a short random suffix rather than failing user
  -- creation outright.
  if exists (
    select 1 from public.profiles where lower(username) = lower(candidate)
  ) then
    candidate := left(desired, 14) || '_' || substr(md5(random()::text), 1, 5);
  end if;

  insert into public.profiles (id, username)
  values (new.id, candidate)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that already exist.
insert into public.profiles (id, username)
select
  u.id,
  left(rpad(nullif(regexp_replace(split_part(u.email, '@', 1), '[^A-Za-z0-9_]', '', 'g'), ''), 3, '0'), 20)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;
