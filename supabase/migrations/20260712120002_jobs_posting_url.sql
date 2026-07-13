-- Job posting link, shown as a link-out on cards and in the edit panel.
alter table public.jobs add column if not exists posting_url text;
