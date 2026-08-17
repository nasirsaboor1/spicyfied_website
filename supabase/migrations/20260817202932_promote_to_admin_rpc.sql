/*
  # promote_to_admin RPC

  Lets an existing admin add a teammate as admin from inside the app,
  without ever needing the service_role key in the browser (which is
  required to create auth.users rows directly, so that step can't be
  done client-side at all).

  The teammate must already have an account (sign up normally at
  /signup first) - this function looks their user id up by email in
  auth.users and inserts/reactivates their admin_users row. It cannot
  create the auth account itself.
*/

CREATE OR REPLACE FUNCTION promote_to_admin(target_email text)
RETURNS admin_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  result admin_users;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can add other admins';
  END IF;

  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No account found for %. They need to sign up at /signup first, then you can add them here.', target_email;
  END IF;

  INSERT INTO admin_users (id, email, full_name, role, is_active)
  VALUES (target_user_id, target_email, target_email, 'admin', true)
  ON CONFLICT (id) DO UPDATE SET is_active = true
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION promote_to_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION promote_to_admin(text) TO authenticated;
