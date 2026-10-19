-- ============================================================
-- WANG' KALAM AGOK BUK — Budget
-- Run after 06-systems.sql. Safe to re-run.
--
-- budget_items: the notebook page of October 2026, in four boxes.
-- quadrant is the box, in Covey's keys like the Vision board:
--   do       urgent + necessary      (Necessity)
--   delegate urgent − necessary      (Deception)
--   schedule −urgent + necessary     (Personal Leadership)
--   drop     −urgent − necessary     (Waste)
-- A monthly item (electricity, food...) is ticked off per month: paid
-- holds the months it was paid, e.g. ["2026-10"]. A one-off (a laptop,
-- a fan) is ticked once: paid is ["once"].
-- Private like the rest: every row belongs to the signed-in user.
-- ============================================================

create table if not exists public.budget_items (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quadrant   text not null default 'do' check (quadrant in ('do', 'delegate', 'schedule', 'drop')),
  name       text not null default '',
  amount     numeric,                      -- KES; empty = not priced yet
  monthly    boolean not null default true,
  paid       jsonb not null default '[]'::jsonb,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists budget_items_owner_idx on public.budget_items (owner_id, quadrant, sort);

alter table public.budget_items enable row level security;
drop policy if exists "owner reads budget" on public.budget_items;
create policy "owner reads budget" on public.budget_items for select
  using (owner_id = auth.uid());
drop policy if exists "owner writes budget" on public.budget_items;
create policy "owner writes budget" on public.budget_items for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
revoke all on public.budget_items from anon;
grant select, insert, update, delete on public.budget_items to authenticated;
