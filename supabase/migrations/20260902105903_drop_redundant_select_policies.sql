/*
# Drop redundant partner SELECT policies

The new admin-aware SELECT policies (shortlist_select_admin, ready_select_admin)
supersede the original own-only policies (shortlist_select_own, ready_select_own).
Dropping the old ones to avoid redundancy.
*/

DROP POLICY IF EXISTS "shortlist_select_own" ON partner_shortlist;
DROP POLICY IF EXISTS "ready_select_own" ON partner_ready_for_process;
