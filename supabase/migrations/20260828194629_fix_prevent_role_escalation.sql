/*
# Fix: Prevent non-admin users from changing their own role

## Problem
The profiles UPDATE policy allows users to update their own row with no column restrictions.
A recruiting partner could escalate their role to 'admin' by updating their own profile.

## Fix
Add a trigger that prevents the `role` column from being changed unless the current user is an admin.
*/

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_role_change ON profiles;

CREATE TRIGGER prevent_role_change
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();
