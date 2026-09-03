/*
# Add admin read access to partner shortlist and ready-for-process

## Overview
Admins need to see which partners have shortlisted or moved a candidate to
"Ready for Process" so they can view partner activity on a candidate profile.
Currently RLS only allows partners to read their own rows. This adds a SELECT
policy for admins to read all rows in both tables.

## Security Changes
- partner_shortlist: admin can SELECT all rows (existing partner policies unchanged)
- partner_ready_for_process: admin can SELECT all rows (existing partner policies unchanged)
*/

DROP POLICY IF EXISTS "shortlist_select_admin" ON partner_shortlist;
CREATE POLICY "shortlist_select_admin" ON partner_shortlist
  FOR SELECT TO authenticated
  USING (
    auth.uid() = partner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "ready_select_admin" ON partner_ready_for_process;
CREATE POLICY "ready_select_admin" ON partner_ready_for_process
  FOR SELECT TO authenticated
  USING (
    auth.uid() = partner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
