-- Fix: allow bootstrapping the first admin when no admin exists yet
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow the change if the current user is an admin
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) THEN
      RETURN NEW;
    END IF;

    -- Allow the change if no admin exists yet (bootstrap condition)
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
