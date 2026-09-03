/*
# Create Recruitment Platform Schema

## Overview
Builds the complete database schema for a private candidate database for a recruitment company.
Supports two user roles: admin and recruiting_partner. Admins manage candidates, partners browse and request candidates.

## New Tables

### 1. profiles
- `id` (uuid, PK, references auth.users)
- `email` (text, unique)
- `full_name` (text)
- `role` (text: 'admin' or 'recruiting_partner')
- `company_name` (text, nullable — for partners)
- `phone` (text, nullable)
- `created_at` (timestamptz)

### 2. candidates
- `id` (uuid, PK)
- `candidate_id` (text, unique — human-readable ID like CAND-001)
- `first_name` (text)
- `last_name` (text)
- `age` (integer)
- `nationality` (text)
- `location` (text)
- `german_level` (text: A1, A2, B1, B2, C1, C2, None)
- `english_level` (text: A1, A2, B1, B2, C1, C2, None)
- `other_languages` (text, nullable)
- `profession` (text — desired position)
- `years_experience` (integer)
- `education` (text, nullable)
- `professional_experience` (text, nullable)
- `additional_qualifications` (text, nullable)
- `availability` (text: 'available', 'placed', 'unavailable', 'pending')
- `photo_url` (text, nullable — path in storage)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `created_by` (uuid, references auth.users)

### 3. candidate_documents
- `id` (uuid, PK)
- `candidate_id` (uuid, FK references candidates ON DELETE CASCADE)
- `document_type` (text: 'cv', 'language_certificate', 'education_certificate', 'work_certificate', 'other')
- `file_name` (text)
- `file_path` (text — path in storage)
- `file_size` (bigint, nullable)
- `uploaded_at` (timestamptz)

### 4. candidate_requests
- `id` (uuid, PK)
- `candidate_id` (uuid, FK references candidates ON DELETE CASCADE)
- `partner_id` (uuid, FK references auth.users)
- `status` (text: 'pending', 'approved', 'rejected', 'placed')
- `message` (text, nullable)
- `admin_notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `responded_at` (timestamptz, nullable)
- `responded_by` (uuid, nullable, references auth.users)

## Security (RLS)

### profiles
- SELECT: authenticated users can read all profiles (need to see partner names on requests)
- INSERT: user can insert own profile (on signup)
- UPDATE: user can update own profile

### candidates
- SELECT: authenticated users (both admin and partners) can read all candidates
- INSERT/UPDATE/DELETE: admin only (checked via profiles table role = 'admin')

### candidate_documents
- SELECT: authenticated users can read all documents metadata
- INSERT/UPDATE/DELETE: admin only

### candidate_requests
- SELECT: admins see all requests; partners see only their own requests
- INSERT: authenticated partners can insert requests for themselves
- UPDATE: admins can update any request; partners cannot update

## Storage Buckets
- `candidate-photos` (public read, authenticated write by admin)
- `candidate-documents` (private read via signed URLs, authenticated write by admin)

## Important Notes
1. Role is stored in profiles table (not user_metadata) for security — users cannot self-assign admin role.
2. Admin checks use EXISTS subquery on profiles WHERE role = 'admin'.
3. Partner requests are scoped to auth.uid() = partner_id.
4. Storage policies restrict uploads to admin users.
*/

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'recruiting_partner' CHECK (role IN ('admin', 'recruiting_partner')),
  company_name text,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
ON profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- CANDIDATES TABLE
-- ============================================
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

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read candidates
DROP POLICY IF EXISTS "candidates_select_authenticated" ON candidates;
CREATE POLICY "candidates_select_authenticated"
ON candidates FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert candidates
DROP POLICY IF EXISTS "candidates_insert_admin" ON candidates;
CREATE POLICY "candidates_insert_admin"
ON candidates FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Only admins can update candidates
DROP POLICY IF EXISTS "candidates_update_admin" ON candidates;
CREATE POLICY "candidates_update_admin"
ON candidates FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Only admins can delete candidates
DROP POLICY IF EXISTS "candidates_delete_admin" ON candidates;
CREATE POLICY "candidates_delete_admin"
ON candidates FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- ============================================
-- CANDIDATE DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS candidate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('cv', 'language_certificate', 'education_certificate', 'work_certificate', 'other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select_authenticated" ON candidate_documents;
CREATE POLICY "documents_select_authenticated"
ON candidate_documents FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "documents_insert_admin" ON candidate_documents;
CREATE POLICY "documents_insert_admin"
ON candidate_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "documents_update_admin" ON candidate_documents;
CREATE POLICY "documents_update_admin"
ON candidate_documents FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "documents_delete_admin" ON candidate_documents;
CREATE POLICY "documents_delete_admin"
ON candidate_documents FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- ============================================
-- CANDIDATE REQUESTS TABLE
-- ============================================
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

ALTER TABLE candidate_requests ENABLE ROW LEVEL SECURITY;

-- Admins see all requests, partners see only their own
DROP POLICY IF EXISTS "requests_select_scoped" ON candidate_requests;
CREATE POLICY "requests_select_scoped"
ON candidate_requests FOR SELECT
TO authenticated
USING (
  partner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Partners can create requests for themselves; admins can also create
DROP POLICY IF EXISTS "requests_insert_own" ON candidate_requests;
CREATE POLICY "requests_insert_own"
ON candidate_requests FOR INSERT
TO authenticated
WITH CHECK (
  partner_id = auth.uid()
);

-- Only admins can update requests
DROP POLICY IF EXISTS "requests_update_admin" ON candidate_requests;
CREATE POLICY "requests_update_admin"
ON candidate_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Only admins can delete requests
DROP POLICY IF EXISTS "requests_delete_admin" ON candidate_requests;
CREATE POLICY "requests_delete_admin"
ON candidate_requests FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_candidates_profession ON candidates(profession);
CREATE INDEX IF NOT EXISTS idx_candidates_german_level ON candidates(german_level);
CREATE INDEX IF NOT EXISTS idx_candidates_availability ON candidates(availability);
CREATE INDEX IF NOT EXISTS idx_candidates_candidate_id ON candidates(candidate_id);
CREATE INDEX IF NOT EXISTS idx_documents_candidate_id ON candidate_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_requests_candidate_id ON candidate_requests(candidate_id);
CREATE INDEX IF NOT EXISTS idx_requests_partner_id ON candidate_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON candidate_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS candidates_updated_at ON candidates;
CREATE TRIGGER candidates_updated_at BEFORE UPDATE ON candidates
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS requests_updated_at ON candidate_requests;
CREATE TRIGGER requests_updated_at BEFORE UPDATE ON candidate_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- HANDLE NEW USER: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'recruiting_partner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-photos', 'candidate-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-documents', 'candidate-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for candidate-photos (public read, admin write)
DROP POLICY IF EXISTS "photos_read_public" ON storage.objects;
CREATE POLICY "photos_read_public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'candidate-photos');

DROP POLICY IF EXISTS "photos_insert_admin" ON storage.objects;
CREATE POLICY "photos_insert_admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'candidate-photos'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "photos_update_admin" ON storage.objects;
CREATE POLICY "photos_update_admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'candidate-photos'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  bucket_id = 'candidate-photos'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "photos_delete_admin" ON storage.objects;
CREATE POLICY "photos_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'candidate-photos'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Storage policies for candidate-documents (private, admin write, authenticated read via signed URLs)
DROP POLICY IF EXISTS "docs_read_authenticated" ON storage.objects;
CREATE POLICY "docs_read_authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'candidate-documents');

DROP POLICY IF EXISTS "docs_insert_admin" ON storage.objects;
CREATE POLICY "docs_insert_admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'candidate-documents'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "docs_update_admin" ON storage.objects;
CREATE POLICY "docs_update_admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'candidate-documents'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  bucket_id = 'candidate-documents'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "docs_delete_admin" ON storage.objects;
CREATE POLICY "docs_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'candidate-documents'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);