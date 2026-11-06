# Provenly — architecture notes

## Shape of the system
Next.js 15 (App Router, React 19, strict TypeScript) talks to Supabase (Postgres + Auth + Storage). All reads and writes made for a signed-in user go through that user's session, so **Row Level Security is the real access control**. The only elevated key (`SUPABASE_SERVICE_ROLE_KEY`) is used in one place: deleting the account.

```
Browser ──► Next.js server components / server actions ──► Supabase (RLS as the user)
Visitor ──► /s/[token] (server) ──► RPC get_shared_dashboard (SECURITY DEFINER) ──► stripped JSON ──► HTML
```

## Data model
- `profiles` (1:1 with auth.users, created by trigger), `dashboards`, `dashboard_fields`, `projects`, `share_links`, `share_link_views`, `share_link_attempts`, `activity_log`.
- A project's values live in `projects.data` (JSONB keyed by **field id**). Renaming a field never touches data. Removing a field only sets `archived_at`; values stay in `data` and are preserved by later edits.
- Money is stored as integers in minor units (paise/cents). Formatting uses `Intl` and the field's currency.
- `start_date`, `end_date`, `amount_minor`, `status` are indexed columns filled by a trigger from the field *roles* (`title`, `amount`, `spent`, `profit`, `start`, `end`, `client`, `status`, `tags`, …). Roles are how analytics understand any custom schema.
- Validation: Zod schemas are generated at runtime from the field definitions (`lib/validators/project.ts`) and used by the form (client) and by every server action (authoritative). Unknown keys are stripped.

## Sharing and the privacy guarantee
1. `build_shared_payload()` (never granted to API roles) builds the viewer JSON. It removes hidden fields from the field list **and** from every project's `data` using a whitelist of visible field ids.
2. A formula field is hidden whenever anything it is computed from is hidden. A `profit`-role field is hidden when `amount` or `spent` is hidden (it would reveal them).
3. Analytics for a shared page are computed on the server **from that stripped payload**, so a hidden amount can never appear in a chart, KPI or breakdown.
4. `anon` has no table privileges. Its only entry points are `get_shared_dashboard`, `get_public_profile`. Tokens are 192-bit random hex.
5. Passwords use bcrypt (`pgcrypto crypt`); failed attempts are counted per link (8 per 15 minutes locks it). The unlocked password is kept in an httpOnly cookie scoped to that link's path.
6. Proof: `supabase/tests/share_leak_test.sql` (database level) and `e2e/share-privacy.spec.ts` (browser level: HTML + every network response).

## Analytics
`features/analytics/compute.ts` is pure TypeScript: `normalize()` turns rows into typed items using field roles, `computeAnalytics()` builds buckets for week/month/quarter/year, KPIs with previous-period deltas, sparklines, heatmap, breakdowns, best month, top client, streaks. It runs in server components, never in the browser; the client component only toggles between the four precomputed results. Home combines dashboards after converting to the profile's base currency (approximate static rates in `lib/currency.ts`).

## UI
Plain CSS design tokens (`app/globals.css`), self-hosted fonts via `@fontsource` (no external font requests), dark first with light and system modes, accent colour per dashboard through the `--accent` CSS variable. Charts are small server-rendered SVG components. The projects table is custom (virtualised rows, resize, reorder, hide, multi-sort, inline edit) so it does not look like a default table.

## Deliberate choices
- Plain CSS and hand-built SVG charts instead of Tailwind/shadcn/Recharts/Framer Motion: far fewer dependencies, fully server-renderable, nothing to version-conflict.
- Auth rate limiting is Supabase's built-in limiter plus a short client cooldown.
- Public profile pages are listed nowhere (no sitemap entry) until you add a listing RPC; they are still indexable by direct link.
