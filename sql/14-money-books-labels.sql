-- ============================================================
-- WANG' KALAM AGOK BUK — Money: Personal and Business, and labels
-- Run after 13-money.sql. Safe to re-run.
--
-- book: every account, category and line is 'personal' or 'business'.
--   An account's book is the default for its lines; a line can say
--   otherwise (a business cost paid from the personal M-Pesa).
--   Money moved between a personal and a business account (paying
--   yourself, putting money in) is a transfer, not spending.
-- money_labels: the bills and people paid again and again, named:
--   "Electricity (house)", "Water", "Rent", "Mama Mboga". A label
--   matches lines by any of its words: a paybill or till name, an
--   account number, a phone number ("KPLC", "37188812345"). It brings
--   its category, book and budget item with it.
-- ============================================================

alter table public.money_accounts   add column if not exists book text not null default 'personal';
alter table public.money_categories add column if not exists book text not null default 'personal';
alter table public.money_tx         add column if not exists book text not null default 'personal';

do $$
declare t text;
begin
  foreach t in array array['money_accounts', 'money_categories', 'money_tx'] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_book_check');
    execute format('alter table public.%I add constraint %I check (book in (''personal'', ''business''))', t, t || '_book_check');
  end loop;
end $$;

create table if not exists public.money_labels (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null default '',
  icon        text not null default '',
  matches     text[] not null default '{}',   -- any of these in the payee or note
  category_id uuid references public.money_categories(id) on delete set null,
  book        text not null default 'personal' check (book in ('personal', 'business')),
  budget_item_id uuid references public.budget_items(id) on delete set null,
  archived    boolean not null default false,
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists money_labels_owner_idx on public.money_labels (owner_id, sort);

alter table public.money_tx add column if not exists label_id uuid references public.money_labels(id) on delete set null;
create index if not exists money_tx_label_idx on public.money_tx (label_id);
create index if not exists money_tx_book_idx on public.money_tx (owner_id, book, occurred_at desc);

alter table public.money_labels enable row level security;
drop policy if exists "owner reads money_labels" on public.money_labels;
create policy "owner reads money_labels" on public.money_labels for select using (owner_id = auth.uid());
drop policy if exists "owner writes money_labels" on public.money_labels;
create policy "owner writes money_labels" on public.money_labels for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
revoke all on public.money_labels from anon;
grant select, insert, update, delete on public.money_labels to authenticated;

-- The monthly totals now split by book and label too (new columns, so drop and make again).
drop view if exists public.money_monthly;
create view public.money_monthly with (security_invoker = true) as
select to_char(t.occurred_at at time zone 'Africa/Nairobi', 'YYYY-MM') as month,
       t.kind, t.category_id, t.source, t.book, t.label_id,
       sum(t.amount) as total, sum(t.fee) as fees, count(*) as n
  from public.money_tx t
 group by 1, 2, 3, 4, 5, 6;
revoke all on public.money_monthly from anon;
grant select on public.money_monthly to authenticated;
