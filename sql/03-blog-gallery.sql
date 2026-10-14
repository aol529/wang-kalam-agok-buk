-- ============================================================
-- WANG' KALAM AGOK BUK — blog and gallery
-- Run after 02-journal-planner.sql. Safe to re-run.
--
-- gallery_items: one row per picture in the private "gallery" bucket,
-- with a caption, a category and the day it was taken.
-- blog_posts: posts in the seven life areas (or any category you add),
-- draft or published. The cover is a gallery picture; a post started
-- from a journal entry ("Blog it") remembers which one.
-- Private like the rest: every row belongs to the signed-in user.
-- ============================================================

create table if not exists public.gallery_items (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  path       text not null,                -- in the gallery bucket
  caption    text not null default '',
  category   text not null default '',
  taken_on   date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gallery_items_owner_idx on public.gallery_items (owner_id, taken_on desc);

alter table public.gallery_items enable row level security;
drop policy if exists "owner reads gallery" on public.gallery_items;
create policy "owner reads gallery" on public.gallery_items for select
  using (owner_id = auth.uid());
drop policy if exists "owner writes gallery" on public.gallery_items;
create policy "owner writes gallery" on public.gallery_items for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
revoke all on public.gallery_items from anon;
grant select, insert, update, delete on public.gallery_items to authenticated;

create table if not exists public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title           text not null default '',
  body            text not null default '',
  category        text not null default 'Personal Development',
  status          text not null default 'draft' check (status in ('draft', 'published')),
  published_on    date,
  cover_id        uuid references public.gallery_items(id) on delete set null,
  source_entry_id uuid references public.journal_entries(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists blog_posts_owner_idx on public.blog_posts (owner_id, published_on desc);

alter table public.blog_posts enable row level security;
drop policy if exists "owner reads posts" on public.blog_posts;
create policy "owner reads posts" on public.blog_posts for select
  using (owner_id = auth.uid());
drop policy if exists "owner writes posts" on public.blog_posts;
create policy "owner writes posts" on public.blog_posts for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
revoke all on public.blog_posts from anon;
grant select, insert, update, delete on public.blog_posts to authenticated;

-- ---------------- Gallery bucket (private) ----------------
-- Files go under <user id>/…; the site shows them through signed links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gallery: owner reads" on storage.objects;
create policy "gallery: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "gallery: owner uploads" on storage.objects;
create policy "gallery: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "gallery: owner updates" on storage.objects;
create policy "gallery: owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "gallery: owner deletes" on storage.objects;
create policy "gallery: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);
