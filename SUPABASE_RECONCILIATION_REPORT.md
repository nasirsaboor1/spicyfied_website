# Supabase Production Reconciliation Report

**Scope:** Steps 1–3 of the Phase 1 remediation plan only. No production writes were made. No migrations were applied. No policies, functions, triggers, or rows were modified.

**Method:** Authenticated via a user-supplied, project-scoped Supabase Personal Access Token. Verified the token resolves to exactly **one** project (`dzayzvouvbjzthneakdv`, org `scdzsqildiylgarvbdio`) — confirming it is scoped as described, not an account-wide token. Direct `pg_dump`/`db pull` (which requires provisioning a full login role) was attempted and correctly **rejected with 403** by this token — confirming it does *not* carry schema-management privileges. All inspection instead went through the Management API's `POST /v1/projects/{ref}/database/query` endpoint, which the token *does* have access to. The connected Postgres role for every query was verified as **`supabase_read_only_user`** (`select current_user` — see below), i.e. a genuinely read-only database role. No write, DDL, or destructive statement was ever issued.

```
select current_database(), current_user, version();
→ {"current_database":"postgres","current_user":"supabase_read_only_user","version":"PostgreSQL 17.6 ..."}
```

---

# Step 1 — Access Verification

| Check | Result |
|---|---|
| Token resolves to how many projects | **1** — `dzayzvouvbjzthneakdv` ("bolt-native-database-58566738"), matching the project ref already visible in `vercel.json`'s CSP |
| `supabase db dump --linked` (needs a provisioned login role — full DB credentials) | **Rejected: HTTP 403** — token lacks privilege to provision a login role. Confirms it is *not* a full/owner-level token. |
| Management API SQL query endpoint | **Works**, connects as `supabase_read_only_user` |
| Conclusion | Token is genuinely scoped as described: single project, read-only database access. Safe to use for Steps 2–3 as instructed. |

---

# Step 2 — Live State vs. Repository State

## 2.1 Tables that actually exist

Queried `pg_class`/`pg_namespace` directly (not `information_schema`, which the read-only role has restricted visibility into — see note below). **25 tables exist in `public`, all with `relrowsecurity = true` (RLS enabled), none with `FORCE ROW LEVEL SECURITY`:**

`addresses, admin_users, back_in_stock_notifications, cart_items, carts, categories, contact_submissions, content_pages, customer_profiles, delivery_settings, delivery_zones, google_review_links, newsletter_subscribers, order_items, order_status_history, orders, product_images, product_stories, product_variants, products, promotional_banners, recipe_ingredients, recipes, reviews, wishlists`

**Confirms AUDIT_REPORT.md's C-1 finding directly:** `customers`, `product_reviews`, `review_votes`, `payment_transactions`, `coupons`, and `email_notifications` — all defined in `supabase/migrations/20260115143651_*.sql` / `20260115212503_*.sql` — **do not exist live.** Those migration files describe a schema generation that was genuinely never applied. `src/lib/database.types.ts` (the generated live schema) already reflected this correctly — it was the migration *files* that were wrong, not the generated types.

**Methodology note:** `information_schema.triggers` returned zero rows for the `supabase_read_only_user` role even though triggers clearly exist (see 2.3) — that view applies an owner-visibility filter this role doesn't satisfy. All trigger/constraint findings below were re-derived from `pg_trigger`/`pg_constraint` directly, which are not subject to that filter.

## 2.2 RLS Policies — live vs. committed

All 76 live policies across the 25 tables were enumerated via `pg_policies`. Full comparison against every migration file. Two categories of drift found:

### (a) Policies that exist live and match a committed migration — no action needed
The large majority. Every `is_admin()`-based policy (on `admin_users`, `orders`, `order_items`, `addresses`, `customer_profiles`, `products`, `categories`, `product_variants`, `product_images`, `delivery_zones`, `delivery_settings`, `recipes`, `recipe_ingredients`, `content_pages`, `wishlists`, `carts`, `cart_items`) matches its migration exactly.

### (b) Policies that exist live and are NOT in any committed migration
This is the confirmed, concrete form of C-1. Two sub-categories:

**(b-1) Dead/inert legacy policies — no current security impact, but risk-in-waiting.**
Eight policies across `orders`(×2), `categories`, `newsletter_subscribers`(×2), `order_items`, `product_images`, `product_variants`, `products`, `reviews` use the condition `(auth.jwt() ->> 'role') = 'admin'`. This is a *different* admin-detection mechanism than the `is_admin()`/`admin_users` table approach the rest of the app uses — evidently left over from an earlier, abandoned design. **Verified these can never currently fire:**
```sql
select count(*) from auth.users where raw_app_meta_data->>'role' = 'admin';  →  0
```
No custom Auth "Access Token" hook function exists in `public` or `auth` schema (searched for any function name containing `hook`/`claim`/`role`; only the built-in `auth.role()` helper was found), and no `auth.hooks`-style config table exists. So `auth.jwt()->>'role'` can only ever equal `authenticated` or `anon` (Supabase's built-in Postgres-role claim) for every current session — never `'admin'`. **These policies are provably dead today.** They are not committed to any migration, so they were created directly against the database outside version control. Full list: `orders."Admins can view all orders"`, `orders."Admins can update all orders"`, `categories."Only admins can manage categories"`, `newsletter_subscribers."Admins can manage subscribers"`, `newsletter_subscribers."Admins can view subscribers"`, `order_items."Admins can view all order items"`, `product_images."Only admins can manage product images"`, `product_variants."Only admins can manage product variants"`, `products."Only admins can manage products"`, `reviews."Admins can manage all reviews"`.

**(b-2) Live-only policies that grant real, unintended access to ordinary authenticated users.** These are the significant new finding of this reconciliation pass — **not previously identified in AUDIT_REPORT.md**, because static analysis of the repo alone could not have surfaced them (they don't exist in any committed file):

| Table | Live policy (not in any migration) | Roles | Command | Condition |
|---|---|---|---|---|
| `back_in_stock_notifications` | `"Authenticated users can view all notifications"` | `authenticated` | SELECT | `true` |
| `back_in_stock_notifications` | `"Authenticated users can update notifications"` | `authenticated` | UPDATE | `true` / `true` |
| `back_in_stock_notifications` | `"Anyone can subscribe to back in stock notifications"` | `public` | INSERT | `true` (duplicate of the migration-committed `anon,authenticated` version) |
| `google_review_links` | `"Authenticated users can manage google review links"` | `authenticated` | ALL | `true` / `true` |
| `product_stories` | `"Authenticated users can insert product stories"` | `authenticated` | INSERT | `true` |
| `product_stories` | `"Authenticated users can update product stories"` | `authenticated` | UPDATE | `true` / `true` |
| `promotional_banners` | `"Authenticated users can manage promotional banners"` | `authenticated` | ALL | `true` / `true` |

Every one of these grants **any signed-up customer** (not just admins) unrestricted access — see Step 3 for exact exploitability.

## 2.3 Functions, triggers, grants — live vs. committed

**Functions present in `public` (9 total):** `enforce_order_item_pricing`, `enforce_review_integrity`, `get_delivery_fee`, `handle_new_customer_profile`, `is_admin`, `promote_to_admin`, `recompute_order_totals`, `trg_recompute_order_totals`, `update_updated_at_column`. This matches the "real schema" migrations exactly. `handle_new_user`, `update_product_rating`, `update_review_helpful_count`, `generate_order_number` (referenced only in the dead `customers`/`product_reviews` migrations) **do not exist live** — consistent with those migrations never having run.

**SECURITY DEFINER flags — all as committed:** `enforce_order_item_pricing`, `enforce_review_integrity`, `handle_new_customer_profile`, `is_admin`, `promote_to_admin`, `recompute_order_totals`, `trg_recompute_order_totals` are `SECURITY DEFINER`. `get_delivery_fee` and `update_updated_at_column` are not (correct — they don't need elevated privilege).

**EXECUTE grants — drift found, contradicting the audit's assumption that direct RPC abuse was closed off:**

| Function | anon EXECUTE | authenticated EXECUTE | Matches migration intent? |
|---|---|---|---|
| `is_admin(uuid)` | **true** | **true** | **No.** `20260429081646_revoke_is_admin_execute_from_public.sql` explicitly revoked this. But the later `20260816111124_admin_role_and_product_write_access.sql` does `CREATE OR REPLACE FUNCTION is_admin(...)` again and ends with its own `GRANT EXECUTE ON FUNCTION is_admin(uuid) TO anon, authenticated;` — **silently re-opening what the earlier hardening migration closed**, and this is the current live state. |
| `promote_to_admin(text)` | true | true | Not addressed by any hardening migration, but this function self-gates (`IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION`), so broad EXECUTE is not itself a hole — see Step 3. |
| `recompute_order_totals(uuid)` | true | true | Never addressed by any migration. Callable directly with an arbitrary `order_id` argument — see Step 3. |
| `enforce_order_item_pricing`, `enforce_review_integrity`, `handle_new_customer_profile`, `trg_recompute_order_totals` | true | true | Harmless — all four are trigger functions (`RETURNS trigger`); Postgres refuses to execute a trigger function via a direct call (`SELECT fn()`) or PostgREST RPC regardless of the EXECUTE grant. |

**Triggers — verified active and correctly attached (`pg_trigger.tgenabled = 'O'`, i.e. enabled):**
- `order_items.trg_enforce_order_item_pricing` → `enforce_order_item_pricing` — **live and enabled**
- `order_items.trg_order_items_recompute_totals` → `trg_recompute_order_totals` — **live and enabled**
- `reviews.trg_enforce_review_integrity` → `enforce_review_integrity` — **live and enabled**
- `auth.users.on_auth_user_created_customer_profile` → `handle_new_customer_profile` — **live and enabled**
- Standard `update_*_updated_at` bookkeeping triggers present on `addresses`, `cart_items`, `carts`, `categories`, `content_pages`, `google_review_links`, `orders`, `product_stories`, `product_variants`, `products`, `promotional_banners`, `recipes`

**This is good news, stated plainly:** the order-pricing and total-recompute integrity mechanism that AUDIT_REPORT.md called out as a *positive* finding is **confirmed genuinely active in production**, not just present in a migration file that might never have run. Same for review-integrity (`is_verified_purchase` enforcement) and the customer-profile auto-creation trigger.

**Constraints on `orders`/`order_items`/`addresses` — all present and matching committed migrations:** `orders_cod_pickup_only_check`, `orders_delivery_type_check`, `orders_payment_method_check`, `orders_payment_status_check`, `orders_status_check`, plus the expected primary/foreign keys (`orders.user_id → auth.users`, `orders.shipping_address_id → addresses`, `order_items.order_id/product_id/variant_id → orders/products/product_variants`, `addresses.user_id → auth.users`). No drift found here.

**Column defaults — one materially important correction to AUDIT_REPORT.md's H-5 finding:**
`reviews.is_approved` — **live default is `false`**, not `true` as the migration's own comment ("kept permissive... to preserve current behavior") implied. AUDIT_REPORT.md flagged H-5 as "reviews likely auto-approved" based on that comment; **live inspection shows this was wrong** — the comment describes intent that was never actually implemented at the column-default level. See Step 3 for what this actually means (it's not simply "safe" — a different, real bypass exists).

**Storage (`storage.objects` policies for the `Product Image` bucket) — matches migrations exactly, no drift:** admin-only INSERT/UPDATE/DELETE via `is_admin()`, bucket is `public = true` for read (correct — product photos are not sensitive).

---

# Step 3 — What a Normal Authenticated Customer Can Actually Do

Derived directly from the live policy set above, not from application code (per your instruction to verify via policy inspection rather than live attack attempts).

## Can (as intended)
| Action | Enforcing mechanism |
|---|---|
| Create their own order | `orders` INSERT policy `"Users can create own orders"`, `WITH CHECK (auth.uid() = user_id)` |
| Read their own orders | `orders` SELECT policy `"Users can view own orders"`, `USING (auth.uid() = user_id)` |
| Read/create/update/delete their own addresses | `addresses` SELECT/INSERT/UPDATE/DELETE policies, all scoped `user_id = auth.uid()` |
| Insert order items for an order they own | `order_items` INSERT policy, `WITH CHECK (EXISTS (... orders.user_id = auth.uid()))` |

## Cannot (correctly blocked)
| Action | Why it's blocked |
|---|---|
| Read another customer's order | `orders` SELECT is scoped to `user_id = auth.uid()`; no broader SELECT grant exists for non-admins |
| Read another customer's address | Same pattern on `addresses` |
| Modify **any** field of their own order directly (or anyone else's) | **There is no RLS UPDATE policy on `orders` for ordinary authenticated users at all** — the only UPDATE policies are `"Admins can manage orders"` (`is_admin()`) and the dead jwt-role one. A customer's PostgREST `PATCH /orders?id=eq....` is rejected outright by RLS regardless of what fields it touches. |
| Mark an order paid, change `total_amount`, `shipping_amount`, `status`, `razorpay_order_id`, `payment_id` | Same reasoning — no UPDATE path exists at all, so this is moot; there's nothing to bypass |
| Manipulate `order_items.unit_price`/`total_price` | Even though there's also no customer UPDATE policy on `order_items` (INSERT-only), the **live, enabled** `trg_enforce_order_item_pricing` trigger independently overwrites `unit_price`/`total_price` from `product_variants.price` on every INSERT regardless of what the client sent — defense in depth is real, not just written down |
| Access `admin_users`, or any admin-only table's write surface | Gated by `is_admin()`, confirmed live and working (see below) |
| Get `is_admin()` to return true for themselves | The function only reads `admin_users.is_active`; a customer has no INSERT path onto `admin_users` (`"Admins can add admin accounts"` requires `is_admin(auth.uid())` already) |

## Cannot yet be stated as fully safe — new findings from this pass
| Action | Actual live state |
|---|---|
| Invoke `is_admin(uuid)` directly via `/rest/v1/rpc/is_admin` | **Can, currently.** EXECUTE is live-granted to `anon`/`authenticated` (contradicting the hardening migration — see 2.3). Impact: a caller who already has a specific user's UUID can check whether that UUID is an admin. This does **not** grant privileges — the function is read-only — but it is an information-disclosure gap that the repo's own migration history believed was closed. |
| Invoke `promote_to_admin(text)` directly | **Can call it, but it does nothing for a non-admin.** The function's own body raises an exception unless the caller already passes `is_admin(auth.uid())`. Broad EXECUTE here is not itself a privilege-escalation path. |
| Invoke `recompute_order_totals(uuid)` directly with an arbitrary order id | **Can, currently.** `SECURITY DEFINER`, EXECUTE granted to `anon`/`authenticated`, **no ownership check inside the function** — it accepts any `order_id` and writes recomputed `subtotal`/`tax_amount`/`shipping_amount`/`total_amount` to that row, bypassing the (nonexistent, see above) `orders` UPDATE RLS entirely via its elevated privilege. **Practical impact is low**, because the values it computes are deterministically derived from data a customer independently cannot corrupt (`order_items.total_price` is trigger-protected; `delivery_zones`/`get_delivery_fee` are public read-only reference data) — so calling it against someone else's order just re-derives the same correct total. But it does let an unrelated user force an arbitrary write onto another customer's `orders` row (bumping `updated_at`, and re-running the calculation against whatever the *current* delivery-zone table says, which is a minor griefing/noise vector, not a financial one today). This is a least-privilege violation worth closing even though it isn't presently exploitable for financial gain. |
| Self-approve their own review, bypassing moderation | **Can, and this is real.** `reviews.is_approved` defaults to `false` (correct, moderation-gated by default) — but the UPDATE policy `"Users can update own reviews"` (`auth.uid() = user_id`) does **not** restrict which columns can change, and no trigger protects `is_approved` the way `trg_enforce_review_integrity` protects `is_verified_purchase`. A customer can `PATCH /reviews?id=eq.<their own review>` with `{"is_approved": true}` and it will succeed, making their review (any rating/text) publicly visible immediately via the `"Approved reviews are viewable by everyone"` policy — no admin action required. This is a genuine, live moderation bypass. It is a **different mechanism** than AUDIT_REPORT.md's H-5 hypothesized ("auto-approved on insert") — the insert path is actually safe; the update path is not. |
| Read/modify other customers' back-in-stock notification requests | **Can, currently.** See 2.2(b-2) — `"Authenticated users can view all notifications"` / `"...can update notifications"`, both `qual: true`. Any signed-in customer can list every email address that requested back-in-stock alerts for any product, and can modify any row (e.g. flip `is_notified`, or rewrite the `email`/`product_id` on someone else's request). |
| Rewrite Google review links shown to customers | **Can, currently.** `"Authenticated users can manage google review links"`, `qual: true`/`true` — full INSERT/UPDATE/DELETE for any signed-in user. |
| Rewrite product "story"/sourcing/heritage marketing copy | **Can, currently.** `"Authenticated users can insert/update product stories"`, both `true`. |
| Create, edit, or delete site-wide promotional banners (including the `link_url` shown to every visitor) | **Can, currently — the most serious of these.** `"Authenticated users can manage promotional banners"`, `qual: true`/`true`, `cmd: ALL`. Anyone who completes the normal signup flow at `/signup` can create a homepage banner with an attacker-controlled `link_url`, `title`, `content`, and color scheme, and set it active — a live defacement/phishing vector requiring no privilege beyond a free account. |

---

## Payment Integrity Verdict

| Field | Verdict | Enforcing mechanism (cited exactly) |
|---|---|---|
| `orders.payment_status` | **SAFE** | No RLS UPDATE policy on `orders` grants ordinary `authenticated` users UPDATE access. Only policies matching `orders` UPDATE are `"Admins can manage orders"` (`USING/WITH CHECK: is_admin(( SELECT auth.uid()))`) and the dead `"Admins can update all orders"` (`(auth.jwt()->>'role') = 'admin'`, provably unreachable — see 2.2(b-1)). With zero applicable permissive UPDATE policy, PostgREST/RLS denies the request outright regardless of payload. |
| `orders.total_amount` | **SAFE** | Same UPDATE-policy absence as above. Additionally, when totals *are* legitimately recomputed (via `order_items` changes), the live, enabled trigger `trg_order_items_recompute_totals` → `recompute_order_totals()` derives the value from `SUM(order_items.total_price)` + tax + `get_delivery_fee()`, never from a client-supplied number. |
| `orders.shipping_amount` (delivery fee) | **SAFE** | Same reasoning as `total_amount` — no customer UPDATE path on `orders`; when recomputed, sourced from `get_delivery_fee(postal_code)` against the `delivery_zones`/`delivery_settings` tables, not client input. |
| `orders.status` | **SAFE** | Same UPDATE-policy absence. |
| `orders.razorpay_order_id` / `orders.payment_id` | **SAFE** | Same UPDATE-policy absence. In practice these are only ever written by the `create-razorpay-order`/`verify-razorpay-payment` edge functions using the service-role key (which bypasses RLS by design, but those functions independently verify order ownership and, for `payment_id`, an HMAC-SHA256 signature from Razorpay before writing — code-level finding from AUDIT_REPORT.md, re-confirmed still applicable). |
| `order_items` pricing (`unit_price`, `total_price`) | **SAFE** | Live, enabled trigger `trg_enforce_order_item_pricing` (`BEFORE INSERT OR UPDATE ON order_items`) unconditionally overwrites `NEW.unit_price`/`NEW.total_price` from `product_variants.price × quantity`, rejecting unknown variants. Additionally, `order_items` has **no UPDATE or DELETE RLS policy for customers at all** (INSERT-only), so a customer cannot modify a line item after checkout even before the trigger would catch it. |

**Everything the user asked this phase to specifically verify about order/payment tampering came back SAFE.** The vulnerabilities this pass actually found are in a different, adjacent place: four uncommitted, overly-permissive policies on non-payment tables (`back_in_stock_notifications`, `google_review_links`, `product_stories`, `promotional_banners`), a review-moderation bypass via UPDATE, and two SECURITY DEFINER functions with broader-than-intended EXECUTE grants. None of these touch money or order state directly, but `promotional_banners` in particular is a genuine, live, customer-reachable defacement/phishing vector that needs to be prioritized alongside the payment-integrity work this phase set out to verify.

---

## What Changed From AUDIT_REPORT.md's Assessment

| AUDIT_REPORT.md claim | Live-verified correction |
|---|---|
| C-1: "cannot verify whether a customer can PATCH their own order's payment_status" | **Resolved: cannot, full stop.** No RLS UPDATE policy exists for customers on `orders` at all. |
| L-1: recommended a defense-in-depth trigger on `orders` for `payment_status`/`total_amount`/`status` "regardless of C-1's outcome" | Still worth adding as belt-and-braces (a future migration could accidentally add a permissive customer UPDATE policy on `orders` without realizing the financial-integrity implication), but it is **not closing a currently-open hole** — it's insurance against a future mistake, not a present vulnerability. |
| H-5: "reviews likely auto-approved... `is_approved` kept permissive per migration comment" | **Corrected: default is `false`, not auto-approved.** The real gap is a self-approval bypass via UPDATE, not an insert-time default. |
| M-1: "wildcard CORS on edge functions" | Unaffected by this pass — edge function CORS is a Deno/HTTP-layer concern, not a database one; still open as originally described. |
| "EXECUTE on SECURITY DEFINER functions... revoked from anon/authenticated" (Executive Summary, based on `20260429081624`/`20260429081646`) | **Partially reversed live.** `is_admin` had its EXECUTE grant silently restored by a later migration (`20260816111124`). `recompute_order_totals` was never covered by the original hardening at all. |
| Four permissive live-only policies on `back_in_stock_notifications`, `google_review_links`, `product_stories`, `promotional_banners` | **Not previously identified** — impossible to find from the repository alone, since none of these policies exist in any committed migration. This is the concrete payoff of doing live reconciliation rather than only static analysis. |

---

## Not Yet Verified / Out of Scope for This Pass

- **Auth configuration** (OTP rate limits, session lifetime, password policy, allowed redirect URLs) is project *configuration*, not database schema — not queryable via SQL, and the Management API's project-config endpoints were not tested against this token's scope (per your instruction to avoid requesting broader permissions unless genuinely required). If this matters for Phase 2, it needs a separate, explicit ask.
- **Database webhooks** (e.g., what calls `trigger-rebuild`) are also project configuration, not schema — not visible via SQL introspection. `pg_trigger`/`pg_proc` confirm no Postgres-level webhook trigger exists in `public`/`auth`, but Supabase's *dashboard-configured* webhooks (separate from Postgres triggers) are a distinct mechanism this pass could not inspect.
- **Row-level data content** was deliberately not queried beyond aggregate counts (e.g. `count(*) from auth.users where ...`) — no individual customer PII, order, or address row was read, per your "never modify/needlessly touch real customer data" instruction (applied here to reads as well, out of caution, even though the instruction was about writes).

---

## No Changes Made

No migration was written or applied. No policy, function, trigger, grant, or row was modified. This report is inspection-only, as instructed. Proposed remediation (new migration(s) reconciling the live policies above into version control, plus fixes for the four live-only overly-permissive policies and the review self-approval gap) is scoped for the next phase and will be presented for approval before anything is applied to production.
