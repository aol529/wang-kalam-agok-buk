-- ============================================================
-- WANG' KALAM AGOK BUK — journal, letters and the day planner
-- Run after 01-goals.sql. Safe to re-run.
--
-- journal_entries: journal entries (kind 'journal') and letters to the
-- children (kind 'letter', with who it's for and when to open it). An
-- entry marked for_children also shows in Legacy.
-- day_plans: one row per day — the intention, the tasks (a JSON list of
-- { id, block, text, done, goal_id }) and the evening review.
-- Private like the goals: every row belongs to the signed-in user.
-- ============================================================

create table if not exists public.journal_entries (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind         text not null default 'journal' check (kind in ('journal', 'letter')),
  entry_date   date not null default current_date,
  title        text not null default '',
  body         text not null default '',
  areas        text[] not null default '{}',
  mood         smallint check (mood between 1 and 5),
  gratitude    text not null default '',
  for_children boolean not null default false,
  to_whom      text not null default '',
  open_on      date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists journal_entries_owner_date_idx on public.journal_entries (owner_id, entry_date desc);

alter table public.journal_entries enable row level security;
drop policy if exists "owner reads entries" on public.journal_entries;
create policy "owner reads entries" on public.journal_entries for select
  using (owner_id = auth.uid());
drop policy if exists "owner writes entries" on public.journal_entries;
create policy "owner writes entries" on public.journal_entries for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
revoke all on public.journal_entries from anon;
grant select, insert, update, delete on public.journal_entries to authenticated;

create table if not exists public.day_plans (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_date  date not null,
  intention  text not null default '',
  items      jsonb not null default '[]'::jsonb,
  review     text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, plan_date)
);

alter table public.day_plans enable row level security;
drop policy if exists "owner reads plans" on public.day_plans;
create policy "owner reads plans" on public.day_plans for select
  using (owner_id = auth.uid());
drop policy if exists "owner writes plans" on public.day_plans;
create policy "owner writes plans" on public.day_plans for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
revoke all on public.day_plans from anon;
grant select, insert, update, delete on public.day_plans to authenticated;
