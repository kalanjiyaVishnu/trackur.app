-- Follow-up log: one row per contact with a point of contact about a job —
-- who was spoken to, what was said, when, and when to chase next.
-- Entries stay editable after they're written (unlike job_events, which is an
-- immutable trigger-written audit trail).

create table if not exists public.job_followups (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  poc_name text,
  poc_role text,
  poc_email text,
  conversation text,
  -- Date the contact happened. Defaults to today in the client, not the DB, so
  -- back-dating an entry is possible.
  followed_up_on date,
  -- Optional reminder for the next touchpoint.
  next_follow_up date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ordered newest-first within a job; next_follow_up drives the reminders view.
create index if not exists job_followups_job_id_idx
  on public.job_followups (job_id, followed_up_on desc, created_at desc);

create index if not exists job_followups_next_follow_up_idx
  on public.job_followups (user_id, next_follow_up)
  where next_follow_up is not null;

alter table public.job_followups enable row level security;

create policy "job_followups_select_own"
  on public.job_followups for select
  using (auth.uid() = user_id);

create policy "job_followups_insert_own"
  on public.job_followups for insert
  with check (auth.uid() = user_id);

create policy "job_followups_update_own"
  on public.job_followups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "job_followups_delete_own"
  on public.job_followups for delete
  using (auth.uid() = user_id);

-- set_updated_at() is defined in 00000000000000_baseline.sql.
drop trigger if exists job_followups_set_updated_at on public.job_followups;
create trigger job_followups_set_updated_at
  before update on public.job_followups
  for each row execute function public.set_updated_at();
