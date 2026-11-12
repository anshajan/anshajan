-- anshaj — Supabase schema
-- Run via `supabase db push` or paste into the SQL editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  tier text not null default 'free' check (tier in ('free', 'creator', 'agency')),
  credit_limit int not null default 3,
  credits_used int not null default 0,
  period_start timestamptz not null default now(),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.posters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt text not null,
  aspect_ratio text not null,
  image_url text not null,
  reference_pins jsonb not null default '[]'::jsonb,
  palette jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.posters enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "posters_select_own" on public.posters
  for select using (auth.uid() = user_id);

create policy "posters_insert_own" on public.posters
  for insert with check (auth.uid() = user_id);

-- Atomically checks-and-deducts a credit in one statement so two concurrent
-- /api/generate requests can never both succeed when only one credit
-- remains (closes the race described in lib/credits.ts).
create or replace function public.deduct_credit(p_user_id uuid)
returns table (remaining int, tier text)
language plpgsql
security definer
as $$
begin
  return query
  update public.profiles
  set credits_used = credits_used + 1
  where id = p_user_id
    and credits_used < credit_limit
  returning credit_limit - credits_used, profiles.tier;
end;
$$;

create or replace function public.refund_credit(p_user_id uuid)
returns void
language sql
security definer
as $$
  update public.profiles
  set credits_used = greatest(0, credits_used - 1)
  where id = p_user_id;
$$;

-- New auth.users row -> create a free-tier profile automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
