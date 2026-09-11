/*
  # Phase 2 security remediation — close live-only overly-permissive policies

  This migration exists because the live database has drifted from every
  committed migration before it: several RLS policies were created directly
  against production (Supabase Studio / SQL editor, never captured in a
  migration file) and grant ordinary signed-in customers access that was
  never intended. Confirmed by direct read-only inspection of production —
  see SUPABASE_RECONCILIATION_REPORT.md for the full evidence trail. This
  migration does not rewrite any historical migration file; it is a new,
  forward-only correction on top of them.

  ## Confirmed vulnerabilities closed here

  1. `promotional_banners` — any authenticated customer could create/edit/
     delete site-wide homepage banners (including the outbound `link_url`
     shown to every visitor). No application code uses this table at all
     (grep confirms zero references outside `database.types.ts`), so this
     access was never exercised by the app UI — it was reachable only via
     direct PostgREST calls using a normal customer's own session.
  2. `reviews` — a review's own author could self-approve it
     (`is_approved`) via a direct UPDATE, bypassing moderation entirely,
     and could also reassign `user_id`/`product_id` on an existing review.
     `is_approved` could also be set to `true` directly on INSERT, since no
     trigger or WITH CHECK clause constrained it.
  3. `back_in_stock_notifications` — any signed-in customer could read
     every other customer's email address and modify any row.
  4. `google_review_links` — any authenticated customer had full CRUD.
  5. `product_stories` — any authenticated customer could write
     product marketing/heritage/sourcing copy for any product.
  6. `recompute_order_totals(uuid)` — a SECURITY DEFINER function with no
     ownership check, directly callable by anon/authenticated with an
     arbitrary order id. Financially inert today (it only re-derives
     totals from already trigger-protected data) but a least-privilege
     violation that allows an unrelated user to force a write onto
     another customer's order row.
  7. `is_admin(uuid)` — EXECUTE was re-granted to anon/authenticated by
     migration 20260816111124, silently undoing the revoke that
     20260429081646 had already put in place. Read-only info disclosure
     (lets a caller check whether a *known* user id is an admin), not a
     privilege escalation. Only the `anon`/`PUBLIC` grant is revoked here
     — see the detailed note at that section below for why revoking it
     from `authenticated` as well would break the entire application for
     every signed-in user, discovered by local testing before this was
     ever proposed to run against production.
  8. Ten leftover policies conditioned on `(auth.jwt() ->> 'role') =
     'admin'` — a JWT-custom-claim authorization scheme that was
     abandoned in favor of the `admin_users` table + `is_admin()`
     function. Verified dead (see reconciliation report 2.2(b-1)): no
     `auth.users` row carries `raw_app_meta_data->>'role' = 'admin'`, and
     no custom Auth "access token" hook exists anywhere in this project
     to ever set one. They grant nobody anything today, but they are a
     landmine for the future — if a custom-claims hook is ever added for
     an unrelated reason, these ten policies would silently reactivate.

  Every removed policy has a proven `is_admin()`-based equivalent already
  covering the same table/operation, EXCEPT `newsletter_subscribers`,
  which had no working admin management policy at all (the only ALL/
  UPDATE/DELETE policy on it was one of the ten dead jwt-role policies).
  A real `is_admin()`-based replacement is added for it here so dropping
  the dead policy does not quietly delete an admin capability that was
  merely non-functional rather than absent-by-design.

  ## What is intentionally NOT touched here (out of scope for this phase)

  - `contact_submissions` has no input validation on its live INSERT
    policy (`anon_insert_contact`, `WITH CHECK (true)`) and no SELECT
    policy for anyone, including admins. Confirmed live, real, but not
    in this phase's P0/P1 list — left for a separate change.
  - The dead first-generation migration files (`customers`, `product_reviews`,
    `review_votes`, `payment_transactions`, `coupons`, `email_notifications`)
    are not modified or removed here, per instruction not to rewrite
    history. A separate baseline-reconciliation proposal is warranted.
*/

-- ============================================================================
-- 1. PROMOTIONAL BANNERS — remove customer write access
-- ============================================================================
-- BEFORE: "Authenticated users can manage promotional banners" (ALL, true/true)
--         let any signed-in customer create/edit/delete any banner.
-- AFTER:  only "Admins can manage promotional banners" (is_admin(), already
--         present and unaffected) and the existing public SELECT policy
--         for active banners remain.
-- WHY:    no application code touches this table (verified by repo search);
--         dropping this grants nothing back to the app and closes a live
--         defacement/phishing vector.

DROP POLICY IF EXISTS "Authenticated users can manage promotional banners" ON promotional_banners;

-- ============================================================================
-- 2. REVIEW MODERATION — close the is_approved self-approval bypass
-- ============================================================================
-- BEFORE: "Users can update own reviews" (auth.uid() = user_id) placed no
--         restriction on which columns change, so an author could set
--         is_approved = true on their own row directly. The same was true
--         on INSERT (no policy or trigger constrained is_approved there).
-- AFTER:  a BEFORE INSERT OR UPDATE trigger forces is_approved back to its
--         safe value (false on insert, unchanged on update) — and also
--         locks user_id/product_id from being reassigned on update — for
--         any caller who is not is_admin(). Admins pass straight through,
--         so moderation (approve/reject) keeps working exactly as before.
-- WHY:    RLS alone cannot restrict which *columns* an UPDATE touches;
--         only a trigger (or a narrower table design) can. This mirrors
--         the pattern the codebase already uses successfully for
--         is_verified_purchase in enforce_review_integrity() — that
--         trigger is untouched and keeps protecting is_verified_purchase
--         on both insert and update, exactly as it did before.

CREATE OR REPLACE FUNCTION public.enforce_review_moderation_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins (moderators) may set/change these fields freely.
  IF is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A new review from a non-admin always starts unapproved, regardless
    -- of what the client sent.
    NEW.is_approved := false;
  ELSIF TG_OP = 'UPDATE' THEN
    -- A non-admin editing their own review (rating/title/comment) cannot
    -- change its moderation status or reassign it to another user/product.
    NEW.is_approved := OLD.is_approved;
    NEW.user_id := OLD.user_id;
    NEW.product_id := OLD.product_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_review_moderation_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_review_moderation_fields ON reviews;
CREATE TRIGGER trg_enforce_review_moderation_fields
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_review_moderation_fields();

-- ============================================================================
-- 3. BACK-IN-STOCK NOTIFICATIONS — remove cross-customer read/write,
--    add real input validation, restore a working admin UPDATE path
-- ============================================================================
-- BEFORE: "Authenticated users can view all notifications" (SELECT, true)
--         and "Authenticated users can update notifications" (UPDATE,
--         true/true) let any signed-in customer read every requester's
--         email and modify any row. A duplicate, unvalidated public
--         INSERT policy ("Anyone can subscribe to back in stock
--         notifications") existed alongside the real one.
-- AFTER:  the only customer-facing policy is a single validated INSERT
--         (anon + authenticated), matching the app's actual usage
--         (src/pages/ProductDetailPage.tsx only ever inserts). Admin
--         SELECT is unchanged; a new admin UPDATE policy is added so
--         admins can mark requests as notified once restocked — a
--         capability the removed customer-facing policy accidentally
--         provided but no legitimate admin-scoped policy ever did.
-- WHY:    no application code reads or updates this table as a customer
--         (verified by repo search — ProductDetailPage.tsx only inserts).

DROP POLICY IF EXISTS "Authenticated users can view all notifications" ON back_in_stock_notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON back_in_stock_notifications;
DROP POLICY IF EXISTS "Anyone can subscribe to back in stock notifications" ON back_in_stock_notifications;
DROP POLICY IF EXISTS "Anyone can request back in stock notification" ON back_in_stock_notifications;

CREATE POLICY "Anyone can request back in stock notification"
  ON back_in_stock_notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(email) <= 255
    AND product_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM products WHERE products.id = back_in_stock_notifications.product_id)
    AND (
      variant_id IS NULL
      OR EXISTS (SELECT 1 FROM product_variants WHERE product_variants.id = back_in_stock_notifications.variant_id)
    )
  );

CREATE POLICY "Admins can update back in stock notifications"
  ON back_in_stock_notifications FOR UPDATE
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

-- ============================================================================
-- 4. GOOGLE REVIEW LINKS — remove customer write access
-- ============================================================================
-- BEFORE: "Authenticated users can manage google review links" (ALL, true/true).
-- AFTER:  only "Admins can manage google review links" (is_admin(), already
--         present and unaffected) and the existing public SELECT policy
--         for active links remain.
-- WHY:    no application code touches this table.

DROP POLICY IF EXISTS "Authenticated users can manage google review links" ON google_review_links;

-- ============================================================================
-- 5. PRODUCT STORIES — remove customer write access
-- ============================================================================
-- BEFORE: "Authenticated users can insert product stories" (INSERT, true)
--         and "Authenticated users can update product stories" (UPDATE,
--         true/true).
-- AFTER:  only "Admins can manage product stories" (is_admin(), already
--         present and unaffected) and the existing public SELECT policy
--         remain.
-- WHY:    the only write path in the app is src/lib/adminProducts.ts,
--         which is only ever invoked from the is_admin()-gated admin
--         panel (AdminPage.tsx -> AdminProductsView.tsx ->
--         ProductFormModal.tsx). It was working by accident, through the
--         overly-broad live-only policy, not through the is_admin() one.
--         After this change the same admin UI keeps working (the admin
--         user passes is_admin()), and a non-admin calling the same
--         PostgREST endpoint directly no longer can.

DROP POLICY IF EXISTS "Authenticated users can insert product stories" ON product_stories;
DROP POLICY IF EXISTS "Authenticated users can update product stories" ON product_stories;

-- ============================================================================
-- 6. recompute_order_totals(uuid) — remove direct RPC exposure
-- ============================================================================
-- BEFORE: SECURITY DEFINER, EXECUTE granted to anon/authenticated/PUBLIC,
--         no ownership check inside the function body — callable via
--         POST /rest/v1/rpc/recompute_order_totals with any order id.
-- AFTER:  EXECUTE revoked from PUBLIC, anon, authenticated. Only the
--         `postgres` owner role (and internal trigger invocation) can
--         run it.
-- WHY:    the only legitimate caller is the trigger chain
--         order_items -> trg_order_items_recompute_totals ->
--         trg_recompute_order_totals() -> recompute_order_totals().
--         Both trg_recompute_order_totals() and recompute_order_totals()
--         are owned by `postgres` (verified live via pg_proc.proowner).
--         A SECURITY DEFINER function executes with its owner's
--         privileges for the purposes of any privilege check performed
--         during its execution, including calling other functions —
--         this is documented PostgreSQL behavior, and it is the exact
--         mechanism the codebase already relies on for is_admin() being
--         callable from RLS policy expressions regardless of the
--         invoking role's own EXECUTE grants (see the comment in
--         20260429081624_revoke_public_execute_on_security_definer_functions.sql).
--         Revoking EXECUTE here therefore blocks only the direct/RPC
--         path; the trigger-invoked path is unaffected because it never
--         evaluates the *invoking client's* privileges for the nested
--         call, only the owning function's.

REVOKE EXECUTE ON FUNCTION public.recompute_order_totals(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 7. is_admin(uuid) — narrow direct RPC exposure (anon/PUBLIC only)
-- ============================================================================
-- BEFORE: EXECUTE granted to anon, authenticated (live-verified) —
--         callable via POST /rest/v1/rpc/is_admin with any user id,
--         letting a caller who already has a specific UUID check whether
--         it belongs to an admin.
-- AFTER:  EXECUTE revoked from PUBLIC and anon only. EXECUTE is
--         DELIBERATELY LEFT GRANTED to `authenticated`.
-- WHY THE ORIGINAL PLAN CHANGED — TESTED, NOT ASSUMED:
--         The instruction for this step was to revoke from anon AND
--         authenticated, on the theory (stated in the original
--         20260429081624 migration's own comment) that "policy
--         expressions are evaluated... not by the calling role's
--         EXECUTE privilege." That theory was tested against a local
--         Postgres replica of this exact schema/policy set before
--         touching production, and it is WRONG for this database: a
--         SECURITY DEFINER function only changes privilege context
--         *inside* its own body. Postgres still requires the calling
--         role to hold EXECUTE to invoke the function in the first
--         place, including when the call is embedded inside an RLS
--         policy's USING/WITH CHECK expression. Since dozens of
--         policies across nearly every table (orders, order_items,
--         addresses, customer_profiles, reviews, products, ...) are
--         `TO authenticated` and OR is_admin(auth.uid()) together with
--         an ownership check (e.g. "Admins can view all addresses" OR
--         "Users can view own addresses"), Postgres must evaluate BOTH
--         permissive policies for every authenticated query against
--         those tables — including a completely ordinary customer
--         reading their own data. When EXECUTE was revoked from
--         authenticated in the local test, EVERY such query started
--         failing with "permission denied for function is_admin", for
--         every signed-in user, not just admins — a full-site outage,
--         confirmed by running the app's actual own-data-read pattern
--         (SELECT ... FROM orders WHERE id = ...) against the revoked
--         schema and watching it error where it previously returned an
--         empty/own-row result cleanly. Revoking only from anon/PUBLIC
--         still closes the highest-value part of the gap (an entirely
--         unauthenticated caller enumerating admin status with zero
--         account needed) without this outage; the residual risk left
--         open — a *signed-up* customer checking a *specific already-
--         known* UUID — is the same low-severity information disclosure
--         noted in the reconciliation report, now scoped to a much
--         smaller and more traceable population (people who created an
--         account) instead of anyone on the internet.

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;

-- ============================================================================
-- 8. LEGACY DEAD POLICIES — remove the abandoned jwt-role admin model
-- ============================================================================
-- Every policy below tests (auth.jwt() ->> 'role') = 'admin'. Verified
-- live that this can never be true: zero auth.users rows carry
-- raw_app_meta_data->>'role' = 'admin', and no custom access-token hook
-- exists in this project to ever set one. Each one is listed with the
-- is_admin()-based policy on the same table that already covers the
-- same operation, proving nothing functional is lost by dropping it.

-- orders: covered by "Admins can manage orders" (ALL, is_admin())
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;

-- categories: covered by "Admins can manage categories" (ALL, is_admin())
DROP POLICY IF EXISTS "Only admins can manage categories" ON categories;

-- order_items: covered by "Admins can manage order items" (ALL, is_admin())
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;

-- product_images: covered by "Admins can manage product images" (ALL, is_admin())
DROP POLICY IF EXISTS "Only admins can manage product images" ON product_images;

-- product_variants: covered by "Admins can manage product variants" (ALL, is_admin())
DROP POLICY IF EXISTS "Only admins can manage product variants" ON product_variants;

-- products: covered by "Admins can manage products" (ALL, is_admin())
DROP POLICY IF EXISTS "Only admins can manage products" ON products;

-- reviews: covered by "Admins can manage reviews" (ALL, is_admin())
DROP POLICY IF EXISTS "Admins can manage all reviews" ON reviews;

-- newsletter_subscribers: NOT covered by an existing is_admin() ALL/UPDATE/
-- DELETE policy (only a SELECT one exists: "Admins can view newsletter
-- subscribers"). The dead policy below was the *only* thing that could
-- ever have granted admin write access here, and it never actually
-- worked (the jwt claim it checks is never present). Replace it with a
-- working equivalent in the same statement that removes it, so this
-- migration does not leave admin newsletter management permanently
-- broken (it was already broken; this fixes it with the correct
-- mechanism instead of silently leaving it broken).
DROP POLICY IF EXISTS "Admins can manage subscribers" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can view subscribers" ON newsletter_subscribers;

CREATE POLICY "Admins can manage newsletter subscribers"
  ON newsletter_subscribers FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));
