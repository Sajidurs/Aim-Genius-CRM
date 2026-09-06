# Changes Log

A chronological record of all changes made to the Aim Genius recruitment platform.

---

## September 6, 2026

### Connected the app to our own Supabase project
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` to our own Supabase
  project (ref `iqbysznagzljpeudoqwc`). Verified the production build inlines them.
- Moved the credentials out of `.env.example` and back into `.env`. `.env.example`
  is committed to git and is only a placeholder template; `.env` is gitignored and
  is the file Vite actually loads. Restored `.env.example` to its placeholder values.
- Set `project_id = "iqbysznagzljpeudoqwc"` in `supabase/config.toml` so the
  Supabase CLI can link to the project.

### Fixed the white screen — lucide-react was not being pre-bundled
- The Bolt template set `optimizeDeps.exclude = ['lucide-react']` in `vite.config.ts`.
  That is a WebContainer-specific workaround and is harmful in local development:
  it made the browser fetch all 1534 icon modules as individual requests, which
  stalled the page on a blank white screen before React could mount.
- Changed to `optimizeDeps.include = ['lucide-react']` and cleared `node_modules/.vite`.
  Vite now serves one pre-bundled 1.1 MB file in ~50 ms instead of 1534 requests.
- Note the tab title rendered correctly the whole time, which confirmed `index.html`
  was being served fine and the failure was in module loading, not the server.

### Fixed the dev server being unreachable / rendering a blank page
- `vite.config.ts` now sets `server.host = true` so the dev server listens on both
  IPv4 and IPv6. Vite's default on Windows binds only IPv6 `[::1]`, so browsers
  that resolve `localhost` to `127.0.0.1` got a refused connection and a white
  screen. Verified `127.0.0.1:5173`, `localhost:5173`, and `[::1]:5173` all return 200.
- Added `server.strictPort = true`. Previously a second `npm run dev` would silently
  fall back to port 5174, leaving two servers running and making it easy to open the
  wrong one. It now fails with a clear error instead.
- Ruled out during diagnosis: env vars were correctly inlined on both servers,
  Tailwind was compiling, and every module transformed without error.

### Applied the database schema
- Ran `supabase/setup/01_schema.sql` in the SQL Editor of our own project. This
  created all 7 tables, every RLS policy, the 3 trigger functions and their
  triggers, all indexes, the 3 storage buckets, and the 12 storage policies.
- No ownership errors on the `storage.objects` policies — section 6 applied cleanly.

### Verified the schema from outside
- All 7 tables reachable over the REST API: `profiles`, `candidates`,
  `candidate_documents`, `candidate_requests`, `partner_shortlist`,
  `partner_ready_for_process`, `candidate_videos`.
- RLS confirmed enforcing: an anonymous read returns `[]` from every table, and an
  anonymous INSERT into `candidates` is rejected with
  `42501 new row violates row-level security policy`.
- All 3 storage buckets confirmed present, with `candidate-photos` public and
  `candidate-documents` / `candidate-videos` private.
- Database currently holds no rows — no admin account exists yet.

---

## September 5, 2026

### Published to GitHub
- Pushed the repository to `https://github.com/Sajidurs/Aim-Genius-CRM` on branch `main`.
- Confirmed `.env` is excluded from the remote; only `.env.example` is tracked.

---

## September 4, 2026

### Detached the project from Bolt
- Deleted the `.bolt/` directory (Bolt template metadata).
- Replaced the `bolt.new` OG/Twitter image tags in `index.html` with our own logo,
  and added `noindex, nofollow` since this is a private database.
- Replaced the "Open in Bolt" badge in `README.md` with a full setup guide.
- Renamed the package from `vite-react-typescript-starter` to
  `aim-genius-recruitment-crm` and set version to 1.0.0.

### Security
- Removed the hardcoded demo admin credentials (`admin@recruit.de` / `Admin123!`)
  that were rendered on the login page for every visitor. Replaced with an
  invitation-only notice.
- Added a guard in `src/lib/supabase.ts` that throws an actionable error when the
  Supabase env vars are missing or still placeholders, instead of crashing with an
  unclear message.

### Self-hosting setup
- Added `.env` and `.env.example`.
- Added `supabase/setup/01_schema.sql` — all 9 migrations consolidated into a single
  idempotent script to run in the SQL Editor of a fresh project.
- Added `supabase/setup/02_create_first_admin.sql` — the manual bootstrap for the
  first admin account, since the app has no signup screen and `handle_new_user`
  always assigns the `recruiting_partner` role.
- Added `vercel.json` (Vite preset, build command, SPA rewrites).
- Extended `.gitignore` with `.env.local`, `supabase/.temp`, and `.vercel`.
- Initialized the git repository on branch `main`.

---

## September 3, 2026

### Documentation
- Created `SYSTEM_DESIGN.md` — a complete system design document covering project architecture, database schema, security model, frontend structure, edge functions, and all features. Designed for any AI or developer to understand the full project.
- Created `CHANGES.md` — this file, tracking all recent changes.

---

## September 2, 2026

### Partner Activity Visibility (Admin Only)
- Added a "Partner Activity" section to the admin candidate profile page.
- Admins can now see which partners have shortlisted a candidate and which have moved them to Ready for Process.
- The section displays partner company names (or partner names if no company is set) under two headings: "Shortlisted by" and "Ready for Process".
- Partners cannot see other partners' activity — this is strictly admin-only.
- The existing shortlist and ready-for-process workflow is unchanged.

### Database Migrations
- `20260902105847_add_admin_read_shortlist_ready.sql` — Added admin SELECT access to `partner_shortlist` and `partner_ready_for_process` tables. The new SELECT policies allow both the owning partner and admins to read rows.
- `20260902105903_drop_redundant_select_policies.sql` — Dropped the old partner-only SELECT policies (`shortlist_select_own`, `ready_select_own`) that were superseded by the new admin-aware policies.

---

## September 1, 2026

### Shortlist Feature
- Added a "Shortlist" button to the candidate profile page for recruiting partners.
- Clicking "Shortlist" adds the candidate to the partner's private shortlist (stored in `partner_shortlist` table).
- The button toggles to "Shortlisted ✓" and clicking again removes the candidate.
- Each partner has their own independent shortlist.
- Created `ShortlistPage.tsx` — a dedicated page showing the partner's shortlisted candidates as cards.

### Ready for Process Feature
- Added a "Move to Ready for Process" button on the Shortlist page and on the candidate profile (when shortlisted).
- Moving to Ready for Process removes the candidate from Shortlist and adds them to `partner_ready_for_process`.
- Created `ReadyForProcessPage.tsx` — a dedicated page showing the partner's ready-for-process candidates.
- Added a "Move back to Shortlist" button on the Ready for Process page and candidate profile.

### Candidate Introduction Videos
- Added a video section to the candidate profile page.
- Admins can upload one introduction video per candidate (max 500 MB, MP4/WebM/OGG/QuickTime).
- Admins can replace or delete the video.
- Partners can watch and download the video but cannot upload, replace, or delete it.
- Videos are stored in a private Supabase Storage bucket (`candidate-videos`) and accessed via signed URLs.

### Navigation
- Updated `App.tsx` partner sidebar to include "Shortlist" and "Ready for Process" menu items.
- Partner sidebar order: Candidates → Shortlist → Ready for Process → My Requests → Profile.

### Database Migration
- `20260901191439_add_shortlist_readyforprocess_videos.sql` — Created three new tables:
  - `partner_shortlist` (partner_id, candidate_id, created_at) with unique constraint on (partner_id, candidate_id).
  - `partner_ready_for_process` (partner_id, candidate_id, created_at) with unique constraint on (partner_id, candidate_id).
  - `candidate_videos` (candidate_id, file_name, file_path, file_size, uploaded_at) with unique constraint on (candidate_id).
- Created `candidate-videos` private storage bucket (500 MB limit, video MIME types only).
- Added RLS policies for all three tables: partner-scoped SELECT/INSERT/DELETE for shortlist and ready-for-process; admin-only INSERT/UPDATE/DELETE and authenticated SELECT for videos.

### TypeScript Types
- Added `ShortlistItem`, `ReadyForProcessItem`, and `CandidateVideo` interfaces to `src/types/index.ts`.

---

## August 29, 2026

### Security Fixes
- `20260829120521_fix_prevent_role_escalation_bootstrap.sql` — Fixed the role escalation trigger for bootstrap scenarios.
- `20260829120609_fix_handle_new_user_search_path.sql` — Fixed `search_path` on the `handle_new_user` function to prevent search path injection.
- `20260829120656_fix_security_advisor_warnings.sql` — Addressed Supabase security advisor warnings.
- `20260829120711_revoke_trigger_function_execute.sql` — Revoked EXECUTE permissions on trigger functions from public and anon roles.

---

## August 28, 2026

### Initial Project Setup
- Created the base Vite + React + TypeScript project with Tailwind CSS.
- Configured `@/` path alias to `src/` in `vite.config.ts` and `tsconfig.app.json`.

### Database Schema
- `20260828194151_create_recruitment_platform_schema.sql` — Created the complete initial schema:
  - `profiles` table (id, email, full_name, role, company_name, phone, created_at) with RLS.
  - `candidates` table (full candidate record with 20+ fields) with RLS.
  - `candidate_documents` table (document metadata) with RLS.
  - `candidate_requests` table (partner requests with status tracking) with RLS.
  - Database triggers: `handle_new_user` (auto-create profile on signup), `update_updated_at` (auto-update timestamps).
  - Indexes on key query columns.
  - Storage buckets: `candidate-photos` (public), `candidate-documents` (private).

### Role Escalation Prevention
- `20260828194629_fix_prevent_role_escalation.sql` — Added a trigger (`prevent_role_escalation`) that blocks non-admin users from changing their own role.

### Edge Function
- Created `create-partner` edge function — allows admins to create new recruiting partner accounts. Verifies caller is admin, creates auth user with confirmed email, and sets profile metadata. Uses service role key for privileged operations.

### Frontend Pages
- `LoginPage.tsx` — Email/password authentication with signup support.
- `DashboardPage.tsx` — Admin dashboard with stats cards, charts, and recent candidates.
- `CandidatesPage.tsx` — Searchable/filterable candidate grid with admin add/edit controls.
- `CandidateProfilePage.tsx` — Full candidate detail view with documents, availability controls, and partner actions.
- `CandidateFormPage.tsx` — Create/edit candidate form (admin only).
- `RequestsPage.tsx` — Partner request list and admin request management.
- `PartnersPage.tsx` — Admin partner management with account creation.
- `SettingsPage.tsx` — User profile settings.

### Components
- `Layout.tsx` — Responsive sidebar + mobile nav shell.
- `CandidateCard.tsx` — Reusable candidate card component.
- `Badges.tsx` — Availability and request status badge components.

### Auth & State
- `AuthContext.tsx` — Auth provider with session management, profile loading, and `onAuthStateChange` listener.
- `supabase.ts` — Supabase client initialization.
- `types/index.ts` — All TypeScript types and constants.
