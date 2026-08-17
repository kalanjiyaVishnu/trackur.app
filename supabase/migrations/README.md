# Database Migrations

Versioned schema changes for the Supabase (PostgreSQL) database. Files are
named `YYYYMMDDHHMMSS_description.sql` (the Supabase CLI convention) and must
be applied in filename order.

**Apply before deploying app code that depends on them** — the client sends
`posting_url` / `archived_at` on every job save, so deploying the app without
these columns breaks job saves.

Two ways to apply:

1. **Dashboard (manual):** paste the file contents into the Supabase SQL
   Editor and run it. Fine for now; you keep this folder as the source of
   truth and history.
2. **Supabase CLI (recommended eventually):** `supabase link` once, then
   `supabase db push` applies any migrations the database hasn't seen yet
   and records them in a `supabase_migrations` table.

Note: `00000000000000_baseline.sql` holds the base schema (`profiles`,
`resumes`, `jobs`, `gdrive_tokens` and their RLS policies), which predates this
folder. It was **reconstructed from the application code**, not dumped from the
original database — column names and types are pinned by `src/services/*.js`
and `api/_lib/google.js`, but nullability, defaults and constraints are
inferences. If you still have access to the original project, replace it with a
real `supabase db dump`.
