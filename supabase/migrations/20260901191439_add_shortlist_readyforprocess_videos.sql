/*
# Add Shortlist, Ready-for-Process, and Candidate Introduction Videos

## Overview
This migration adds three new features for recruiting partners:
1. Partner-specific shortlists of candidates
2. A "Ready for Process" stage that candidates move to from the shortlist
3. Admin-uploaded introduction videos per candidate

## New Tables

### partner_shortlist
- Stores candidates a partner has shortlisted
- `id` (uuid PK)
- `partner_id` (uuid FK -> auth.users) — the partner who shortlisted
- `candidate_id` (uuid FK -> candidates) — the shortlisted candidate
- `created_at` (timestamptz)
- Unique constraint on (partner_id, candidate_id) so a candidate appears once per partner

### partner_ready_for_process
- Stores candidates a partner has moved to "Ready for Process" from their shortlist
- `id` (uuid PK)
- `partner_id` (uuid FK -> auth.users) — the partner who owns this entry
- `candidate_id` (uuid FK -> candidates) — the candidate
- `created_at` (timestamptz)
- Unique constraint on (partner_id, candidate_id)

### candidate_videos
- Stores metadata for the introduction video uploaded per candidate (admin only)
- `id` (uuid PK)
- `candidate_id` (uuid FK -> candidates ON DELETE CASCADE) — one video per candidate
- `file_name` (text) — original file name
- `file_path` (text) — path in storage bucket
- `file_size` (bigint) — file size in bytes
- `uploaded_at` (timestamptz)
- Unique constraint on (candidate_id) — one video per candidate

## Storage Bucket
- `candidate-videos` bucket (private) for introduction videos
- Admin-only INSERT, UPDATE, DELETE
- Authenticated (admin + partner) can SELECT (needed for signed URL generation)

## Security (RLS)

### partner_shortlist
- SELECT: partner sees only their own shortlist rows
- INSERT: partner can insert only their own rows
- DELETE: partner can delete only their own rows
- No UPDATE needed

### partner_ready_for_process
- SELECT: partner sees only their own rows
- INSERT: partner can insert only their own rows
- DELETE: partner can delete only their own rows
- No UPDATE needed

### candidate_videos
- SELECT: any authenticated user (admin + partner) can read video metadata
- INSERT/UPDATE/DELETE: admin only

## Storage Policies
- `candidate-videos` bucket: admin-only write, authenticated read
*/

-- ============================================================
-- partner_shortlist
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_shortlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partner_shortlist ENABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS partner_shortlist_partner_candidate_idx;
CREATE UNIQUE INDEX partner_shortlist_partner_candidate_idx
  ON partner_shortlist (partner_id, candidate_id);

DROP POLICY IF EXISTS "shortlist_select_own" ON partner_shortlist;
CREATE POLICY "shortlist_select_own" ON partner_shortlist
  FOR SELECT TO authenticated USING (auth.uid() = partner_id);

DROP POLICY IF EXISTS "shortlist_insert_own" ON partner_shortlist;
CREATE POLICY "shortlist_insert_own" ON partner_shortlist
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = partner_id);

DROP POLICY IF EXISTS "shortlist_delete_own" ON partner_shortlist;
CREATE POLICY "shortlist_delete_own" ON partner_shortlist
  FOR DELETE TO authenticated USING (auth.uid() = partner_id);

-- ============================================================
-- partner_ready_for_process
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_ready_for_process (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partner_ready_for_process ENABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS partner_ready_partner_candidate_idx;
CREATE UNIQUE INDEX partner_ready_partner_candidate_idx
  ON partner_ready_for_process (partner_id, candidate_id);

DROP POLICY IF EXISTS "ready_select_own" ON partner_ready_for_process;
CREATE POLICY "ready_select_own" ON partner_ready_for_process
  FOR SELECT TO authenticated USING (auth.uid() = partner_id);

DROP POLICY IF EXISTS "ready_insert_own" ON partner_ready_for_process;
CREATE POLICY "ready_insert_own" ON partner_ready_for_process
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = partner_id);

DROP POLICY IF EXISTS "ready_delete_own" ON partner_ready_for_process;
CREATE POLICY "ready_delete_own" ON partner_ready_for_process
  FOR DELETE TO authenticated USING (auth.uid() = partner_id);

-- ============================================================
-- candidate_videos
-- ============================================================
CREATE TABLE IF NOT EXISTS candidate_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_videos ENABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS candidate_videos_candidate_idx;
CREATE UNIQUE INDEX candidate_videos_candidate_idx
  ON candidate_videos (candidate_id);

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
-- Storage bucket: candidate-videos (private)
-- ============================================================
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

-- Storage policies for candidate-videos bucket
DROP POLICY IF EXISTS "videos_storage_read_authenticated" ON storage.objects;
CREATE POLICY "videos_storage_read_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'candidate-videos');

DROP POLICY IF EXISTS "videos_storage_insert_admin" ON storage.objects;
CREATE POLICY "videos_storage_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
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
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'candidate-videos'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
