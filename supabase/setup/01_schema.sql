/*
  Aim Genius — full database setup
  ================================

  Run this ONCE, in full, in the Supabase SQL Editor of your own project
  (Dashboard -> SQL Editor -> New query -> paste -> Run).

  This file is the consolidated final state of all 9 migrations in
  ../migrations/. Running it is equivalent to replaying them in order.
  It is idempotent — safe to re-run.

  After this completes, run ../setup/02_create_first_admin.sql.
*/

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'recruiting_partner' CHECK (role IN ('admin', 'recruiting_partner')),
  company_name text,
  phone text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  age integer NOT NULL,
  nationality text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  german_level text NOT NULL DEFAULT 'None' CHECK (german_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'None')),
  english_level text NOT NULL DEFAULT 'None' CHECK (english_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'None')),
  other_languages text,
  profession text NOT NULL DEFAULT '',
  years_experience integer NOT NULL DEFAULT 0,
  education text,
  professional_experience text,
  additional_qualifications text,
  availability text NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'placed', 'unavailable', 'pending')),
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS candidate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('cv', 'language_certificate', 'education_certificate', 'work_certificate', 'other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  uploaded_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'placed')),
  message text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS partner_shortlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_ready_for_process (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  uploaded_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_candidates_profession ON candidates(profession);
CREATE INDEX IF NOT EXISTS idx_candidates_german_level ON candidates(german_level);
CREATE INDEX IF NOT EXISTS idx_candidates_availability ON candidates(availability);
CREATE INDEX IF NOT EXISTS idx_candidates_candidate_id ON candidates(candidate_id);
CREATE INDEX IF NOT EXISTS idx_documents_candidate_id ON candidate_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_requests_candidate_id ON candidate_requests(candidate_id);
CREATE INDEX IF NOT EXISTS idx_requests_partner_id ON candidate_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON candidate_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE UNIQUE INDEX IF NOT EXISTS partner_shortlist_partner_candidate_idx
  ON partner_shortlist (partner_id, candidate_id);
CREATE UNIQUE INDEX IF NOT EXISTS partner_ready_partner_candidate_idx
  ON partner_ready_for_process (partner_id, candidate_id);
CREATE UNIQUE INDEX IF NOT EXISTS candidate_videos_candidate_idx
  ON candidate_videos (candidate_id);

-- ============================================================
-- 3. FUNCTIONS & TRIGGERS
-- ============================================================

-- Keeps updated_at fresh on candidates and candidate_requests.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS candidates_updated_at ON candidates;
CREATE TRIGGER candidates_updated_at BEFORE UPDATE ON candidates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS requests_updated_at ON candidate_requests;
CREATE TRIGGER requests_updated_at BEFORE UPDATE ON candidate_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-creates a profile row whenever an auth user is created.
-- Role is hardcoded to recruiting_partner: nobody can sign themselves up as admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'recruiting_partner'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Blocks role changes unless the caller is already an admin.
-- Exception: allows the very first admin to be bootstrapped when none exists.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) THEN
      RETURN NEW;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE profiles.role = 'admin'
    ) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_change ON profiles;
CREATE TRIGGER prevent_role_change
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- These are internal trigger functions, never meant to be callable via the REST API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4. ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates                ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_shortlist         ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_ready_for_process ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_videos          ENABLE ROW LEVEL SECURITY;

-- ---- profiles -------------------------------------------------
-- Everyone authenticated can read all profiles (partner names appear on requests).
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---- candidates -----------------------------------------------
DROP POLICY IF EXISTS "candidates_select_authenticated" ON candidates;
CREATE POLICY "candidates_select_authenticated" ON candidates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "candidates_insert_admin" ON candidates;
CREATE POLICY "candidates_insert_admin" ON candidates
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "candidates_update_admin" ON candidates;
CREATE POLICY "candidates_update_admin" ON candidates
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "candidates_delete_admin" ON candidates;
CREATE POLICY "candidates_delete_admin" ON candidates
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ---- candidate_documents --------------------------------------
DROP POLICY IF EXISTS "documents_select_authenticated" ON candidate_documents;
CREATE POLICY "documents_select_authenticated" ON candidate_documents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "documents_insert_admin" ON candidate_documents;
CREATE POLICY "documents_insert_admin" ON candidate_documents
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "documents_update_admin" ON candidate_documents;
CREATE POLICY "documents_update_admin" ON candidate_documents
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "documents_delete_admin" ON candidate_documents;
CREATE POLICY "documents_delete_admin" ON candidate_documents
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ---- candidate_requests ---------------------------------------
-- Admins see every request; partners see only their own.
DROP POLICY IF EXISTS "requests_select_scoped" ON candidate_requests;
CREATE POLICY "requests_select_scoped" ON candidate_requests
  FOR SELECT TO authenticated USING (
    partner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "requests_insert_own" ON candidate_requests;
CREATE POLICY "requests_insert_own" ON candidate_requests
  FOR INSERT TO authenticated WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "requests_update_admin" ON candidate_requests;
CREATE POLICY "requests_update_admin" ON candidate_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "requests_delete_admin" ON candidate_requests;
CREATE POLICY "requests_delete_admin" ON candidate_requests
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ---- partner_shortlist ----------------------------------------
-- Owning partner reads their own rows; admins read all (Partner Activity panel).
DROP POLICY IF EXISTS "shortlist_select_own" ON partner_shortlist;
DROP POLICY IF EXISTS "shortlist_select_admin" ON partner_shortlist;
CREATE POLICY "shortlist_select_admin" ON partner_shortlist
  FOR SELECT TO authenticated USING (
    auth.uid() = partner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "shortlist_insert_own" ON partner_shortlist;
CREATE POLICY "shortlist_insert_own" ON partner_shortlist
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = partner_id);

DROP POLICY IF EXISTS "shortlist_delete_own" ON partner_shortlist;
CREATE POLICY "shortlist_delete_own" ON partner_shortlist
  FOR DELETE TO authenticated USING (auth.uid() = partner_id);

-- ---- partner_ready_for_process --------------------------------
DROP POLICY IF EXISTS "ready_select_own" ON partner_ready_for_process;
DROP POLICY IF EXISTS "ready_select_admin" ON partner_ready_for_process;
CREATE POLICY "ready_select_admin" ON partner_ready_for_process
  FOR SELECT TO authenticated USING (
    auth.uid() = partner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "ready_insert_own" ON partner_ready_for_process;
CREATE POLICY "ready_insert_own" ON partner_ready_for_process
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = partner_id);

DROP POLICY IF EXISTS "ready_delete_own" ON partner_ready_for_process;
CREATE POLICY "ready_delete_own" ON partner_ready_for_process
  FOR DELETE TO authenticated USING (auth.uid() = partner_id);

-- ---- candidate_videos -----------------------------------------
DROP POLICY IF EXISTS "videos_select_authenticated" ON candidate_videos;
CREATE POLICY "videos_select_authenticated" ON candidate_videos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "videos_insert_admin" ON candidate_videos;
CREATE POLICY "videos_insert_admin" ON candidate_videos
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "videos_update_admin" ON candidate_videos;
CREATE POLICY "videos_update_admin" ON candidate_videos
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "videos_delete_admin" ON candidate_videos;
CREATE POLICY "videos_delete_admin" ON candidate_videos
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ============================================================
-- 5. STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-photos', 'candidate-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-documents', 'candidate-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-videos',
  'candidate-videos',
  false,
  524288000,  -- 500 MB
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

-- ============================================================
-- 6. STORAGE POLICIES
-- ============================================================
-- If any statement below fails with "must be owner of table objects", create
-- these policies through the Dashboard instead: Storage -> <bucket> -> Policies.

-- ---- candidate-photos: public read, admin write ---------------
DROP POLICY IF EXISTS "photos_read_public" ON storage.objects;
CREATE POLICY "photos_read_public" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'candidate-photos');

DROP POLICY IF EXISTS "photos_insert_admin" ON storage.objects;
CREATE POLICY "photos_insert_admin" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'candidate-photos'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "photos_update_admin" ON storage.objects;
CREATE POLICY "photos_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'candidate-photos'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'candidate-photos'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "photos_delete_admin" ON storage.objects;
CREATE POLICY "photos_delete_admin" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'candidate-photos'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ---- candidate-documents: private, admin write ----------------
DROP POLICY IF EXISTS "docs_read_authenticated" ON storage.objects;
CREATE POLICY "docs_read_authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'candidate-documents');

DROP POLICY IF EXISTS "docs_insert_admin" ON storage.objects;
CREATE POLICY "docs_insert_admin" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'candidate-documents'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "docs_update_admin" ON storage.objects;
CREATE POLICY "docs_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'candidate-documents'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'candidate-documents'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "docs_delete_admin" ON storage.objects;
CREATE POLICY "docs_delete_admin" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'candidate-documents'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ---- candidate-videos: private, admin write -------------------
DROP POLICY IF EXISTS "videos_storage_read_authenticated" ON storage.objects;
CREATE POLICY "videos_storage_read_authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'candidate-videos');

DROP POLICY IF EXISTS "videos_storage_insert_admin" ON storage.objects;
CREATE POLICY "videos_storage_insert_admin" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'candidate-videos'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "videos_storage_update_admin" ON storage.objects;
CREATE POLICY "videos_storage_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'candidate-videos'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'candidate-videos'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "videos_storage_delete_admin" ON storage.objects;
CREATE POLICY "videos_storage_delete_admin" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'candidate-videos'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
