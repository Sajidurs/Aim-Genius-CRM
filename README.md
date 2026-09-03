# Aim Genius — Recruitment CRM

A private candidate database connecting admins (who manage candidates) with recruiting
partners (who browse, shortlist, and request candidates).

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS, backed by Supabase
(PostgreSQL, Auth, Storage, Edge Functions).

See [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) for the full architecture, schema, and
security model, and [CHANGES.md](CHANGES.md) for the change history.

---

## Setup

### 1. Create your Supabase project

At [supabase.com](https://supabase.com), create a new project. Note down, from
**Project Settings → API**:

- the **Project URL**
- the **anon / public** key

and from **Project Settings → General**, the **Reference ID** (your project ref).

### 2. Build the database

In the Supabase Dashboard, open **SQL Editor → New query**, then:

1. Paste the whole of [`supabase/setup/01_schema.sql`](supabase/setup/01_schema.sql) and run it.
   This creates all 7 tables, RLS policies, triggers, indexes, the 3 storage
   buckets, and the storage policies.
2. Confirm under **Storage** that `candidate-photos` (public),
   `candidate-documents` (private), and `candidate-videos` (private) all exist.

> The files in [`supabase/migrations/`](supabase/migrations/) are the original
> incremental history. `01_schema.sql` is their consolidated final state — you
> only need one or the other, not both.

### 3. Create your first admin

The app has no signup screen and new users are always created as
`recruiting_partner`, so the first admin is made by hand:

1. **Authentication → Users → Add user**. Enter your email and a strong password,
   and tick **Auto Confirm User**.
2. Open [`supabase/setup/02_create_first_admin.sql`](supabase/setup/02_create_first_admin.sql),
   replace the placeholder email with yours, and run it in the SQL Editor.

Every account after this one is created inside the app, under **Partners → Add Partner**.

### 4. Deploy the edge function

`create-partner` lets an admin create partner accounts. It needs the service-role
key, so it cannot run in the browser.

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy create-partner
```

Also set `project_id` in [`supabase/config.toml`](supabase/config.toml) to your project ref.

The function reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` — Supabase injects all three automatically, so there
is nothing to configure. **Never put the service-role key in a `VITE_` variable.**

### 5. Run locally

```bash
cp .env.example .env     # then fill in your two values
npm install
npm run dev
```

---

## Environment variables

| Variable | Where it's used |
|---|---|
| `VITE_SUPABASE_URL` | Browser — Supabase client, storage URLs, edge function URL |
| `VITE_SUPABASE_ANON_KEY` | Browser — Supabase client |

Both are compiled into the JavaScript bundle and are **public by design**. The anon
key grants no access on its own; Row-Level Security is what protects the data. The
service-role key must never appear in this project's frontend.

---

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project** and import the repo. The framework preset is
   detected from [`vercel.json`](vercel.json) (Vite, `npm run build`, `dist`).
3. Under **Settings → Environment Variables**, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` for Production, Preview, and Development.
4. Deploy. Changing an env var later requires a **redeploy** — Vite inlines these
   at build time, not at runtime.
5. In Supabase, go to **Authentication → URL Configuration** and add your Vercel
   domain to **Site URL** and **Redirect URLs**.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run lint` | ESLint |
