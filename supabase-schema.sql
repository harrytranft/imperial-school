-- Run this in Supabase Dashboard > SQL Editor before using the app in production.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default 'Học sĩ triều đình',
  photo_url text not null default 'https://api.dicebear.com/7.x/bottts/svg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  students jsonb not null default '[]'::jsonb,
  ranks_male jsonb not null default '[]'::jsonb,
  ranks_female jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  pet_skills jsonb not null default '[]'::jsonb,
  pos_sound_url text not null default '',
  neg_sound_url text not null default '',
  timer_sound_url text not null default '',
  wheel_spin_sound_url text not null default '',
  wheel_finish_sound_url text not null default '',
  custom_ludo_tiles jsonb not null default '{}'::jsonb,
  lucky_wheel_rewards jsonb not null default '[]'::jsonb,
  boss_states_by_class jsonb not null default '{}'::jsonb,
  updated_at_ms bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings
add column if not exists pet_skills jsonb not null default '[]'::jsonb;

alter table public.user_settings
add column if not exists wheel_spin_sound_url text not null default '';

alter table public.user_settings
add column if not exists wheel_finish_sound_url text not null default '';

alter table public.user_settings
add column if not exists lucky_wheel_rewards jsonb not null default '[]'::jsonb;

alter table public.user_settings
add column if not exists boss_states_by_class jsonb not null default '{}'::jsonb;

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
on public.profiles for select
using (auth.uid() = user_id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Settings are readable by owner" on public.user_settings;
create policy "Settings are readable by owner"
on public.user_settings for select
using (auth.uid() = user_id);

drop policy if exists "Settings are insertable by owner" on public.user_settings;
create policy "Settings are insertable by owner"
on public.user_settings for insert
with check (auth.uid() = user_id);

drop policy if exists "Settings are updatable by owner" on public.user_settings;
create policy "Settings are updatable by owner"
on public.user_settings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name, photo_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', 'Học sĩ triều đình'),
    coalesce(new.raw_user_meta_data->>'photo_url', new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg')
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name,
    photo_url = excluded.photo_url,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();
