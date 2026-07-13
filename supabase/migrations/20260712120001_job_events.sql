-- Stage history: one row per stage transition, plus one row when a job is
-- created. Rows are written exclusively by the trigger below — clients have
-- read-only access via RLS.

create table if not exists public.job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null,
  from_stage text,
  to_stage text not null,
  created_at timestamptz not null default now()
);

create index if not exists job_events_job_id_idx
  on public.job_events (job_id, created_at);

create index if not exists job_events_user_id_idx
  on public.job_events (user_id);

alter table public.job_events enable row level security;

-- Owners can read their own history. No insert/update/delete policies exist:
-- clients cannot write to this table at all. The trigger function below runs
-- as its definer (the table owner), which bypasses RLS for the insert.
create policy "job_events_select_own"
  on public.job_events for select
  using (auth.uid() = user_id);

create or replace function public.log_job_stage_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.job_events (job_id, user_id, from_stage, to_stage)
    values (new.id, new.user_id, null, new.stage);
  elsif tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    insert into public.job_events (job_id, user_id, from_stage, to_stage)
    values (new.id, new.user_id, old.stage, new.stage);
  end if;
  return new;
end;
$$;

drop trigger if exists job_stage_event_trigger on public.jobs;
create trigger job_stage_event_trigger
  after insert or update of stage on public.jobs
  for each row execute function public.log_job_stage_event();
