-- ============================================================
-- WANG' KALAM AGOK BUK — Wishlist
-- Run after 08-cms.sql. Safe to re-run.
--
-- wishlist_items: the things I wish for, one line each on a notebook
-- page: what it is, roughly what it costs (KES, empty = not priced yet),
-- where to find it (a link) and a note. got is ticked when it's mine;
-- got_on is the day it was ticked.
-- Private like the rest: every row belongs to the signed-in user.
-- ============================================================

create table if not exists public.wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null default '',
  price      numeric,
  link       text not null default '',
  note       text not null default '',
  got        boolean not null default false,
  got_on     date,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wishlist_items_owner_idx on public.wishlist_items (owner_id, got, sort);

alter table public.wishlist_items enable row level security;
drop policy if exists "owner reads wishlist" on public.wishlist_items;
create policy "owner reads wishlist" on public.wishlist_items for select
  using (owner_id = auth.uid());
drop policy if exists "owner writes wishlist" on public.wishlist_items;
create policy "owner writes wishlist" on public.wishlist_items for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
revoke all on public.wishlist_items from anon;
grant select, insert, update, delete on public.wishlist_items to authenticated;
