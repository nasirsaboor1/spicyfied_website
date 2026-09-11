# Security Phase 2 — Migration Plan (proposed, NOT applied to production)

**Status: awaiting approval. Nothing in this plan has touched production.** The only credential available in this session is the read-only, project-scoped token from Phase 1 — no write path to production exists in this session even if I wanted one.

**What was actually done to verify this plan:** a disposable local PostgreSQL 16 database was built from scratch, with a schema/functions/triggers/policies copied **verbatim** (not paraphrased) from the committed migrations and the confirmed live policy set in `SUPABASE_RECONCILIATION_REPORT.md`. Every exploit below was executed for real against that database before the fix (confirming it works) and after applying the exact migration file proposed here (confirming it's closed), plus every legitimate customer/admin flow was executed for real in both states. This caught one real bug in the originally-planned approach before it went anywhere near production — see Section 7.

---

# Confirmed Vulnerabilities Being Fixed

All eight, cross-referenced to `SUPABASE_RECONCILIATION_REPORT.md`:

1. **`promotional_banners`** — any authenticated customer had unrestricted `ALL` access via a live-only policy not in any migration. No app code uses this table at all.
2. **`reviews`** — a review's own author could self-approve (`is_approved`) via UPDATE, and could set `is_approved=true` directly on INSERT; both bypass moderation with zero admin involvement. Also could reassign `product_id`/`user_id` on their own row.
3. **`back_in_stock_notifications`** — any authenticated customer could read every other customer's email address and modify any row, via two live-only policies.
4. **`google_review_links`** — any authenticated customer had unrestricted `ALL` access via a live-only policy.
5. **`product_stories`** — any authenticated customer could insert/update any product's marketing copy via two live-only policies.
6. **`recompute_order_totals(uuid)`** — SECURITY DEFINER, EXECUTE open to anon/authenticated, no ownership check, callable against any order id.
7. **`is_admin(uuid)`** — EXECUTE re-opened to anon/authenticated by a later migration, undoing an earlier, deliberate revoke.
8. **Ten dead policies** using `(auth.jwt() ->> 'role') = 'admin'` — a JWT-claim scheme verified unreachable (zero users carry the claim, no hook sets it), left over from an abandoned design, coexisting with the real `is_admin()`/`admin_users` model.

---

# Exact Policies Being Dropped

| # | Table | Policy dropped | Live grantee/condition |
|---|---|---|---|
| 1 | `promotional_banners` | `"Authenticated users can manage promotional banners"` | `authenticated`, ALL, `true`/`true` |
| 2 | `back_in_stock_notifications` | `"Authenticated users can view all notifications"` | `authenticated`, SELECT, `true` |
| 3 | `back_in_stock_notifications` | `"Authenticated users can update notifications"` | `authenticated`, UPDATE, `true`/`true` |
| 4 | `back_in_stock_notifications` | `"Anyone can subscribe to back in stock notifications"` (duplicate insert) | `public`, INSERT, `true` |
| 5 | `back_in_stock_notifications` | `"Anyone can request back in stock notification"` (dropped, then recreated with validation) | `anon,authenticated`, INSERT, `true` |
| 6 | `google_review_links` | `"Authenticated users can manage google review links"` | `authenticated`, ALL, `true`/`true` |
| 7 | `product_stories` | `"Authenticated users can insert product stories"` | `authenticated`, INSERT, `true` |
| 8 | `product_stories` | `"Authenticated users can update product stories"` | `authenticated`, UPDATE, `true`/`true` |
| 9 | `orders` | `"Admins can view all orders"` (dead) | `authenticated`, SELECT, `jwt role=admin` |
| 10 | `orders` | `"Admins can update all orders"` (dead) | `authenticated`, UPDATE, `jwt role=admin` |
| 11 | `categories` | `"Only admins can manage categories"` (dead) | `authenticated`, ALL, `jwt role=admin` |
| 12 | `order_items` | `"Admins can view all order items"` (dead) | `authenticated`, SELECT, `jwt role=admin` |
| 13 | `product_images` | `"Only admins can manage product images"` (dead) | `authenticated`, ALL, `jwt role=admin` |
| 14 | `product_variants` | `"Only admins can manage product variants"` (dead) | `authenticated`, ALL, `jwt role=admin` |
| 15 | `products` | `"Only admins can manage products"` (dead) | `authenticated`, ALL, `jwt role=admin` |
| 16 | `reviews` | `"Admins can manage all reviews"` (dead) | `authenticated`, ALL, `jwt role=admin` |
| 17 | `newsletter_subscribers` | `"Admins can manage subscribers"` (dead, and the only ALL/UPDATE/DELETE policy that ever existed) | `authenticated`, ALL, `jwt role=admin` |
| 18 | `newsletter_subscribers` | `"Admins can view subscribers"` (dead, redundant with a working is_admin() one) | `authenticated`, SELECT, `jwt role=admin` |

For every dead-policy drop (#9–18) except #17, a proven `is_admin()`-based policy on the same table already covers the same operation — verified in the reconciliation report and re-verified by the local test suite. **#17 is the one exception**: dropping it would have left admin newsletter management permanently broken (it already was — the dead policy never worked), so a real replacement is created in the same migration (see next table).

---

# Exact Policies Being Created

| Table | New policy | Grantee / operation | Condition |
|---|---|---|---|
| `back_in_stock_notifications` | `"Anyone can request back in stock notification"` (recreated with validation) | `anon,authenticated`, INSERT | valid email regex + length ≤255, `product_id` must reference an existing product, `variant_id` (if given) must reference an existing variant |
| `back_in_stock_notifications` | `"Admins can update back in stock notifications"` | `authenticated`, UPDATE | `is_admin(auth.uid())` — restores the "mark as notified" capability the removed broad policy accidentally provided, via the correct mechanism |
| `newsletter_subscribers` | `"Admins can manage newsletter subscribers"` | `authenticated`, ALL | `is_admin(auth.uid())` — replaces the dead jwt-role policy that never actually granted this |

No other new policies. `promotional_banners`, `google_review_links`, `product_stories` get **no replacement policy** — their existing `is_admin()`-based `"Admins can manage ..."` policies (already present, unaffected) are sufficient, and no application code writes to them as a non-admin.

---

# Function EXECUTE Grants Being Revoked

| Function | Revoked from | Kept for | Why |
|---|---|---|---|
| `recompute_order_totals(uuid)` | `PUBLIC`, `anon`, `authenticated` | *(nobody, except internal trigger use and the `postgres` owner)* | No app code calls this directly (repo-wide search confirms). The only legitimate caller is the trigger chain, which runs as the `postgres` owner regardless of this grant — see Section 6 detail below, empirically tested. |
| `is_admin(uuid)` | `PUBLIC`, `anon` | **`authenticated` — deliberately kept** | See Section 7 below. This is the one place the plan changed from the original instruction after local testing. |

---

# Section 6 detail — `recompute_order_totals`, tested not assumed

**Claim:** revoking EXECUTE from `anon`/`authenticated` does not break the checkout total-recompute flow, because the only legitimate call path is `order_items` change → `trg_order_items_recompute_totals` (trigger) → `trg_recompute_order_totals()` (SECURITY DEFINER, owned by `postgres`) → `recompute_order_totals()` (SECURITY DEFINER, owned by `postgres`).

**Verified two ways:**
1. **Ownership check** (read-only query against production): both `trg_recompute_order_totals` and `recompute_order_totals` are owned by `postgres`. A SECURITY DEFINER function's privilege context for calls it makes internally is its **owner's**, not the original client's — so the nested call from one `postgres`-owned function to another is unaffected by what `anon`/`authenticated` can or can't do.
2. **Live execution test** (local replica, both before and after applying the exact proposed migration): a full checkout-shaped flow — insert an `orders` row, then an `order_items` row with deliberately wrong pricing — was run as the `authenticated` role after the EXECUTE revoke. Result: the pricing trigger still corrected `unit_price`/`total_price` from the catalog (150.00 × 3 = 450.00), and the total-recompute trigger still correctly derived `subtotal=450.00, tax_amount=22.50, total_amount=472.50`. **Confirmed working, not assumed.**

Direct RPC abuse (`SELECT recompute_order_totals('<someone else's order id>')` as an ordinary customer) was separately confirmed to now fail with `permission denied for function recompute_order_totals`.

---

# Section 7 detail — `is_admin`, the part of the plan that changed after testing

**The original instruction was to revoke EXECUTE from both `anon` and `authenticated`.** That was implemented first and tested first, exactly as instructed ("do not assume — test it").

**Result: it broke the entire application for every signed-in customer**, not just admin-only paths. Root cause: dozens of RLS policies across nearly every customer-facing table (`orders`, `order_items`, `addresses`, `customer_profiles`, `reviews`, `products`, ...) are `TO authenticated` and OR an `is_admin(auth.uid())` branch together with an ownership-based branch — e.g. `orders`: `"Admins can manage orders"` (is_admin) OR `"Users can view own orders"` (user_id match). PostgreSQL must evaluate **every** applicable permissive policy for a query, including the admin one, even for an ordinary customer reading their own single row. A SECURITY DEFINER function only changes privilege context **inside its own body**; the *invoking* role still needs EXECUTE to call it at all, including when that call is embedded in a policy expression. This contradicts the reasoning the original `20260429081624` migration's comment gave for why this would be safe — that reasoning was tested here and found to be incorrect for this specific database's policy design.

**Proof:** in the local replica, revoking EXECUTE from `authenticated` and then running the exact query shape `SELECT ... FROM orders WHERE id = ...` as an ordinary customer — reading their own or someone else's order, doesn't matter which — failed with `ERROR: permission denied for function is_admin`, every time, for every table with this policy pattern.

**Revised, tested plan:** revoke only from `anon`/`PUBLIC`. Verified after this narrower revoke:
- A customer reading another customer's order returns a clean `0 rows`, no error (the regression is gone).
- An admin still sees all orders, all `admin_users` rows, and can manage every table via the same `is_admin()`-gated policies (all re-tested and passing).
- A completely unauthenticated caller can no longer probe `is_admin()` at all (`permission denied`), closing the highest-value part of the original finding — reaching this endpoint used to require no account whatsoever.
- The residual risk — a **signed-up** customer checking a **specific, already-known** UUID's admin status — is unchanged from before, but now requires an account, which is strictly better than before (where it required nothing) and matches what the reconciliation report already characterized as low-severity, read-only information disclosure.

This is presented as a deviation from the literal instruction, with the reasoning and evidence for why, per "wait for explicit approval" — **if you want the full `authenticated` revoke anyway, it cannot be done safely without first redesigning every is_admin()-referencing policy on every affected table to avoid needing that OR-branch, which is a much larger, higher-risk change than this phase's stated scope ("keep changes small and reviewable"). I'd recommend against it and would want to scope that as its own phase if you still want it.**

---

# Review Moderation Enforcement — Mechanism Chosen

**Chosen mechanism: a `BEFORE INSERT OR UPDATE` trigger**, not column-level grants and not an RPC-only editing model.

**Why this over the alternatives:**
- *Column-level GRANTs* (`GRANT UPDATE (rating, title, comment) ON reviews TO authenticated`) would work for UPDATE but PostgreSQL has no equivalent restriction for which columns an INSERT may set with a non-default value — it wouldn't have closed the INSERT-time `is_approved=true` bypass.
- *RPC-based editing* (drop all direct table UPDATE, force review edits through a function) is the most airtight option but is a larger surface change — it would require reworking `ProductReviews.tsx`'s update call and is more than this phase's "small, reviewable" scope calls for, given a trigger fully closes the gap with no client-code changes at all.
- A trigger matches the pattern **already proven and working in this exact codebase** for `is_verified_purchase` (`enforce_review_integrity()`), so it's the most maintainable, least surprising choice for a future developer reading this schema — one consistent mechanism, not two.

**What the trigger (`enforce_review_moderation_fields`) does:**
```
IF is_admin(auth.uid()) THEN
  RETURN NEW;                          -- admins: no restriction, moderation works as before
END IF;

IF TG_OP = 'INSERT' THEN
  NEW.is_approved := false;            -- always starts unapproved, whatever the client sent
ELSIF TG_OP = 'UPDATE' THEN
  NEW.is_approved  := OLD.is_approved; -- cannot self-approve/self-reject
  NEW.user_id       := OLD.user_id;     -- cannot reassign ownership
  NEW.product_id     := OLD.product_id;  -- cannot reassign to a different product
END IF;
```
`rating`, `title`, `comment` are untouched — customers can still edit their own review's content, exactly as `ProductReviews.tsx` already does. `is_verified_purchase` is untouched by this trigger because it's already fully protected by the pre-existing `enforce_review_integrity()` trigger (confirmed still active, re-tested here).

**Tested:** self-approval via UPDATE now leaves `is_approved` at `false`; INSERT with `is_approved: true` in the payload is silently overridden to `false`; an admin's `UPDATE reviews SET is_approved = true` still works; a customer editing `rating`/`title`/`comment` on their own review still works and returns the new values.

---

# Expected Behavior By Role (all empirically tested, both before and after)

| Action | anon | Customer A | Customer B | Admin |
|---|---|---|---|---|
| Read active promotional banners / google review links / product stories | ✅ | ✅ | ✅ | ✅ |
| Write promotional banners / google review links / product stories | ❌ (was ✅ — now fixed) | ❌ (was ✅ — now fixed) | ❌ (was ✅ — now fixed) | ✅ |
| Submit a valid back-in-stock request | ✅ | ✅ | ✅ | ✅ |
| Submit an invalid back-in-stock request (bad email / unknown product) | ❌ rejected | ❌ rejected | ❌ rejected | n/a |
| Read all back-in-stock requests (incl. other customers' emails) | ❌ (always was) | ❌ (was ✅ — now fixed) | ❌ (was ✅ — now fixed) | ✅ (unchanged) |
| Update any back-in-stock request | n/a | ❌ (was ✅ — now fixed) | ❌ (was ✅ — now fixed) | ✅ (newly working, correctly) |
| Create a review | n/a | ✅ (starts unapproved) | ✅ (starts unapproved) | ✅ |
| Edit own review's rating/title/comment | n/a | ✅ | ✅ | ✅ |
| Self-approve own review | n/a | ❌ (was ✅ — now fixed) | ❌ (was ✅ — now fixed) | ✅ (moderation still works) |
| Set is_verified_purchase on own review | n/a | ❌ (always was — pre-existing trigger) | ❌ (always was) | ✅ (via is_admin ALL policy) |
| Read own orders / addresses | n/a | ✅ | ✅ | ✅ |
| Read another customer's orders / addresses | n/a | ❌ (always was) | ❌ (always was) | ✅ (unchanged) |
| Update own order's payment_status/total/status | n/a | ❌ (always was — no policy grants it, unrelated to this migration) | ❌ | ✅ |
| Call `is_admin()` directly | ❌ (was ✅ — now fixed) | ✅ (kept — see Section 7) | ✅ (kept) | ✅ |
| Call `recompute_order_totals()` directly on any order | ❌ | ❌ (was ✅ — now fixed) | ❌ | ❌ (not needed; admin uses the ALL policy for direct table access instead) |
| Checkout: place order, correct line pricing, correct totals | n/a | ✅ (unaffected) | ✅ (unaffected) | n/a |

---

# Regression Tests

All in `supabase/tests/phase2_security_verification.sql` (committed, self-contained, runs against any local PostgreSQL 14+, no Docker/Supabase-CLI required). Run instructions are in the file's header. Every test below was executed for real, twice — once against a replica of the current live policy set (confirming the exploit/behavior), once again after applying the exact migration file proposed here (confirming the fix/no-regression) — not reasoned about, not assumed.

- [1]/[2] Customer cannot UPDATE/INSERT `promotional_banners`
- [3] Customer cannot UPDATE `google_review_links`
- [4] Customer cannot UPDATE `product_stories`
- [5a]/[5b] Customer cannot SELECT/UPDATE another customer's `back_in_stock_notifications` row
- [6] Customer cannot self-approve own review
- [7] Customer cannot insert a pre-approved review
- [8] Customer cannot fake `is_verified_purchase` (pre-existing protection, re-confirmed)
- [9] Customer cannot reassign own review to a different product
- [10] Anonymous cannot read `back_in_stock_notifications` (sanity)
- [11]/[11b] `is_admin()` direct call: blocked for anon, intentionally still allowed for authenticated (with rationale)
- [12] Customer cannot call `recompute_order_totals()` on someone else's order
- [13] Customer reading another customer's order returns 0 rows **without error** (the specific regression this migration must never cause)
- [14] Customer cannot UPDATE own order's `payment_status` (pre-existing protection, re-confirmed, unrelated to this migration)
- [L1]–[L8] Legitimate flows: public reads, valid/invalid back-in-stock submission, review create/edit, full checkout (order + order_items + pricing trigger + total-recompute trigger), and every admin management capability

**Compile/static checks:** `npm run typecheck` was run — pre-existing, unrelated failures in `TermsConditionsPage.tsx` (JSX config issue) and `npm run lint` (missing `@eslint/js` module) were found; **both predate this change and are untouched by it** — this phase modified zero files under `src/`, only `supabase/migrations/` and `supabase/tests/`. Not fixed here as out of scope for a security phase; flagged for a separate cleanup pass.

**Verification level, stated explicitly per your rules:**
- **AUTOMATED TEST VERIFIED (locally, against a faithful replica):** every item in the table above, and every numbered test in the script.
- **NOT VERIFIED (live production):** nothing has run against the actual Supabase project — that requires your approval and, at minimum, read-write credentials this session does not have and was told not to request yet.
- **COMPILE VERIFIED:** N/A — no application code changed.

---

# Rollback Plan

**Preferred approach if anything goes wrong after deployment: roll forward with a new corrective migration, not backward.** Reverting a security fix reopens the vulnerability it closed; that should require the same explicit approval this migration itself is waiting for, not be a routine "oops, undo" step. The SQL below is provided for completeness and for a genuine emergency (e.g., the migration is somehow blocking a legitimate, business-critical flow that testing here didn't catch), split by risk:

**Low-risk to revert (undoes a restriction, doesn't reopen a vulnerability by itself):**
```sql
-- Restore is_admin() EXECUTE to anon (only needed if some untested anon-facing
-- flow turns out to depend on it — none were found in this phase's testing)
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon;

-- Restore recompute_order_totals() direct EXECUTE (only needed if some
-- untested direct-RPC flow depends on it — none were found)
GRANT EXECUTE ON FUNCTION public.recompute_order_totals(uuid) TO anon, authenticated;

-- Remove the new review-moderation trigger (reverts to the pre-fix bypass —
-- only do this if the trigger is somehow blocking legitimate review edits
-- in a way this phase's testing didn't catch)
DROP TRIGGER IF EXISTS trg_enforce_review_moderation_fields ON reviews;
DROP FUNCTION IF EXISTS public.enforce_review_moderation_fields();
```

**High-risk to revert (directly reopens a confirmed vulnerability — requires separate, explicit sign-off, not routine rollback):**
```sql
-- Reopens: any authenticated customer can manage banners/links/stories again
CREATE POLICY "Authenticated users can manage promotional banners" ON promotional_banners FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage google review links" ON google_review_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert product stories" ON product_stories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update product stories" ON product_stories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Reopens: any authenticated customer can read/modify all back-in-stock requests
CREATE POLICY "Authenticated users can view all notifications" ON back_in_stock_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update notifications" ON back_in_stock_notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Reverts the validated INSERT policy back to unvalidated
DROP POLICY IF EXISTS "Anyone can request back in stock notification" ON back_in_stock_notifications;
CREATE POLICY "Anyone can request back in stock notification" ON back_in_stock_notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
```
The ten dead-policy drops and the `newsletter_subscribers` replacement are not included above because reverting them restores zero functional access (they were provably inert) — there is no scenario where undoing that part of the migration fixes a real problem.

---

# Risks

- **Newsletter admin management is a net-new working capability**, not purely a restriction — if there's a reason admins should *not* be able to manage subscribers via the app (e.g. it's intentionally managed elsewhere), flag that and this piece can be dropped from the migration; it doesn't need to ship with the rest.
- **The `is_admin()` `authenticated` EXECUTE grant is intentionally left open** (Section 7) rather than fully closed as originally asked — if this residual, low-severity information-disclosure risk is unacceptable, closing it fully requires a separate, larger policy-redesign phase, not a quick follow-up to this one.
- **This migration does not touch `contact_submissions`** (unvalidated live INSERT policy, no SELECT policy for anyone) — confirmed real, but explicitly out of this phase's P0/P1 list; flagged, not silently left for someone to assume was covered.
- **This migration does not touch the dead first-generation migration files** (`customers`, `product_reviews`, etc.) — per instruction not to rewrite history. They remain permanently confusing to a future reader until a separate baseline-reconciliation change is scoped and approved.
- **Local-replica testing, however faithful, is not identical to production** — table/column definitions, extension availability (e.g. `extensions.uuid_generate_v4()` vs the `gen_random_uuid()` used in the replica), and any project-level configuration (connection poolers, statement timeouts) are not reproduced. The recommended post-deployment verification below exists specifically to close this gap.

---

# Production Deployment Procedure (proposed — not executed)

1. You review this plan and the exact migration file (`supabase/migrations/20260911220000_phase2_security_remediation.sql`) and the test script (`supabase/tests/phase2_security_verification.sql`).
2. On explicit approval, this session (or you, directly) obtains a Supabase credential with **write** access — the current token is deliberately read-only and cannot apply this regardless of approval; a new, appropriately-scoped token or the DB password would be needed, per your "do not request broader permissions unless a specific verification step genuinely requires it" rule — this is that step, and it will be asked for explicitly, not assumed.
3. Apply via `supabase db push` (linked to `dzayzvouvbjzthneakdv`) — **not** a manual dashboard SQL-editor paste, so it's recorded as a tracked migration.
4. Immediately after, run the read-only reconciliation queries from Phase 1 again (policy list, function EXECUTE grants, trigger list) to confirm the live state now matches this plan exactly.
5. Run the post-deployment verification below.

---

# Post-Deployment Verification (to run after approval + apply, not yet performed)

**Read-only checks** (can be done with the same read-only token used in Phase 1):
- `pg_policies` no longer lists any of the 18 dropped policies; lists the 3 new ones with the exact conditions above.
- `pg_proc`/`information_schema.role_routine_grants` shows `is_admin` EXECUTE present for `authenticated`, absent for `anon`/`PUBLIC`; `recompute_order_totals` EXECUTE absent for all of `anon`/`authenticated`/`PUBLIC`.
- `pg_trigger` shows `trg_enforce_review_moderation_fields` on `reviews`, enabled.

**Live functional checks requiring a real signed-in test account (not the production admin, a throwaway test customer)** — genuinely LIVE VERIFIED, not just automated-local:
- Sign up a fresh test customer; submit a review; confirm it does **not** appear publicly; confirm attempting to PATCH `is_approved: true` on it via the browser's network tools fails or is silently ignored (row stays `false`).
- Place a real order end-to-end (test product, smallest amount, pickup + COD to avoid a real Razorpay charge) and confirm the order total matches the catalog price × quantity + tax exactly, confirming the trigger chain is intact in production, not just locally.
- As the same test customer, confirm the homepage banner, Google review link, and any product story page still render normally (public read unaffected).
- As an actual admin account, confirm the admin panel's product story editor and (if a banner-management feature exists or is added later) banner editor still save successfully.
- Submit a back-in-stock request from a logged-out browser session and confirm no error.

---

# Items Deferred (explicitly out of scope for this phase, not forgotten)

- `contact_submissions` input validation + missing SELECT policy (real, confirmed, not P0/P1 here).
- Full `is_admin()` EXECUTE lockdown for `authenticated` (would require redesigning every is_admin()-referencing policy — larger phase).
- Dead first-generation migration files (`customers`, `product_reviews`, etc.) — baseline reconciliation, separate proposal needed per your instruction not to casually rewrite history.
- Everything explicitly excluded by this phase's brief: UI, performance, SEO, accessibility, router replacement, dependency upgrades, unrelated refactoring.
