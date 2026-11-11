-- ============================================================
-- WANG' KALAM AGOK BUK — Money
-- Run after 12-blog-marcus-aurelius.sql (needs 07-budget.sql and
-- 09-wishlist.sql). Safe to re-run.
--
-- What came in, what went out and where it sits.
--   money_accounts    M-Pesa, cash, bank, savings, and loans (Fuliza,
--                     M-Shwari, Hustler Fund…). opening is the balance
--                     on the day the account was added; a loan's is
--                     negative (what is owed).
--   money_categories  what money is spent on or comes from, each with an
--                     optional monthly limit.
--   money_tx          one line each: an expense, income, or a transfer
--                     between two accounts (withdrawing cash, paying a
--                     loan, Fuliza covering a payment). fee is the
--                     transaction cost, taken from the paying account.
--                     ref is the M-Pesa code, unique, so one payment is
--                     never logged twice (the phone app reads the SMS).
--                     A line can name the budget item it pays and the
--                     wish it bought.
--   money_balances    view: every account's balance now.
--   money_monthly     view: totals per month, kind and category
--                     (Nairobi time), for the charts.
-- Receipts go in the private "receipts" bucket under <user id>/….
-- Private like the rest: every row belongs to the signed-in user.
-- ============================================================

create table if not exists public.money_accounts (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null default '',
  kind       text not null default 'mpesa' check (kind in ('mpesa', 'cash', 'bank', 'card', 'savings', 'loan')),
  opening    numeric not null default 0,   -- KES; negative for what a loan owes
  credit_limit numeric,                    -- a loan's limit (Fuliza), if any
  archived   boolean not null default false,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists money_accounts_owner_idx on public.money_accounts (owner_id, sort);

create table if not exists public.money_categories (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null default '',
  kind       text not null default 'expense' check (kind in ('expense', 'income')),
  icon       text not null default '',
  monthly_limit numeric,                   -- KES a month; empty = no limit
  archived   boolean not null default false,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists money_categories_owner_idx on public.money_categories (owner_id, kind, sort);

create table if not exists public.money_tx (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  occurred_at   timestamptz not null default now(),
  kind          text not null default 'expense' check (kind in ('expense', 'income', 'transfer')),
  amount        numeric not null check (amount >= 0),
  fee           numeric not null default 0 check (fee >= 0),
  account_id    uuid references public.money_accounts(id) on delete set null,
  to_account_id uuid references public.money_accounts(id) on delete set null,   -- transfers only
  category_id   uuid references public.money_categories(id) on delete set null,
  budget_item_id   uuid references public.budget_items(id) on delete set null,
  wishlist_item_id uuid references public.wishlist_items(id) on delete set null,
  payee         text not null default '',   -- who was paid / who paid
  note          text not null default '',
  ref           text not null default '',   -- M-Pesa code
  source        text not null default 'manual' check (source in ('manual', 'sms', 'adjust')),
  receipt_path  text not null default '',   -- in the receipts bucket
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists money_tx_owner_idx on public.money_tx (owner_id, occurred_at desc);
create index if not exists money_tx_account_idx on public.money_tx (account_id);
create index if not exists money_tx_to_account_idx on public.money_tx (to_account_id);
create index if not exists money_tx_budget_idx on public.money_tx (budget_item_id);
create unique index if not exists money_tx_ref_idx on public.money_tx (owner_id, ref) where ref <> '';

do $$
declare t text;
begin
  foreach t in array array['money_accounts', 'money_categories', 'money_tx'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner reads %s" on public.%I', t, t);
    execute format('create policy "owner reads %s" on public.%I for select using (owner_id = auth.uid())', t, t);
    execute format('drop policy if exists "owner writes %s" on public.%I', t, t);
    execute format('create policy "owner writes %s" on public.%I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------------- Views (run as the signed-in user, so RLS applies) ----------------
create or replace view public.money_balances with (security_invoker = true) as
select a.id as account_id,
       a.opening + coalesce((
         select sum(e.delta) from (
           select case t.kind when 'income' then t.amount - t.fee else -(t.amount + t.fee) end as delta
             from public.money_tx t where t.account_id = a.id
           union all
           select t.amount from public.money_tx t where t.kind = 'transfer' and t.to_account_id = a.id
         ) e), 0) as balance,
       (select max(t.occurred_at) from public.money_tx t where t.account_id = a.id or t.to_account_id = a.id) as last_at
  from public.money_accounts a;

create or replace view public.money_monthly with (security_invoker = true) as
select to_char(t.occurred_at at time zone 'Africa/Nairobi', 'YYYY-MM') as month,
       t.kind, t.category_id, t.source,
       sum(t.amount) as total, sum(t.fee) as fees, count(*) as n
  from public.money_tx t
 group by 1, 2, 3, 4;

revoke all on public.money_balances, public.money_monthly from anon;
grant select on public.money_balances, public.money_monthly to authenticated;

-- ---------------- Receipts bucket (private) ----------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "receipts: owner reads" on storage.objects;
create policy "receipts: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "receipts: owner uploads" on storage.objects;
create policy "receipts: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "receipts: owner updates" on storage.objects;
create policy "receipts: owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "receipts: owner deletes" on storage.objects;
create policy "receipts: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
