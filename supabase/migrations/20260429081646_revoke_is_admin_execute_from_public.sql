/*
  # Revoke EXECUTE on is_admin(uuid) from anon/authenticated

  The previous migration's DO block did not match `is_admin` because its
  identity arguments are `user_id uuid` (named) rather than bare `uuid`.
  This explicitly revokes EXECUTE so the function cannot be called via
  `/rest/v1/rpc/is_admin`. RLS policies that reference `is_admin()` keep
  working because policy evaluation does not require the caller to hold
  EXECUTE on the function.
*/

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM authenticated;
