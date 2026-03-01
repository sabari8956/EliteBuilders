# Supabase Setup (Epic 1)

## Credentials used locally

Configured in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Create database objects

1. Open your Supabase project SQL editor:
   - `https://supabase.com/dashboard/project/rmfefgnctmpodetaopdx/sql/new`
2. Paste and run:
   - `supabase/migrations/20260301_220000_epic1_core.sql`

This creates:

- `user_profiles`
- `challenges`
- `submissions`
- deterministic prefixed IDs (`usr_`, `chl_`, `sub_`)
- indexes, update triggers, and permissive MVP RLS policies

## Notes

- Epic 1 APIs now use Supabase when env vars are present.
- If Supabase env vars are missing, code falls back to in-memory storage for tests/local offline runs.
- For tighter production security, replace permissive policies and set `SUPABASE_SERVICE_ROLE_KEY` for server-only privileged writes.
