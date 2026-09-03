# Changes Log

A chronological record of all changes made to the Aim Genius recruitment platform.

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
