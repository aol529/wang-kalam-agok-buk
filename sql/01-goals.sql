-- ============================================================
-- WANG' KALAM AGOK BUK — vision board goals
-- Run first, in the Supabase SQL editor. Safe to re-run.
--
-- One row per goal. Each goal sits in a life area (the seven Bells n
-- Barz blog categories), on a level of the hierarchy of needs (1
-- Physiological … 5 Self-actualisation) and in a quadrant of the
-- urgent/important grid (the two flags). The site is private: every row
-- belongs to the signed-in user and nobody else can read it.
-- ============================================================

create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null,
  notes       text not null default '',
  next_step   text not null default '',
  category    text not null check (category in (
                'Recreation', 'Health & Appearance', 'Wealth & Finance',
                'Love & Relationships', 'Community & Charity', 'Career',
                'Personal Development')),
  need_level  smallint not null default 3 check (need_level between 1 and 5),
  urgent      boolean not null default false,
  important   boolean not null default true,
  image_path  text not null default '',  -- in the vision-images bucket
  image_url   text not null default '',  -- or a link to an image elsewhere
  target_date date,
  done        boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists goals_owner_idx on public.goals (owner_id);

alter table public.goals enable row level security;

drop policy if exists "owner reads goals" on public.goals;
create policy "owner reads goals" on public.goals for select
  using (owner_id = auth.uid());

drop policy if exists "owner writes goals" on public.goals;
create policy "owner writes goals" on public.goals for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

revoke all on public.goals from anon;
grant select, insert, update, delete on public.goals to authenticated;

-- ---------------- Images bucket (private) ----------------
-- Files go under <user id>/…; the site shows them through signed links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vision-images', 'vision-images', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vision images: owner reads" on storage.objects;
create policy "vision images: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'vision-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "vision images: owner uploads" on storage.objects;
create policy "vision images: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'vision-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "vision images: owner updates" on storage.objects;
create policy "vision images: owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'vision-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "vision images: owner deletes" on storage.objects;
create policy "vision images: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'vision-images' and (storage.foldername(name))[1] = auth.uid()::text);
