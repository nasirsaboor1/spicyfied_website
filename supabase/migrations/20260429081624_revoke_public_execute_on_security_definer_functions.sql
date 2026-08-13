/*
  # Revoke EXECUTE on SECURITY DEFINER functions from public roles

  ## Summary
  These functions are intended to be invoked only from database triggers or
  from RLS policies — never directly via PostgREST RPC. Because they were
  created as SECURITY DEFINER, a client calling `/rest/v1/rpc/<fn>` would run
  them with the function owner's privileges. This migration revokes EXECUTE
  from `public`, `anon` and `authenticated`, leaving execution only to the
  `postgres` / `service_role` and internal trigger / policy evaluation.

  ## Functions hardened
  1. `public.generate_order_number()`       — trigger helper
  2. `public.handle_new_user()`             — auth.users insert trigger
  3. `public.is_admin(uuid)`                — used in RLS policies
  4. `public.update_product_rating()`       — review-aggregate trigger
  5. `public.update_review_helpful_count()` — review helpful-vote trigger

  ## Security notes
  1. Triggers continue to work because PostgreSQL invokes trigger functions
     internally, bypassing PostgREST's REST interface — no EXECUTE grant is
     required for the trigger to fire.
  2. RLS policies that call `is_admin(auth.uid())` continue to work because
     policy expressions are evaluated by the database engine with owner
     context, not by the calling role's EXECUTE privilege.
  3. PostgREST hides RPC endpoints whose EXECUTE grant has been revoked from
     `anon` / `authenticated`, so `/rest/v1/rpc/<fn>` calls will now return
     404 / 403 for public clients.
*/

DO $$
DECLARE
  fn_signature text;
  signatures text[] := ARRAY[
    'public.generate_order_number()',
    'public.handle_new_user()',
    'public.is_admin(uuid)',
    'public.update_product_rating()',
    'public.update_review_helpful_count()'
  ];
BEGIN
  FOREACH fn_signature IN ARRAY signatures LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname || '.' || p.proname || '(' ||
            pg_get_function_identity_arguments(p.oid) || ')' = fn_signature
    ) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn_signature);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn_signature);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn_signature);
    END IF;
  END LOOP;
END $$;
