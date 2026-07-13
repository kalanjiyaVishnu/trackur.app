-- Archive support: null = active, timestamp = when the job was archived.
-- Archived jobs are hidden from the board/table by default.
alter table public.jobs add column if not exists archived_at timestamptz;
