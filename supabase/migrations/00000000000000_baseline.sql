-- Baseline schema: the tables that predate this migrations folder
-- (`profiles`, `resumes`, `jobs`, `gdrive_tokens`) plus their RLS policies.
--
-- RECONSTRUCTED from application code, not dumped from the original database.
-- Column names and types are pinned by src/services/*.js and api/_lib/google.js;
-- nullability, defaults and constraints are best-effort inferences. Review
-- before trusting it as history. See README.md in this folder.
--
-- `posting_url` and `archived_at` on `jobs` are deliberately absent here — they
-- are added by 20260712120002 and 20260712120003.

-- Every table scopes rows to the authenticated user via `user_id`, and the
-- clients never send it (see toDb() in the adapters), so it defaults to
-- auth.uid() on insert.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- One row per user, keyed by the auth user id itself: profileService.getProfile()
-- selects with no filter and expects at most one row back, and updateProfile()
-- filters on `id`.

create table if not exists public.profiles (
  id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  country text,
  agreed_to_terms boolean not null default false,
  agreed_at timestamptz,
  industries jsonb not null default '[]'::jsonb,
  job_titles jsonb not null default '[]'::jsonb,
  setup_complete boolean not null default false,
  notify_due_today boolean not null default true,
  notify_overdue boolean not null default true,
  notify_due_tomorrow boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No delete policy: account deletion cascades from auth.users.

-- profileService never sends updated_at, so the database maintains it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- resumes
-- ---------------------------------------------------------------------------
-- Two kinds of row, discriminated by `source`:
--   'trackur' — file uploaded to R2, `storage_path` set, external_* null
--   'gdrive'  — file linked from Google Drive, `storage_path` null,
--               `external_id` set (see resumeAdapter.linkDriveFile)

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  filename text not null,
  label text,
  storage_path text,
  file_size bigint,
  source text not null default 'trackur',
  external_id text,
  external_mime_type text,
  external_icon_url text,
  created_at timestamptz not null default now(),
  constraint resumes_source_check check (source in ('trackur', 'gdrive'))
);

create index if not exists resumes_user_id_idx
  on public.resumes (user_id, created_at desc);

-- linkDriveFile() treats a 23505 on insert as "another tab linked this file
-- first", so the same Drive file can only be linked once per user.
create unique index if not exists resumes_user_external_id_key
  on public.resumes (user_id, external_id)
  where source = 'gdrive';

alter table public.resumes enable row level security;

create policy "resumes_select_own"
  on public.resumes for select
  using (auth.uid() = user_id);

create policy "resumes_insert_own"
  on public.resumes for insert
  with check (auth.uid() = user_id);

create policy "resumes_update_own"
  on public.resumes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "resumes_delete_own"
  on public.resumes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  stage text not null,
  date_applied date,
  -- Array of { id, text, completed } objects — see JobCard.jsx.
  todos jsonb not null default '[]'::jsonb,
  notes text,
  -- resumeAdapter.remove() relies on this nulling out rather than cascading.
  resume_id uuid references public.resumes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Mirrors STAGES in src/constants.js. Drop this constraint if you'd rather
  -- not have stage names pinned in the database.
  constraint jobs_stage_check check (stage in (
    'Opportunity', 'Applied', 'Screening', 'Interviewing',
    'Offer', 'Rejected', 'Ghosted', 'Accepted'
  ))
);

-- getAll() orders by created_at desc; replaceAll() deletes by created_at range.
create index if not exists jobs_user_id_created_at_idx
  on public.jobs (user_id, created_at desc);

create index if not exists jobs_resume_id_idx
  on public.jobs (resume_id);

alter table public.jobs enable row level security;

create policy "jobs_select_own"
  on public.jobs for select
  using (auth.uid() = user_id);

create policy "jobs_insert_own"
  on public.jobs for insert
  with check (auth.uid() = user_id);

create policy "jobs_update_own"
  on public.jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "jobs_delete_own"
  on public.jobs for delete
  using (auth.uid() = user_id);

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- gdrive_tokens
-- ---------------------------------------------------------------------------
-- Google OAuth tokens. Touched only by api/_lib/google.js through the service
-- role key, which bypasses RLS — so RLS is on with no policies at all, making
-- the table unreachable from the browser with the anon key.

create table if not exists public.gdrive_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expiry timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gdrive_tokens enable row level security;
