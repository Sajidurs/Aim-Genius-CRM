# Aim Genius — System Design Document

> **Purpose**: This document gives any AI or developer a complete understanding of the project architecture, database schema, security model, frontend structure, and all features. It is the single source of truth for how the system works.

---

## 1. Project Overview

**Aim Genius** is a private candidate database platform for a recruitment company. It connects **admins** (who manage candidates) with **recruiting partners** (who browse, shortlist, and request candidates).

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |
| Backend / Database | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Auth | Supabase Auth (email/password) |
| File Storage | Supabase Storage (3 private buckets + 1 public bucket) |

### Key Design Principles
- **Role-based access**: Two roles — `admin` and `recruiting_partner`. Roles are stored in the `profiles` table (not in JWT `user_metadata`) to prevent privilege escalation.
- **Row-Level Security (RLS)**: Every table has RLS enabled. Partners only see their own data; admins see everything.
- **Client-side routing**: No router library. Navigation is managed via React `useState` in `App.tsx`.
- **No external UI libraries**: Only Tailwind CSS + lucide-react icons.

---

## 2. Application Structure

```
project/
├── src/
│   ├── App.tsx                    # Root component: auth gate + page router
│   ├── main.tsx                   # Vite entry point
│   ├── index.css                  # Tailwind directives + global styles
│   ├── vite-env.d.ts              # Vite type declarations
│   ├── components/
│   │   ├── Layout.tsx             # Sidebar + mobile nav shell
│   │   ├── CandidateCard.tsx      # Reusable candidate card (grid/list)
│   │   └── Badges.tsx              # Availability + request status badges
│   ├── context/
│   │   └── AuthContext.tsx         # Auth provider: session, profile, signIn/signUp/signOut
│   ├── lib/
│   │   └── supabase.ts             # Supabase client initialization
│   ├── pages/
│   │   ├── LoginPage.tsx           # Email/password login + signup
│   │   ├── DashboardPage.tsx       # Admin dashboard with stats
│   │   ├── CandidatesPage.tsx      # Candidate list with search/filter
│   │   ├── CandidateProfilePage.tsx # Full candidate detail (documents, video, activity)
│   │   ├── CandidateFormPage.tsx   # Create/edit candidate (admin only)
│   │   ├── RequestsPage.tsx        # Partner requests / admin request management
│   │   ├── PartnersPage.tsx        # Admin: manage recruiting partners
│   │   ├── ShortlistPage.tsx       # Partner: shortlisted candidates
│   │   ├── ReadyForProcessPage.tsx # Partner: ready-for-process candidates
│   │   └── SettingsPage.tsx        # Profile settings
│   └── types/
│       └── index.ts                # All TypeScript types and constants
├── supabase/
│   ├── config.toml                 # Edge function config
│   ├── functions/
│   │   └── create-partner/
│   │       └── index.ts           # Admin-only edge function to create partner accounts
│   └── migrations/
│       ├── 20260828194151_create_recruitment_platform_schema.sql
│       ├── 20260828194629_fix_prevent_role_escalation.sql
│       ├── 20260829120521_fix_prevent_role_escalation_bootstrap.sql
│       ├── 20260829120609_fix_handle_new_user_search_path.sql
│       ├── 20260829120656_fix_security_advisor_warnings.sql
│       ├── 20260829120711_revoke_trigger_function_execute.sql
│       ├── 20260901191439_add_shortlist_readyforprocess_videos.sql
│       ├── 20260902105847_add_admin_read_shortlist_ready.sql
│       └── 20260902105903_drop_redundant_select_policies.sql
├── public/
│   └── Aim_Genius_New_(2).png      # Logo
├── package.json
├── vite.config.ts                 # Vite config with @ alias to src/
├── tailwind.config.js
├── tsconfig.app.json
└── eslint.config.js
```

### Path Alias
- `@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).
- Example: `import { supabase } from '@/lib/supabase'` resolves to `src/lib/supabase.ts`.

---

## 3. Authentication & Authorization

### Auth Flow
1. User signs in / signs up via `LoginPage.tsx` using Supabase email/password auth.
2. On signup, a Supabase database trigger (`handle_new_user`) auto-creates a row in the `profiles` table with `role = 'recruiting_partner'` (default).
3. `AuthContext.tsx` loads the user's session and profile on mount, and listens to `onAuthStateChange` for session changes.
4. If no session or profile, the app shows `LoginPage`. Otherwise, it shows the main `Layout` with role-specific navigation.

### Role Assignment
- New users default to `recruiting_partner`.
- Only admins can change a user's role (enforced by a database trigger `prevent_role_escalation`).
- Admins create partner accounts via the `create-partner` edge function (which uses the service role key to bypass RLS).

### Role-Based Navigation

**Admin sidebar:**
| Label | Page Key | Icon |
|-------|----------|------|
| Dashboard | `dashboard` | LayoutDashboard |
| Candidates | `candidates` | Users |
| Requests | `requests` | ClipboardList |
| Partners | `partners` | Building2 |
| Settings | `settings` | Settings |

**Partner sidebar:**
| Label | Page Key | Icon |
|-------|----------|------|
| Candidates | `candidates` | Users |
| Shortlist | `shortlist` | Star |
| Ready for Process | `readyForProcess` | CheckCircle2 |
| My Requests | `requests` | ClipboardList |
| Profile | `settings` | UserCircle |

---

## 4. Database Schema

### 4.1 Tables

#### `profiles`
Stores user account metadata. One row per Supabase auth user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | References `auth.users(id)` ON DELETE CASCADE |
| `email` | text UNIQUE | User email |
| `full_name` | text | Display name |
| `role` | text | `'admin'` or `'recruiting_partner'` (default: `recruiting_partner`) |
| `company_name` | text nullable | Partner's company |
| `phone` | text nullable | Contact phone |
| `created_at` | timestamptz | Default `now()` |

**RLS Policies:**
- SELECT: All authenticated users can read all profiles (needed to display partner names on requests).
- INSERT: User can insert only their own profile row.
- UPDATE: User can update only their own profile row.
- **Role escalation prevention**: A trigger (`prevent_role_escalation`) blocks role changes unless the current user is an admin.

#### `candidates`
The core candidate record.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Auto-generated |
| `candidate_id` | text UNIQUE | Human-readable ID (e.g., `CAND-001`) |
| `first_name` | text | |
| `last_name` | text | |
| `age` | integer | |
| `nationality` | text | |
| `location` | text | |
| `german_level` | text | `A1`–`C2` or `None` |
| `english_level` | text | `A1`–`C2` or `None` |
| `other_languages` | text nullable | |
| `profession` | text | Desired position |
| `years_experience` | integer | |
| `education` | text nullable | |
| `professional_experience` | text nullable | |
| `additional_qualifications` | text nullable | |
| `availability` | text | `available`, `placed`, `unavailable`, `pending` |
| `photo_url` | text nullable | Path in `candidate-photos` storage bucket |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated by trigger |
| `created_by` | uuid nullable | References `auth.users(id)` |

**RLS Policies:**
- SELECT: All authenticated users (admin + partners) can read all candidates.
- INSERT / UPDATE / DELETE: Admin only (checked via `EXISTS` subquery on `profiles`).

#### `candidate_documents`
Stores metadata for documents uploaded per candidate.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `candidate_id` | uuid FK | References `candidates(id)` ON DELETE CASCADE |
| `document_type` | text | `cv`, `language_certificate`, `education_certificate`, `work_certificate`, `other` |
| `file_name` | text | Original file name |
| `file_path` | text | Path in `candidate-documents` storage bucket |
| `file_size` | bigint nullable | File size in bytes |
| `uploaded_at` | timestamptz | |

**RLS Policies:**
- SELECT: All authenticated users can read document metadata.
- INSERT / UPDATE / DELETE: Admin only.

#### `candidate_requests`
Tracks partner-to-admin requests for candidates.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `candidate_id` | uuid FK | References `candidates(id)` ON DELETE CASCADE |
| `partner_id` | uuid FK | References `auth.users(id)` ON DELETE CASCADE |
| `status` | text | `pending`, `approved`, `rejected`, `placed` |
| `message` | text nullable | Partner's message to admin |
| `admin_notes` | text nullable | Admin's internal notes |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated by trigger |
| `responded_at` | timestamptz nullable | When admin responded |
| `responded_by` | uuid nullable | Admin who responded |

**RLS Policies:**
- SELECT: Admins see all requests; partners see only their own (`partner_id = auth.uid()`).
- INSERT: Partners can insert requests for themselves only.
- UPDATE / DELETE: Admin only.

#### `partner_shortlist`
Stores candidates a partner has shortlisted. One row per (partner, candidate) pair.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `partner_id` | uuid FK | References `auth.users(id)` ON DELETE CASCADE |
| `candidate_id` | uuid FK | References `candidates(id)` ON DELETE CASCADE |
| `created_at` | timestamptz | |

**Unique constraint:** `(partner_id, candidate_id)` — a candidate appears once per partner.

**RLS Policies:**
- SELECT: Partner sees only their own rows. Admin can read all rows (for partner activity visibility).
- INSERT: Partner can insert only their own rows.
- DELETE: Partner can delete only their own rows.

#### `partner_ready_for_process`
Stores candidates a partner has moved to "Ready for Process" from their shortlist.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `partner_id` | uuid FK | References `auth.users(id)` ON DELETE CASCADE |
| `candidate_id` | uuid FK | References `candidates(id)` ON DELETE CASCADE |
| `created_at` | timestamptz | |

**Unique constraint:** `(partner_id, candidate_id)`.

**RLS Policies:** Same pattern as `partner_shortlist`.

#### `candidate_videos`
Stores metadata for the introduction video uploaded per candidate (admin only). One video per candidate.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `candidate_id` | uuid FK | References `candidates(id)` ON DELETE CASCADE |
| `file_name` | text | Original file name |
| `file_path` | text | Path in `candidate-videos` storage bucket |
| `file_size` | bigint nullable | File size in bytes |
| `uploaded_at` | timestamptz | |

**Unique constraint:** `(candidate_id)` — one video per candidate.

**RLS Policies:**
- SELECT: All authenticated users can read video metadata.
- INSERT / UPDATE / DELETE: Admin only.

### 4.2 Storage Buckets

| Bucket | Public | Purpose | Write Access | Read Access |
|--------|--------|---------|-------------|------------|
| `candidate-photos` | Yes | Candidate profile photos | Admin only | Public (anon + authenticated) |
| `candidate-documents` | No | Candidate documents (CVs, certificates) | Admin only | Authenticated (via signed URLs) |
| `candidate-videos` | No | Candidate introduction videos (max 500 MB) | Admin only | Authenticated (via signed URLs) |

### 4.3 Database Triggers & Functions

| Name | Purpose |
|------|---------|
| `handle_new_user()` | Auto-creates a `profiles` row when a new auth user signs up. SECURITY DEFINER. |
| `prevent_role_escalation()` | Blocks role changes on `profiles` unless the current user is an admin. SECURITY DEFINER. |
| `update_updated_at()` | Auto-updates `updated_at` on `candidates` and `candidate_requests` before UPDATE. |

### 4.4 Indexes

| Table | Column(s) |
|-------|-----------|
| `candidates` | `profession`, `german_level`, `availability`, `candidate_id` |
| `candidate_documents` | `candidate_id` |
| `candidate_requests` | `candidate_id`, `partner_id`, `status` |
| `profiles` | `role` |
| `partner_shortlist` | `(partner_id, candidate_id)` UNIQUE |
| `partner_ready_for_process` | `(partner_id, candidate_id)` UNIQUE |
| `candidate_videos` | `(candidate_id)` UNIQUE |

---

## 5. Edge Functions

### `create-partner`
- **Path:** `supabase/functions/create-partner/index.ts`
- **Config:** `verify_jwt = true` (in `supabase/config.toml`)
- **Purpose:** Allows an admin to create a new recruiting partner account.
- **Flow:**
  1. Verifies the caller's JWT via the anon key client.
  2. Checks the caller's `profiles.role` is `admin` (using service role key).
  3. Creates a new auth user with `email_confirm: true`.
  4. Updates the new user's `profiles` row with `full_name`, `company_name`, `phone`, and `role = 'recruiting_partner'`.
- **CORS:** All responses include standard CORS headers.

---

## 6. Frontend Architecture

### 6.1 Routing
There is no router library. `App.tsx` manages a `useState<Page>` discriminated union:

```typescript
type Page =
  | { name: 'dashboard' }
  | { name: 'candidates' }
  | { name: 'candidateProfile'; candidate: Candidate }
  | { name: 'candidateForm'; candidate?: Candidate }
  | { name: 'requests' }
  | { name: 'partners' }
  | { name: 'settings' }
  | { name: 'shortlist' }
  | { name: 'readyForProcess' };
```

Navigation between pages is done via `setPage()` calls passed as props.

### 6.2 Auth Context (`AuthContext.tsx`)
Provides:
- `session`: Current Supabase auth session (or null).
- `profile`: Current user's `Profile` object (or null).
- `loading`: True while session/profile is loading.
- `signIn(email, password)`: Signs in with email/password.
- `signUp(email, password, fullName)`: Signs up a new user.
- `signOut()`: Signs out and clears state.
- `refreshProfile()`: Re-fetches the profile from the database.

### 6.3 Layout (`Layout.tsx`)
- Fixed sidebar on desktop (left, 256px wide, dark slate-900 background).
- Mobile top bar with logo + sign out.
- Mobile bottom nav with icon tabs.
- Active nav item highlighted with brand color.

### 6.4 Key Pages

#### DashboardPage (Admin only)
- Stats cards: total candidates, available now, professions count, German B2+ count.
- Bar charts: candidates by profession, candidates by German level.
- Recent candidates table (latest 5).

#### CandidatesPage
- Searchable, filterable grid/list of candidates.
- Admin sees "Add Candidate" button.
- Partners see candidates but no add/edit controls.

#### CandidateProfilePage
- Full candidate details: photo, personal info, education, experience, qualifications.
- Documents section: admin can upload/delete; partners can download via signed URLs.
- Introduction video section: admin can upload/replace/delete; partners can watch and download.
- Partner-only actions: Request Candidate, Shortlist, Move to Ready for Process, Move back to Shortlist.
- Admin-only: Edit Profile, Delete, Change Availability, **Partner Activity** section.
- **Partner Activity (admin only):** Shows which partners have shortlisted this candidate and which have moved them to Ready for Process. Partners never see other partners' activity.

#### ShortlistPage (Partner only)
- Shows the partner's shortlisted candidates as cards.
- Each card has a "Move to Ready for Process" button.

#### ReadyForProcessPage (Partner only)
- Shows the partner's ready-for-process candidates as cards.
- Each card has a "Move back to Shortlist" button.

#### RequestsPage
- Partners see their own requests with status badges.
- Admins see all requests and can approve/reject/mark as placed.

#### PartnersPage (Admin only)
- Lists all recruiting partners.
- Admin can create new partner accounts (via `create-partner` edge function).

#### SettingsPage
- User can update their profile (full name, company name, phone).

---

## 7. Partner Workflow

The recruiting partner workflow follows a linear pipeline:

```
Browse Candidates → Shortlist → Ready for Process → Send Request → My Requests
```

1. **Browse Candidates**: Partner views all candidates on the Candidates page.
2. **Shortlist**: Partner clicks "Shortlist" on a candidate's profile. The candidate is added to `partner_shortlist`.
3. **Ready for Process**: From the Shortlist page or candidate profile, partner clicks "Move to Ready for Process". The candidate moves from `partner_shortlist` to `partner_ready_for_process`.
4. **Send Request**: Partner clicks "Request Candidate" on the profile. A row is created in `candidate_requests` with status `pending`.
5. **My Requests**: Partner tracks the status of their requests (pending → approved/rejected/placed).

**Key rules:**
- A candidate can only be in one stage per partner (shortlist OR ready-for-process, not both).
- Moving to Ready for Process automatically removes from Shortlist.
- Moving back to Shortlist automatically removes from Ready for Process.
- Each partner has their own independent shortlist and ready-for-process lists.
- Partners cannot see other partners' shortlists, ready-for-process lists, or requests.

---

## 8. Security Model

### 8.1 RLS Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | All authenticated | Own row only | Own row only | — |
| `candidates` | All authenticated | Admin only | Admin only | Admin only |
| `candidate_documents` | All authenticated | Admin only | Admin only | Admin only |
| `candidate_requests` | Admin: all; Partner: own | Partner: own only | Admin only | Admin only |
| `partner_shortlist` | Partner: own; Admin: all | Partner: own only | — | Partner: own only |
| `partner_ready_for_process` | Partner: own; Admin: all | Partner: own only | — | Partner: own only |
| `candidate_videos` | All authenticated | Admin only | Admin only | Admin only |

### 8.2 Role Escalation Prevention
- A database trigger (`prevent_role_escalation`) fires BEFORE UPDATE on `profiles`.
- If `NEW.role != OLD.role` and the current user is not an admin, it raises an exception.
- The trigger function is `SECURITY DEFINER` so it runs with elevated privileges.

### 8.3 Admin Checks
All admin-only RLS policies use the pattern:
```sql
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
```

### 8.4 Storage Security
- `candidate-photos`: Public read (profile photos are visible to anyone).
- `candidate-documents`: Private — only accessible via signed URLs generated by authenticated clients.
- `candidate-videos`: Private — only accessible via signed URLs. Max file size 500 MB. Allowed MIME types: `video/mp4`, `video/webm`, `video/ogg`, `video/quicktime`.

---

## 9. TypeScript Types

All shared types are defined in `src/types/index.ts`:

| Type | Description |
|------|-------------|
| `UserRole` | `'admin' \| 'recruiting_partner'` |
| `GermanLevel` | `'A1' \| 'A2' \| 'B1' \| 'B2' \| 'C1' \| 'C2' \| 'None'` |
| `Availability` | `'available' \| 'placed' \| 'unavailable' \| 'pending'` |
| `RequestStatus` | `'pending' \| 'approved' \| 'rejected' \| 'placed'` |
| `DocumentType` | `'cv' \| 'language_certificate' \| 'education_certificate' \| 'work_certificate' \| 'other'` |
| `Profile` | User profile (id, email, full_name, role, company_name, phone, created_at) |
| `Candidate` | Full candidate record |
| `CandidateDocument` | Document metadata |
| `CandidateRequest` | Request with optional joined candidate/partner |
| `ShortlistItem` | Shortlist entry with optional joined candidate |
| `ReadyForProcessItem` | Ready-for-process entry with optional joined candidate |
| `CandidateVideo` | Video metadata |
| `CandidateInput` | Input shape for creating/editing candidates |

**Constants:**
- `GERMAN_LEVELS`: Array of all German levels.
- `AVAILABILITY_OPTIONS`: Availability values with labels and colors.
- `REQUEST_STATUS_OPTIONS`: Request statuses with labels and colors.
- `DOCUMENT_TYPES`: Document types with labels.

---

## 10. Migrations (Chronological)

| # | Filename | Purpose |
|---|----------|---------|
| 1 | `20260828194151_create_recruitment_platform_schema.sql` | Creates all base tables, RLS policies, triggers, indexes, and storage buckets. |
| 2 | `20260828194629_fix_prevent_role_escalation.sql` | Adds trigger to prevent non-admins from changing their role. |
| 3 | `20260829120521_fix_prevent_role_escalation_bootstrap.sql` | Fixes the role escalation trigger for bootstrap scenarios. |
| 4 | `20260829120609_fix_handle_new_user_search_path.sql` | Fixes `search_path` on `handle_new_user` function. |
| 5 | `20260829120656_fix_security_advisor_warnings.sql` | Addresses Supabase security advisor warnings. |
| 6 | `20260829120711_revoke_trigger_function_execute.sql` | Revokes EXECUTE on trigger functions from public/anon. |
| 7 | `20260901191439_add_shortlist_readyforprocess_videos.sql` | Adds `partner_shortlist`, `partner_ready_for_process`, `candidate_videos` tables + `candidate-videos` storage bucket. |
| 8 | `20260902105847_add_admin_read_shortlist_ready.sql` | Adds admin SELECT access to shortlist and ready-for-process tables. |
| 9 | `20260902105903_drop_redundant_select_policies.sql` | Drops old partner-only SELECT policies replaced by admin-aware ones. |

---

## 11. Environment & Configuration

### Environment Variables (`.env`)
- `SUPABASE_URL` — Supabase project URL.
- `SUPABASE_ANON_KEY` — Supabase anon key (used by the browser client).
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (used only in edge functions, never exposed to the browser).

### Vite Configuration
- `@` alias maps to `./src`.
- `lucide-react` excluded from dep pre-bundling (optimization).

### Tailwind Configuration
- Custom `brand` color ramp (primary brand color used throughout the UI).
- Standard Tailwind color palette for neutrals, greens, blues, ambers, reds.

---

## 12. Build & Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start dev server (handled automatically by the environment) |
| `build` | `vite build` | Production build |
| `typecheck` | `tsc --noEmit -p tsconfig.app.json` | TypeScript type checking |
| `lint` | `eslint .` | Lint the codebase |
| `preview` | `vite preview` | Preview the production build locally |
