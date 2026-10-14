-- NBA ARCADE 2026-27 Supabase Schema
-- Run this in the Supabase SQL editor at: https://ipsngddnavymcmfbbcxu.supabase.co

-- ── LEAGUES (main key-value store) ─────────────────────────────────────────
create table if not exists leagues (
  id   text primary key,
  state text not null,
  updated_at timestamptz default now()
);

-- Update timestamp trigger
create or replace function set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists leagues_updated on leagues;
create trigger leagues_updated
  before update on leagues
  for each row execute function set_updated_at();

-- ── MANAGERS (one row per user) ─────────────────────────────────────────────
create table if not exists managers (
  id              bigint primary key generated always as identity,
  user_id         uuid references auth.users(id) on delete cascade,
  email           text,
  display_name    text not null,
  color           text default '#4a9eff',
  is_commissioner boolean default false,
  created_at      timestamptz default now()
);

create unique index if not exists managers_user_id_idx on managers(user_id);
create unique index if not exists managers_email_idx on managers(email);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

-- leagues: anyone authenticated can read; anyone authenticated can write
alter table leagues enable row level security;
drop policy if exists "leagues_read" on leagues;
drop policy if exists "leagues_write" on leagues;
create policy "leagues_read" on leagues for select using (auth.role() = 'authenticated');
create policy "leagues_write" on leagues for insert with check (auth.role() = 'authenticated');
create policy "leagues_update" on leagues for update using (auth.role() = 'authenticated');

-- managers: authenticated users can read all; users can insert/update their own row
alter table managers enable row level security;
drop policy if exists "managers_read" on managers;
drop policy if exists "managers_insert" on managers;
drop policy if exists "managers_update" on managers;
create policy "managers_read"   on managers for select using (auth.role() = 'authenticated');
create policy "managers_insert" on managers for insert with check (auth.uid() = user_id);
create policy "managers_update" on managers for update using (auth.uid() = user_id);

-- ── SEED COMMISSIONER ───────────────────────────────────────────────────────
-- Run this AFTER Dave creates his account via the sign-up form
-- Replace 'dave-uuid-here' with actual UUID from auth.users
-- UPDATE managers SET is_commissioner = true WHERE email = 'daveschachter@gmail.com';

-- ── USEFUL QUERIES ───────────────────────────────────────────────────────────
-- Get all managers:
-- SELECT * FROM managers ORDER BY created_at;

-- Set commissioner:
-- UPDATE managers SET is_commissioner = true WHERE email = 'daveschachter@gmail.com';

-- Delete a manager (also deletes their auth.users row via cascade if needed):
-- DELETE FROM managers WHERE email = 'someone@example.com';

-- Check league state:
-- SELECT id, length(state), updated_at FROM leagues;
