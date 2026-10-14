-- ============================================================
-- WANG' KALAM AGOK BUK — the daily "Have a clear conscience" ticks
-- Run after 03-blog-gallery.sql. Safe to re-run.
--
-- Each day's plan keeps which points of the checklist (from "All I
-- Want", 2014) were done that day, as a list of their texts.
-- ============================================================

alter table public.day_plans add column if not exists habits jsonb not null default '[]'::jsonb;
