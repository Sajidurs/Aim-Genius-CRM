/*
  Aim Genius — promote your first admin
  =====================================

  The app has no signup screen, and the handle_new_user trigger always assigns
  the 'recruiting_partner' role. So the very first admin must be made by hand.

  STEP 1 — create the user in the Dashboard:
    Authentication -> Users -> Add user -> Create new user
      Email:    your real admin email
      Password: a strong password
      [x] Auto Confirm User        <-- important, or you cannot log in

  STEP 2 — edit the email below and run this file in the SQL Editor.

  STEP 3 — verify it returned one row with role = 'admin'.

  From then on, create all further accounts through the app:
  Partners -> Add Partner (which calls the create-partner edge function).
*/

UPDATE profiles
SET role = 'admin'
WHERE email = 'REPLACE-WITH-YOUR-ADMIN-EMAIL';

-- Confirm the result — this should show exactly your admin account.
SELECT id, email, full_name, role, created_at
FROM profiles
WHERE role = 'admin';
