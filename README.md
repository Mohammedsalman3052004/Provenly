# Provenly

Project portfolio dashboards for freelancers and agencies: custom fields, a pro table, analytics, and share links that hide fields on the server.

**Stack:** Next.js 15 · TypeScript (strict) · Supabase (Postgres, Auth, Storage, RLS) · Google login · no email verification.

## Quick start
1. Follow `docs/Provenly-Setup-Guide.pdf` (Supabase project, run 4 SQL files, Google OAuth, disable email confirmation).
2. `cp .env.example .env.local` and fill the values.
3. `npm install && npm run dev` → http://localhost:3000

## Scripts
`npm run dev` · `npm run build` · `npm test` (unit) · `npm run typecheck` · `npm run lint` · `npm run test:e2e` (needs a live Supabase)

## Database
Run in the Supabase SQL editor, in order: `supabase/migrations/0001_schema.sql`, `0002_security.sql`, `0003_rpc.sql`, `0004_grants.sql`.
Optional: `supabase/seed.sql` (demo data) and `supabase/tests/share_leak_test.sql` (privacy proof).

See `docs/ARCHITECTURE.md`.
