-- ============================================================
-- WANG' KALAM AGOK BUK — the CMS
-- Run after 07-budget.sql. Safe to re-run.
-- If you ever re-run 03-blog-gallery.sql, run this one again after it:
-- 03 takes away the public site's read access.
--
-- site_content: your own version of the built-in content (the
-- affirmation, the clear conscience list, prompts, routines, Systems
-- cards, breathing techniques, The Way...) and the menu. One row per
-- part; no row means the original. 'public_site' holds the public
-- site's title, tagline, about and whether it is switched on.
-- pages: pages you build from blocks (heading, text, image, checklist,
-- quote, divider), shown in the menu if you like.
--
-- The public site (public.html) reads without signing in, and sees only
-- what you mark public: published blog posts marked public, public
-- pages, public gallery pictures (and the pictures those posts and
-- pages use), and the 'public_site' row while it is switched on.
-- Everything else stays private to the signed-in owner.
-- ============================================================

create table if not exists public.site_content (
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, key)
);

alter table public.site_content enable row level security;
drop policy if exists "owner reads content" on public.site_content;
create policy "owner reads content" on public.site_content for select
  using (owner_id = auth.uid());
drop policy if exists "owner writes content" on public.site_content;
create policy "owner writes content" on public.site_content for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
drop policy if exists "anyone reads the public site" on public.site_content;
create policy "anyone reads the public site" on public.site_content for select to anon
  using (key = 'public_site' and coalesce((value->>'enabled')::boolean, false));
grant select, insert, update, delete on public.site_content to authenticated;
grant select on public.site_content to anon;

create table if not exists public.pages (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null default '',
  slug       text not null,
  icon       text not null default 'page',
  grp        text not null default 'Keep',
  blocks     jsonb not null default '[]'::jsonb,
  in_menu    boolean not null default true,
  public     boolean not null default false,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

alter table public.pages enable row level security;
drop policy if exists "owner reads pages" on public.pages;
create policy "owner reads pages" on public.pages for select
  using (owner_id = auth.uid());
drop policy if exists "owner writes pages" on public.pages;
create policy "owner writes pages" on public.pages for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
drop policy if exists "anyone reads public pages" on public.pages;
create policy "anyone reads public pages" on public.pages for select to anon
  using (public);
grant select, insert, update, delete on public.pages to authenticated;
grant select on public.pages to anon;

-- Blog posts: public once published and marked public.
alter table public.blog_posts add column if not exists public boolean not null default false;
drop policy if exists "anyone reads public posts" on public.blog_posts;
create policy "anyone reads public posts" on public.blog_posts for select to anon
  using (public and status = 'published');
grant select on public.blog_posts to anon;

-- Gallery: a picture marked public, or one a public post or page uses.
alter table public.gallery_items add column if not exists public boolean not null default false;
drop policy if exists "anyone reads public pictures" on public.gallery_items;
create policy "anyone reads public pictures" on public.gallery_items for select to anon
  using (
    public
    or exists (select 1 from public.blog_posts b where b.cover_id = gallery_items.id and b.public and b.status = 'published')
    or exists (select 1 from public.pages p where p.public
               and p.blocks @> jsonb_build_array(jsonb_build_object('gallery_id', gallery_items.id::text)))
  );
grant select on public.gallery_items to anon;

-- The picture files themselves: readable when the row above is.
drop policy if exists "anyone reads public picture files" on storage.objects;
create policy "anyone reads public picture files" on storage.objects for select to anon
  using (bucket_id = 'gallery' and exists (select 1 from public.gallery_items g where g.path = storage.objects.name));
