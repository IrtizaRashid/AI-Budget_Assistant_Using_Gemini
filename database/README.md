# database/

Postgres schema for Supabase.

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**.
3. Paste the full contents of [`supabase_schema.sql`](./supabase_schema.sql) and click **Run**.

This creates all tables, indexes, triggers, and row-level security policies.

## Files

| File | Purpose |
| --- | --- |
| `supabase_schema.sql` | Canonical schema — run once per Supabase project |

## Connection

The backend connects via the **Transaction pooler** connection string (port **6543**), set as `DATABASE_URL` in `backend/.env`. Get it from Supabase → **Project Dashboard → Connect → Transaction pooler**.
