-- ============================================================
-- WANG' KALAM AGOK BUK — "Days without" timers
-- Run after 04-clear-conscience.sql. Safe to re-run.
--
-- quit_timers: one row per thing being given up (a drink, cigarettes,
-- sugar...). since is the last time; the Today page counts up from it.
-- A slip closes the current streak into history ([{ "from", "to" }],
-- oldest first) and starts again from the slip, so the best streak and
-- the number of slips are never lost.
-- Private like the rest: every row belongs to the signed-in user.
-- ============================================================

create table if not exists public.quit_timers (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null default '',
  since      timestamptz not null default now(),
  note       text not null default '',
  history    jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quit_timers_owner_idx on public.quit_timers (owner_id, created_at);

alter table public.quit_timers enable row level security;
drop policy if exists "owner reads timers" on public.quit_timers;
create policy "owner reads timers" on public.quit_timers for select
  using (owner_id = auth.uid());
drop policy if exists "owner writes timers" on public.quit_timers;
create policy "owner writes timers" on public.quit_timers for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
revoke all on public.quit_timers from anon;
grant select, insert, update, delete on public.quit_timers to authenticated;
