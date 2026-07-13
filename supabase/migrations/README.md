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

Note: this folder only covers changes from July 2026 onward. The base schema
(`jobs`, `resumes`, `gdrive_tokens`, `profiles` tables and their RLS policies)
predates it — worth back-filling into a `00000000000000_baseline.sql` by
running `supabase db dump` someday.
