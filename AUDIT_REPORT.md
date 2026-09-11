# Spicyfied — Full Application Audit

**Scope:** static analysis of the repository at commit `cd524c6` on branch `claude/dazzling-johnson-ees9eb`.
**Not performed:** live penetration testing against `https://spicyfied-website.vercel.app/`, direct inspection of the live Supabase project (no credentials/dashboard access from this session), or inspection of Vercel project settings (env vars, domains, build config) beyond what's in-repo.
**Confidence note:** where a finding depends on live database state (RLS policies, env vars actually set in Vercel/Supabase) that cannot be derived from the repo alone, it is explicitly marked `POTENTIAL — needs live verification`.

---

# Executive Summary

Spicyfied is **not** a Next.js app — despite the audit brief's Next.js-specific checklist, this is a **Vite + React 18 + TypeScript SPA**, statically built and deployed to **Vercel**, backed entirely by **Supabase** (Postgres + Auth + Storage + Edge Functions) with **Razorpay** for payments and the **Meta WhatsApp Cloud API** for OTP delivery and order notifications. There is no Node/Express/Next server; "backend" logic lives in Supabase Postgres (RLS + triggers) and six Deno edge functions.

**The engineering quality of the security-sensitive code is notably above average for a project this size.** Concretely:
- Order pricing is **not** trusted from the client — a Postgres trigger (`enforce_order_item_pricing`) overwrites `unit_price`/`total_price` from the catalog on every insert, and a second trigger recomputes order totals from the stored line items. A tampered cart price cannot reach a paid order.
- Razorpay payment verification does real HMAC-SHA256 signature verification server-side in an edge function, checks order ownership, and checks `payment_status` before/after — this is done correctly.
- Admin authorization is enforced in Postgres via a `SECURITY DEFINER` `is_admin()` function referenced from RLS policies, not just hidden in the UI — and `EXECUTE` on that function (and other `SECURITY DEFINER` functions) has been explicitly revoked from `anon`/`authenticated` in a dedicated hardening migration, closing off direct RPC abuse.
- Review "verified purchase" status is computed server-side from actual order history, not client-submitted.
- `vercel.json` ships a genuinely strong header set: HSTS, a real `Content-Security-Policy` (no `unsafe-inline` for scripts, Razorpay/Supabase-scoped `connect-src`), `X-Frame-Options: DENY`, `frame-ancestors 'none'`.
- No secrets are committed to source, no `dangerouslySetInnerHTML`, no `eval`, no obvious XSS/SSRF/open-redirect vectors were found anywhere in `src/`.

**The most significant issue found is not a vulnerability in the traditional sense — it's that the `supabase/migrations/` directory does not reliably describe the live database.** Several early migration files build a schema around a `customers`/`customer_id` model that a later migration's own comments admit was **"stale, never-applied"** — the real, live tables use `orders.user_id`, `customer_profiles`, and `admin_users` instead. Worse, the app's own client code (`OrdersPage.tsx`, `CheckoutPage.tsx`, `ProductReviews.tsx`) performs `SELECT`/`INSERT` operations against `orders`, `addresses`, and `reviews` under the real (`user_id`) schema that **require RLS policies which do not exist in any committed migration file.** Those policies must exist live (the app works in production), but they were evidently created directly against the database (Supabase Studio / SQL editor) and never captured in version control. This means: (a) the repo cannot be used to reliably stand up a second environment or reason about current access control with full confidence, and (b) this audit cannot 100%-verify from source alone that customers are prevented from directly `PATCH`-ing their own `orders.payment_status` via the public REST API, because the missing policy's exact `WITH CHECK` clause is unknown. This is flagged as the top P0 action: pull the live schema/policies and reconcile them into version control.

No confirmed critical, actively-exploitable vulnerability was found in this pass. The highest-priority items are the migration/production drift (governance + inability to fully verify RLS) and a small number of hardening gaps (defense-in-depth trigger on `orders`, CORS wildcard on edge functions, missing anti-spam on public forms, dead Netlify config files that silently disable planned legacy-URL redirects on Vercel).

---

# Application Architecture

| Layer | Technology |
|---|---|
| Framework | Vite 5 + React 18.3 + TypeScript 5.5 (client-side rendered SPA, hand-rolled router in `App.tsx` using `window.history`/`popstate`, **not** React Router) |
| Styling | Tailwind CSS 3.4 |
| Hosting | Vercel (static `dist/` output, SPA rewrite via `vercel.json`) |
| Backend/DB | Supabase (Postgres + Row Level Security), 22 SQL migrations in `supabase/migrations/` |
| Auth | Supabase Auth — email/password, email OTP, and phone OTP (delivered via WhatsApp through a custom "Send SMS Hook") |
| Serverless functions | 6 Supabase Edge Functions (Deno) in `supabase/functions/` |
| Payments | Razorpay (Checkout.js on client, order-creation/verification via edge functions) |
| Notifications | Meta WhatsApp Cloud API (order confirmation, shipping updates, OTP delivery) |
| Build-time SEO | `scripts/prerender.mjs` (per-route static HTML head injection + JSON-LD), `scripts/generate-merchant-feed.mjs` (Google Merchant Center feed), `scripts/smoke.mjs` |
| Package manager | npm, `package-lock.json` present |

**Directory structure** (abbreviated):
```
src/
  components/          UI components (+ admin/ subfolder for the admin panel)
  context/              AuthContext, CartContext (React context, not Redux/Zustand)
  lib/                  supabase client, admin data access, delivery calc, csv export, packing slip
  pages/                one component per route
supabase/
  functions/            6 Deno edge functions + _shared/whatsapp.ts
  migrations/           22 SQL files, applied in filename-timestamp order
scripts/                 Node build-time scripts (prerender, merchant feed, smoke test)
public/                  static assets, robots.txt, Netlify-style _headers/_redirects (see H2 — inert on Vercel)
```

**Environment variables** (client-exposed, `VITE_`-prefixed, safe by design since they're the Supabase anon key):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — used in `src/lib/supabase.ts`, `scripts/prerender.mjs`, `scripts/generate-merchant-feed.mjs`.

**Server-side-only secrets** (Supabase Edge Function secrets, never in client bundle — confirmed absent from `src/` and `.env` is git-ignored and not committed):
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SEND_SMS_HOOK_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `REBUILD_WEBHOOK_SECRET`, `DEPLOY_HOOK_URL`.

## Route Map

| Route | Purpose | Public/Private | Data accessed | Auth required | Authz required | Sensitivity |
|---|---|---|---|---|---|---|
| `/` | Homepage | Public | products, categories | No | No | Low |
| `/shop` | Product listing/search | Public | products, categories | No | No | Low |
| `/product/:slug` | Product detail, reviews | Public | products, reviews, variants | No | No | Low |
| `/recipes`, `/recipes/:id` | Recipe content (static + Supabase `recipes`) | Public | recipes | No | No | Low |
| `/login`, `/signup` | Auth | Public | Supabase Auth | No | No | Medium (credential handling) |
| `/reset-password` | Password reset completion | Public (requires valid Supabase recovery session) | Supabase Auth | Session from email link | No | Medium |
| `/checkout` | Cart → order creation, Razorpay | Private | orders, order_items, addresses, delivery_zones | Yes | Owns cart | **High** (payment, PII) |
| `/orders` | Order history | Private | orders, order_items, addresses | Yes | Owns orders (`user_id` filter client-side + RLS) | High (PII, order data) |
| `/dashboard` | Profile/address management | Private | customer_profiles, addresses | Yes | Owns profile | Medium (PII) |
| `/admin` | Admin panel (orders, products, customers, team) | Private, staff-only | orders, products, customers, admin_users, all order/customer tables | Yes | `admin_users.is_active` via `is_admin()` RLS | **Critical** |
| `/contact` | Contact form | Public | `contact_submissions` (anon INSERT) | No | No | Medium (PII, spam surface) |
| `/privacy`, `/terms`, `/shipping`, `/refund` | Static content | Public | none | No | No | Low |

## Edge Functions (server-side surface)

| Function | Purpose | Auth check | Authorization check | Notes |
|---|---|---|---|---|
| `create-razorpay-order` | Creates a Razorpay order for an existing pending order | Requires `Authorization` header, resolves user via `auth.getUser()` | Confirms `order.user_id === user.id`; rejects if already paid | Amount computed server-side from `orders.total_amount`, not client input — **good** |
| `verify-razorpay-payment` | Verifies Razorpay payment signature, marks order paid | Same as above | Same ownership check + `razorpay_order_id` match | HMAC-SHA256 verified with `crypto.subtle` — **correct implementation** |
| `send-whatsapp-message` | Sends order confirmation/shipped WhatsApp templates | Requires `Authorization` header | Confirmation: caller must own order. Shipped: caller must be an active admin | Correctly differentiates the two message types' authz |
| `send-sms-hook` | Supabase Auth "Send SMS Hook" — delivers phone OTP over WhatsApp instead of SMS | Verifies **webhook signature** via `standardwebhooks` library against `SEND_SMS_HOOK_SECRET` | N/A (system-to-system) | Correct signature-verification pattern for a Supabase Auth hook |
| `trigger-rebuild` | Triggers a Vercel deploy hook | Static header secret (`x-rebuild-secret`) compared with `!==` | N/A | See M-series findings — non-constant-time compare, wildcard CORS |
| `sitemap` | Generates `sitemap.xml` from active products | None (intentionally public) | N/A | Uses service-role key server-side only to read `products`; output is public data |

---

# Attack Surface

- **Public REST API surface:** every table with RLS enabled is reachable at `https://<project>.supabase.co/rest/v1/<table>` using the public anon key (which is, by design, embedded in the client bundle). The **entire security model for data access is RLS**, not the UI. This audit could only verify RLS policies that are captured in committed migrations (see H1) — anything configured only in the live Supabase Studio is a blind spot.
- **6 Edge Functions**, all with CORS `Access-Control-Allow-Origin: *` (M1).
- **Razorpay Checkout.js**, loaded from `https://checkout.razorpay.com/v1/checkout.js` at runtime (allow-listed in CSP `script-src`).
- **WhatsApp Cloud API** — outbound only, credentials server-side.
- **Public anonymous-write endpoints:** `contact_submissions` (INSERT, `anon`+`authenticated`), `back_in_stock_notifications` (INSERT, `anon`+`authenticated`), `newsletter_subscribers` (implied, not directly reviewed) — all unauthenticated write surfaces, i.e. spam/flood targets (H5).
- **Client-side router** with no server (or SPA-level) 404 — any unmapped path silently renders the homepage content at HTTP 200 (H3).

---

# Critical Security Issues

None found that are **confirmed and exploitable from the code as committed.** One item below is rated Critical because it blocks confident verification of the app's actual security posture, not because a specific exploit was demonstrated.

### C-1 — Migration history does not reflect the live database; some access-control policies exist only outside version control
- **Category:** Security governance / RLS verifiability
- **Severity:** Critical (blocks security verification) — **CONFIRMED** as a documentation/drift problem; the downstream RLS gap it creates is **POTENTIAL, needs live verification**
- **Affected files:** `supabase/migrations/20260115143651_create_ecommerce_schema.sql`, `20260115145211_*.sql`, `20260115212503_*.sql`, `20260115213606_*.sql`, `20260118024433_*.sql`, `20260225104644_*.sql` (all build a `customers`/`customer_id`/`product_reviews` schema); vs. `supabase/migrations/20260815210434_phone_auth_delivery_zones_payments.sql` line 4 ("*Rewritten to target the live database's actual schema (orders.user_id, no separate customers table...)*") and `20260819000000_customer_profiles_and_checkout_completion.sql` line 8 ("*the real schema has no `customers` table at all (that only existed in stale, never-applied migration files)*"). Confirmed against `src/lib/database.types.ts` (the generated live schema), which shows `orders.user_id`, `admin_users`, `customer_profiles`, and `reviews` (not `product_reviews`/`customers`).
- **Description:** The migrations folder contains two incompatible generations of the schema. The repo's own later comments confirm the first generation was never applied to production. That's fine on its own — except the app's client code performs operations against the *second* (real) schema's tables in ways that require RLS policies that **no committed migration creates**:
  - `src/pages/CheckoutPage.tsx:227` — `supabase.from('orders').insert({...user_id: user!.id...})` — requires an INSERT policy on `orders` scoped to `user_id = auth.uid()`. No migration creates one for the real schema (only `"Admins can manage orders"` FOR ALL exists, in `20260817202531_master_admin_access_and_team_management.sql`).
  - `src/pages/OrdersPage.tsx:68-72` — `supabase.from('orders').select('*').eq('user_id', user!.id)` — requires a matching SELECT policy. None committed.
  - `src/pages/CheckoutPage.tsx:136-140`, `163-170` — `addresses` SELECT/INSERT scoped to `user_id`. None committed for the real (`addresses.user_id`) schema — only the stale `customer_id`-based policies exist in the dead early migrations.
  - `src/components/ProductReviews.tsx:44-83` — `reviews` SELECT (`is_approved = true`) and INSERT (`user_id = auth.uid()`). None committed for the real `reviews` table — only `"Admins can manage reviews"` FOR ALL exists.
- **Evidence:** grep across all 22 migration files for `ON orders FOR`, `ON addresses FOR`, `ON reviews FOR` returns only the stale `customer_id`-based policies and the admin-only `FOR ALL` policies — see command output captured during this audit.
- **Realistic impact:** Since the app functions in production, these policies **must** exist live. The practical risk is twofold: (1) nobody can currently reconstruct the production database's access-control model from source control — a `supabase db reset`, a new staging environment, or a disaster-recovery restore from migrations alone would **not** reproduce working customer access, and would very likely under- or over-grant access by accident; (2) this audit cannot verify the exact `WITH CHECK` clause of the live `orders` UPDATE/INSERT policy, so it's impossible to confirm from code alone whether a customer's own JWT can be used to `PATCH /rest/v1/orders?id=eq.<their-order>` and set `payment_status=paid` or edit `total_amount` directly (the app's own UI never does this, but the public REST API doesn't care about the UI).
- **Recommended fix:** Run `supabase db diff` (or `db pull`) against the live project and commit a migration that captures the *actual* current policies on `orders`, `addresses`, `reviews`, and any other table with client-facing access. Delete or clearly archive the dead `customers`/`product_reviews` migrations (do not delete blindly — confirm with `supabase db diff` that nothing live still depends on artifacts they created, e.g. leftover triggers/functions). Going forward, treat "migration file" as the only source of truth — no more direct Studio edits.
- **Effort:** Medium (mostly `supabase db pull` + review, a few hours)

---

# High Severity Issues

### H-1 — (see C-1) — cross-referenced here as the concrete missing-migration inventory
Already detailed above; listed under Critical because of its blast radius on verifiability.

### H-2 — Legacy-URL redirect rules exist only in a Netlify-format file that Vercel never reads
- **Category:** SEO / configuration correctness
- **Severity:** High — **CONFIRMED**
- **Affected files:** `public/_redirects` (Netlify syntax), `public/_headers` (Netlify syntax); compare with `vercel.json` (the file Vercel actually honors)
- **Description:** `public/_redirects` defines 301 redirects for legacy Wix URLs (`/product-page/*` → `/product/:splat`, `/shop-1` → `/shop`, `/about-1` → `/`, `/contact-us` → `/contact`, etc.) and a duplicate `Cache-Control` header set. **Vercel does not read `_redirects`/`_headers` files** — those are Netlify's static-hosting convention. Vercel only reads `vercel.json`, and the committed `vercel.json` contains **only** the SPA catch-all rewrite (`/(.*) → /index.html`) and the security/cache headers — it has **no** `redirects` array at all.
- **Evidence:** `vercel.json` (read in full during this audit) has `rewrites` and `headers` keys only, no `redirects` key. `public/_redirects` (Netlify format) has the 301 rules. `README.md`/`package.json` confirm Vercel is the deploy target (`spicyfied-website.vercel.app`).
- **Realistic impact:** Anyone landing on an old Wix URL (`/product-page/turmeric-powder`, `/shop-1`, `/about-1`, `/contact-us`, `/privacy-policy`, etc.) — from old bookmarks, backlinks, or Google's still-indexed legacy URLs — hits the SPA catch-all instead of a 301. Combined with H-3 (no real 404/route-not-found state), the app's router (`App.tsx`) leaves `currentPage` at its last value for any unrecognized path, so these URLs silently render as the **homepage at HTTP 200** rather than either redirecting to the intended page or returning a 404. This both loses SEO link equity from any inbound backlinks to the old Wix URLs and confuses users who followed a specific old product/page link and land on the homepage with no explanation.
- **Recommended fix:** Port the redirect rules from `public/_redirects` into a `redirects` array in `vercel.json` (Vercel's redirect syntax uses `source`/`destination`/`permanent`). Delete `public/_redirects` and `public/_headers` afterward (dead config is confusing to future maintainers) or clearly comment that they're inert on the current host.
- **Effort:** Small

### H-3 — No true 404 / not-found state in the SPA router
- **Category:** SEO / reliability / UX
- **Severity:** High — **CONFIRMED**
- **Affected files:** `src/App.tsx` (the `handlePopState` function, lines 37-76, and the `Page` union type, line 26)
- **Description:** The router is a hand-rolled `if/else` chain matching known paths against `window.location.pathname`; there is no `else` branch. `currentPage` state defaults to `'home'` and is only ever changed when a path matches a known route. An unmatched path (any typo, any stale external link, any URL not explicitly listed) leaves `currentPage` unchanged — on a fresh page load `handlePopState()` runs once (line 79) and, finding no match, leaves it at the initial `'home'` value — so the homepage renders in full at HTTP 200 for any unrecognized URL. There is no `NotFoundPage` component anywhere in `src/pages/` (confirmed via search).
- **Realistic impact:** Soft 404s are actively penalized by Google's indexing (a URL that should 404 but returns 200 with unrelated content). It also means Vercel's edge/CDN always serves `200` regardless of path validity, so there's no way to distinguish "broken link" from "homepage" in analytics or monitoring.
- **Recommended fix:** Add a `NotFoundPage` component and an `else` branch that renders it (ideally also setting `document.title` and, if feasible with the prerender step, returning a real 404 status for prerendered/static paths). At minimum, render a clear "page not found" UI instead of a silent homepage substitution.
- **Effort:** Small

### H-4 — No anti-spam/rate-limiting on public write endpoints
- **Category:** Abuse / availability
- **Severity:** High — **CONFIRMED** (policies allow anonymous writes; no rate limiting found anywhere in the stack)
- **Affected files:** `src/pages/ContactPage.tsx` (`contact_submissions` insert, line 58), `supabase/migrations/20260302205655_fix_foreign_key_indexes_and_security.sql` (INSERT policy, `TO anon, authenticated`, `WITH CHECK` only validates field length/non-emptiness — no rate limit), `supabase/migrations/20260831210000_admin_improvements.sql` (`back_in_stock_notifications` INSERT policy, `TO anon, authenticated`, `WITH CHECK (true)` — **no validation at all**)
- **Description:** Both the contact form and the back-in-stock notification form accept anonymous inserts directly against PostgREST with no CAPTCHA, no honeypot, and no rate limiting at any layer (no edge function in front of them, no Postgres-level throttle). `back_in_stock_notifications` has `WITH CHECK (true)` — completely unconstrained.
- **Realistic impact:** A scripted client can flood `contact_submissions` (spamming whatever inbox/admin view reads it) or `back_in_stock_notifications` (garbage emails against arbitrary `product_id`s) at will, using only the public anon key that's already in every page load. This is a data-quality and potential cost/availability issue (unbounded table growth), not data exposure.
- **Recommended fix:** Add basic request throttling (e.g., an edge function in front of these inserts that applies IP/session-based rate limiting, or a lightweight CAPTCHA like hCaptcha/Turnstile on the contact form). At minimum add a `WITH CHECK` constraint on `back_in_stock_notifications.email` matching a basic email-format regex, mirroring the pattern already used for `contact_submissions`.
- **Effort:** Medium

### H-5 — Public reviews are (evidently) auto-approved with no moderation gate
- **Category:** Content abuse / trust & safety
- **Severity:** High — **POTENTIAL, needs live verification** (the *default* value of `reviews.is_approved` in the live schema is not visible from any committed migration — see C-1)
- **Affected files:** `src/components/ProductReviews.tsx` (submits a review with no `is_approved` field, relying on the column default), `supabase/migrations/20260823120000_order_and_review_integrity.sql` lines 29-38 (comment states: *"New reviews from non-admins are forced to `is_approved = true` only when verified, otherwise left to the existing default (kept permissive here to preserve current behavior; flip `DEFAULT_REVIEW_APPROVED` to false to require moderation)"*) — but the actual trigger body in that same migration (`enforce_review_integrity`, lines 147-169) only sets `is_verified_purchase`; it does not touch `is_approved` at all, so the comment describes intended behavior that isn't implemented in that migration, and the true default is defined wherever the live `reviews` table was actually created (not in this repo — see C-1).
- **Description:** Any authenticated user can post a review (`rating`, `title`, `comment`) for any product, and `ProductReviews.tsx`'s read path (`loadReviews`, line 52-59) shows it publicly the moment `is_approved = true`. Given the migration's own comment says the behavior was "kept permissive," it's likely unverified reviews go live immediately with no human moderation step.
- **Realistic impact:** Fake reviews, profanity/spam, or defamatory comments about the business (or competitors posing as customers) could appear on live product pages with no review queue. This is a reputational and (in some jurisdictions) legal-liability risk for user-generated content platforms.
- **Recommended fix:** Confirm the live default for `reviews.is_approved`. If `true`, either flip it to `false` and add an admin moderation queue (the admin panel already has the infrastructure — `AdminOrdersView.tsx`, `AdminProductsView.tsx` show the pattern to follow), or at minimum add basic profanity/spam filtering before publish.
- **Effort:** Medium

---

# Medium Severity Issues

### M-1 — Wildcard CORS on all Supabase Edge Functions
- **Category:** CORS / API hardening
- **Severity:** Medium — **CONFIRMED**
- **Affected files:** `supabase/functions/create-razorpay-order/index.ts:4`, `verify-razorpay-payment/index.ts:4`, `send-whatsapp-message/index.ts:5`, `trigger-rebuild/index.ts:4`, `sitemap/index.ts:7` — all set `"Access-Control-Allow-Origin": "*"`.
- **Description:** Every edge function allows cross-origin calls from any web origin. Because these functions are Bearer-token authenticated (not cookie-based), classic CSRF isn't directly applicable — an attacker's page can't ride the victim's Supabase session automatically. But wildcard CORS still means any third-party site can attempt calls against these endpoints from a visitor's browser (e.g., to probe error messages, or replay a token the attacker already has through some other leak) with the browser happily allowing the response to be read.
- **Realistic impact:** Low-to-moderate on its own given the token-based auth model, but it's unnecessary exposure with no offsetting benefit — `sitemap` is the only function that plausibly needs to be called from an arbitrary origin.
- **Recommended fix:** Restrict `Access-Control-Allow-Origin` to the production origin(s) (`https://spicyfied.in`, `https://spicyfied-website.vercel.app`, and any preview-deployment pattern in use) for the payment/messaging functions. `sitemap` can reasonably stay wildcard since its output is public data.
- **Effort:** Small

### M-2 — Non-constant-time secret comparison in `trigger-rebuild`
- **Category:** Timing side-channel (defense-in-depth)
- **Severity:** Medium (theoretical exploitability is very low over a network with realistic jitter) — **CONFIRMED** as a code pattern
- **Affected files:** `supabase/functions/trigger-rebuild/index.ts:18` — `providedSecret !== expectedSecret`
- **Description:** String comparison of the rebuild-trigger secret uses standard `!==`, which short-circuits on the first differing byte. This is a textbook timing side-channel pattern, though practically very hard to exploit remotely given network jitter.
- **Recommended fix:** Use a constant-time comparison (e.g., compare `crypto.subtle.digest` hashes of both values, or a constant-time-compare utility) — same pattern already correctly used for the Razorpay HMAC check.
- **Effort:** Small

### M-3 — Dev-dependency vulnerabilities (no production impact)
- **Category:** Dependency risk
- **Severity:** Medium (dev-only, not shipped to production) — **CONFIRMED** via `npm audit`
- **Affected:** `browserslist` (high — unbounded memory growth), `js-yaml` (high, transitive), `postcss-selector-parser` (moderate/low, transitive), `esbuild`/`vite` dev server (moderate — arbitrary origin can read dev-server responses, **only relevant while running `vite dev` locally**, not in the deployed static build)
- **Description:** `npm audit` reports 5 vulnerabilities, all in `devDependencies` (Vite/Tailwind/PostCSS/ESLint toolchain), 0 in the 27 production dependencies (`@supabase/supabase-js`, `react`, `react-dom`, `lucide-react`, `motion`).
- **Realistic impact:** None to the deployed production site (it's a static build with no dev server running). Relevant only to contributors running `npm run dev` on a network where an untrusted site could reach `localhost` — and even then only the `esbuild` one.
- **Recommended fix:** `npm audit fix` handles `browserslist`, `js-yaml`, `postcss-selector-parser` without breaking changes. The `esbuild`/`vite` fix requires a major Vite upgrade (`vite@8`) — **do not do this reflexively**; test the whole build/prerender pipeline (`scripts/prerender.mjs` relies on Vite's output shape) before upgrading, given the audit brief's own instruction not to blindly upgrade.
- **Effort:** Small (safe fixes) / Medium (Vite major upgrade, if pursued)

### M-4 — No true 404 handling compounds with legacy-redirect gap (see H-2/H-3)
Cross-referenced; not double-counted in prioritization.

---

# Low Severity / Hardening

- **L-1 — Defense-in-depth: no trigger protects top-level `orders` columns on UPDATE.** `order_items` pricing is correctly protected by `enforce_order_item_pricing()` (a client cannot set `unit_price`/`total_price` directly). No equivalent trigger exists for the `orders` row itself (`payment_status`, `status`, `total_amount`). Today no client code path calls `.update()` on `orders` directly as a customer (confirmed: only `AdminOrdersView.tsx` does, and admins are already fully trusted via `is_admin()`), so this isn't currently reachable through the app's own UI — but per C-1, the live RLS policy governing customer UPDATE access to `orders` isn't visible from this repo. **Recommended fix (do regardless of C-1's outcome):** add a `BEFORE UPDATE` trigger on `orders` that re-derives `payment_status`/`total_amount` from trusted state (mirroring the `order_items` pattern) rather than trusting any RLS policy alone to hold the line — belt-and-braces given a single policy misconfiguration would otherwise directly translate to "customers can mark their own order paid." Effort: Small.
- **L-2 — 31 uses of `any`/`as any`** across `src/` (grep count). Not a security issue; erodes the value of `strict: true` in `tsconfig.app.json`. Notable concentration in `AdminOrdersView.tsx` (`data as any`) and Supabase query result handling. Recommend typing Supabase query results via the generated `Database` type more consistently. Effort: Medium (incremental).
- **L-3 — `public/_headers` duplicates (and partially conflicts with) `vercel.json`'s header config**, and is entirely inert on Vercel (same root cause as H-2). Not a live risk since `vercel.json` is authoritative and is itself solid, but it's misleading dead configuration. Effort: Small (delete or annotate).
- **L-4 — Google Fonts loaded via `@import` in `src/index.css:1`** rather than a `<link rel="preconnect">` + `<link rel="stylesheet">` pair in `index.html`. `@import` delays font CSS discovery until the main stylesheet is parsed, adding a render-blocking round trip. `display=swap` is correctly present in the URL, limiting the practical impact to a network-priority issue rather than invisible-text (FOIT). Effort: Small.
- **L-5 — Contact form / most `<img>` tags lack `alt` text** (2 of 15 raw `<img>` occurrences in `src/` have `alt=`). See Accessibility section. Effort: Small–Medium.

---

# Dependency Risks

- **Production dependencies (27 total):** `@supabase/supabase-js@^2.57.4`, `react@^18.3.1`, `react-dom@^18.3.1`, `lucide-react@^0.344.0`, `motion@^13.1.1`. `npm audit` reports **zero** known vulnerabilities in this set.
- **`lucide-react` is pinned to a fairly old `0.344.0`** (current major versions of `lucide-react` release frequently); no vulnerability found, just a maintenance note — icon libraries rarely carry security risk, low priority to bump.
- **`motion@^13.1.1`** (Framer Motion's successor package) — used across several purely decorative components (`SpiceDrift.tsx`, `SpicePuff.tsx`, `SpiceReveal.tsx`, `Reveal.tsx`). No vulnerability found; flagged only under Performance (bundle weight for animation that's non-essential to core commerce flows).
- **Dev dependencies:** see M-3 above — 5 known advisories, all dev-tooling, zero production exposure.
- **No suspicious lifecycle scripts** (`postinstall`/`preinstall`) found in `package.json` for first-party or scanned dependencies within audit scope.
- **No duplicate/overlapping packages** doing the same job (e.g., no both-Redux-and-Zustand situation) — state management is plain React Context throughout, appropriately sized for this app.
- **Do not blindly run `npm audit fix --force`** — it would pull in Vite 8, a major version bump that could affect the custom `scripts/prerender.mjs`/`scripts/generate-merchant-feed.mjs` build pipeline (both read `dist/index.html` structurally). Test the full `npm run build` pipeline end-to-end before adopting.

---

# Vercel / Deployment Issues

- **`vercel.json` header/CSP configuration is strong** — see Executive Summary. No changes recommended to the CSP itself; it correctly scopes `script-src` to `'self'` + Razorpay, `connect-src` to `'self'` + the specific Supabase project host + Razorpay, and sets `frame-ancestors 'none'`.
- **H-2 (Critical to SEO):** `public/_redirects` and `public/_headers` are Netlify-only conventions and have **no effect on Vercel**. The legacy-URL 301 redirect strategy documented in those files is not actually running in production. This needs to be ported into `vercel.json`'s `redirects` array — see H-2 for full detail.
- **`vercel.json`'s `headers` array applies the CSP/security headers to every route (`/(.*)`)**, which is correct, plus a specific immutable long-cache rule for `/assets/*`. No caching issue found there. (Whether `/`, `/product/*`, etc. get the shorter `max-age=300` cache noted in `public/_headers` is **not actually configured in `vercel.json`** — since Vercel ignores `_headers`, static HTML pages likely fall back to Vercel's default caching behavior for static files, which may over-cache prerendered product pages relative to intent. Verify actual response headers on production URLs.)
- **Deploy-hook architecture:** `trigger-rebuild` edge function → Vercel Deploy Hook URL (`DEPLOY_HOOK_URL` secret). This is a reasonable "rebuild on content change" pattern (e.g., triggered from Supabase on product/content updates) but its own auth is a static shared-secret header (see M-2). No evidence found of *what* calls `trigger-rebuild` (no database webhook config is present in this repo — Supabase DB webhooks are configured in the dashboard, out of repo scope) — recommend documenting/versioning that trigger configuration too, for the same reasons as C-1.
- **No `staging`/preview-specific configuration found** — recommend confirming Vercel preview deployments (which get auto-generated `*.vercel.app` URLs) are covered by the CSP's implicit same-origin assumptions and that preview deployments don't leak into the production Supabase project's CORS allow-list once M-1 is fixed (a preview URL would need to be added to any origin allow-list, or CORS restriction should be pattern-based).

---

# UI/UX Findings

Evaluated by reading through `HomePage.tsx`, `Header.tsx`, `ShopPage.tsx`, `ProductDetailPage.tsx`, `CheckoutPage.tsx`, `Cart.tsx`, `Footer.tsx`, and `index.html`'s meta content (static analysis only — **no live browser walkthrough was performed in this pass**; treat below as code-inferred, not visually confirmed).

**5-second test (inferred from `index.html` + `HomePage.tsx` copy, not visually verified):**
1. *What does Spicyfied sell?* — Likely yes: `<title>Spicyfied | Premium Spices & Dry Fruits</title>` and OG description are explicit.
2. *Why is Spicyfied different?* — Partially: the prerender script's homepage copy ("sourced directly from trusted farms") gestures at this but isn't a strong differentiator (many competitors claim the same). No visible certification/origin-proof callout in the code reviewed.
3. *Where does it deliver?* — Not obviously answered above the fold from code alone — delivery scope (pan-India vs. Varanasi-local) only surfaces at checkout (`CheckoutPage.tsx` mentions "Free delivery within 5km of Varanasi (221001) · ₹50 delivery charge elsewhere in India"). Recommend surfacing delivery scope earlier (homepage or shop page banner) since it's a common bounce point for e-commerce.
4. *Why trust Spicyfied?* — Weak trust-signal presence in the code reviewed: no visible certifications, no review-count/rating prominently pulled onto the homepage, no "as seen in" or social proof components found in `HomePage.tsx`. `product_stories` table exists (heritage/sourcing info per product) but that's per-product, not homepage-level trust.
5. *What should the visitor do next?* — Likely yes: `ShopPage`/`HomePage` navigation and a persistent `Cart` component provide clear next actions.

**Other findings (code-level, needs live confirmation):**
- The custom router (`App.tsx`) re-renders the entire page tree on every navigation with no code-splitting evident (`import` statements for every page are static top-level imports in `App.tsx`, not `React.lazy`) — all page bundles ship in the initial JS payload regardless of route. This affects both perceived performance and the UX findings below.
- Delivery-fee calculation happens asynchronously mid-checkout (`CheckoutPage.tsx` `useEffect` calling `getDeliveryFee`), showing a `...` loading state inline in the price summary — reasonable pattern, no dark pattern observed.
- Pickup vs. delivery payment-method coupling (`cod` forced for pickup, `upi`/`card` for delivery) is enforced both client-side (`useEffect`, line 104-111) and server-side (DB `CHECK` constraint `orders_cod_pickup_only_check` in `20260819000000_customer_profiles_and_checkout_completion.sql`) — **this is the correct pattern** (client UX convenience + server-enforced invariant), called out positively.

---

# E-commerce Conversion Findings

*(Code-level inference only; a live walkthrough is recommended before acting on these.)*

- **Positive:** `BulkPricingNote.tsx` component exists and is shown at checkout (`CheckoutPage.tsx:702`) — bulk-pricing transparency is a good trust signal for a spice/dry-fruit store where quantity-based pricing is standard.
- **Positive:** Server-enforced review "verified purchase" badge (`is_verified_purchase`, computed server-side, see Executive Summary) is a genuine trust signal, not a spoofable UI label — worth highlighting more prominently in the UI if it isn't already (only `ProductReviews.tsx`'s `Review` interface carries the field; verify it's visually distinguished from unverified reviews).
- **Gap — unmoderated reviews (H-5):** paradoxically, the verified-purchase signal's value is undercut if any account (verified or not) can post instantly-live reviews with no moderation, since the average shopper won't parse the "verified" badge distinction.
- **Gap — no visible return/refund policy linkage found in the checkout flow itself** — `RefundCancellationPage.tsx` exists as a standalone route but `CheckoutPage.tsx`'s only policy reference is the generic "you agree to our terms and conditions" line (line 764) with no direct link component visible in the snippet reviewed. Recommend linking the actual refund policy at the point of payment-method selection, not just in the footer.
- **Gap — no cross-sell/related-product mechanism visible in `CheckoutPage.tsx`** (cart review step has no "you might also like" — common, low-effort AOV lever for a spice store, e.g. surfacing a recipe that uses items already in cart via the existing `recipeMatch.ts`/`PantryMatch.tsx` infrastructure, which the app already has for a different purpose).
- **No dark patterns found** — no pre-checked upsells, no countdown-timer urgency fakes, no forced account creation before viewing prices (checkout does require login, which is standard, not a dark pattern) — no manipulative pattern instructed against.

---

# Mobile Findings

- Tailwind's responsive utility classes (`md:`, `lg:`) are used pervasively throughout the reviewed pages (`CheckoutPage.tsx`, `AdminPage.tsx`, etc.) — grid layouts collapse to single-column at breakpoints, consistent with the requested mobile-usability bar.
- `index.html` has the correct `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
- **Not verified in this pass:** actual touch-target sizing, tap-highlight behavior, and real-device rendering — this requires a live browser/device walkthrough, which was out of scope for this static-analysis pass. Recommend a dedicated mobile QA pass before the next release, specifically on the admin panel's data-dense tables (`AdminOrdersView.tsx`), which is the most likely place for cramped mobile layouts given its column count.

---

# Accessibility Findings

- **L-5 (confirmed):** Only 2 of 15 raw `<img>` tag occurrences found via grep across `src/` include an `alt` attribute. Missing `alt` text fails WCAG 2.2's 1.1.1 (Non-text Content) and is also an SEO image-indexing miss.
- **Low `aria-`/`role` attribute usage** (9 files reference either) relative to the size of the codebase (60+ components/pages) — this alone isn't damning (semantic HTML elements often don't need explicit ARIA), but combined with the low `alt`-text rate it suggests accessibility wasn't a first-class design constraint. Recommend a dedicated pass with an automated tool (axe DevTools, Lighthouse accessibility audit) against the live site, since static analysis can't evaluate computed contrast ratios, focus order, or actual screen-reader output.
- **`loading="lazy"` used only 3 times** across the whole codebase despite dozens of `<img>` occurrences (see Performance) — tangential to accessibility but relevant to reduced-motion/data users.
- **No `prefers-reduced-motion` handling found** in `src/index.css` or the animation components (`SpiceDrift.tsx`, `SpiceReveal.tsx`, `SpicePuff.tsx`, `Reveal.tsx` — all built on the `motion` library). WCAG 2.2's 2.3.3 (Animation from Interactions, AAA) and general best practice recommend respecting `prefers-reduced-motion: reduce`. Given this app leans on scroll-tied spice animations as a homepage centerpiece (per recent commit history — "Rework scroll animation and fake/real section around real photography"), this is worth an explicit media-query guard.
- **Buttons vs. links:** spot-checked `Header.tsx` line 57 — `<div onClick={...}>` used as a click target for logo/home navigation instead of a semantic `<a>`/`<button>`, which is not keyboard-accessible (no `tabIndex`, no `onKeyDown`, no implicit focusability) and not correctly announced by screen readers as interactive. Recommend replacing `onClick`-bearing `<div>`s with real interactive elements wherever found — this one is representative of a pattern likely repeated elsewhere given the same hand-rolled-router approach (`window.history.pushState` calls are wired to arbitrary elements, not consistently to anchors).

---

# Performance Findings

Ranked by likely impact, based on static evidence:

1. **No code-splitting** — `App.tsx` statically imports every page component (`HomePage`, `AdminPage`, `CheckoutPage`, etc.) at the top level with no `React.lazy`/`Suspense`. This means the admin panel's entire component tree (`AdminOrdersView`, `AdminProductsView`, `AdminDashboardView`, `AdminTeamView`, `AdminCustomersView`, plus `csvExport`/`packingSlip` helper libs) ships in the JS bundle downloaded by every anonymous shopper, even though only staff ever reach `/admin`. This is the single largest concrete opportunity identified for reducing initial JS payload. **Recommended fix:** wrap route components in `React.lazy(() => import(...))`, at minimum for `/admin` and its subtree. Effort: Small–Medium.
2. **Unoptimized recipe images** — `public/images/recipes/` contains 52 JPGs (8.2MB total), several 240–250KB each, with no WebP/AVIF variants and no responsive `srcset`. The `spice-scroll/` hero images are already correctly using `.webp` (3 files) — the recipe images were evidently not given the same treatment. **Recommended fix:** convert recipe images to WebP (with JPG fallback only if broad legacy-browser support is a real requirement — it likely isn't for a 2026-era storefront) and add `loading="lazy"` (see finding below) plus explicit `width`/`height` to prevent layout shift (CLS). Effort: Small (batch conversion + a find/replace of the `<img>` usage).
3. **`loading="lazy"` used only 3 times** across the whole codebase. Recipe grids, product grids, and review sections likely render many below-the-fold images without deferring their fetch — directly increases LCP-competing network contention on page load. Effort: Small.
4. **Render-blocking Google Fonts `@import`** (L-4) — move to `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html`'s `<head>`, ahead of the app bundle. Effort: Small.
5. **`motion` library used purely for decorative homepage animation** (`SpiceDrift`, `SpicePuff`, `SpiceReveal`, `Reveal` components) — worth confirming (via a real bundle-analyzer run, e.g. `npx vite-bundle-visualizer`) that this isn't a disproportionate share of the JS payload for what is, functionally, homepage flourish rather than core commerce functionality. Not flagged as urgent without bundle-size numbers, but worth a `rollup-plugin-visualizer` pass before/after optimization work.
6. **Build already does the right high-leverage thing for SEO/LCP on content routes:** `scripts/prerender.mjs` statically pre-renders per-route `<head>` metadata and a hidden but real `<h1>`/description snippet for crawlers/no-JS clients, and per-product JSON-LD. This is a strong, correctly-implemented pattern for an SPA that doesn't (and, given the architecture, reasonably can't easily) do full SSR — called out positively, not a finding to fix.
7. **`vercel.json`'s `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`** is correct (Vite fingerprints asset filenames, so immutable long-cache is safe). No change needed there.

---

# SEO Findings

- **Positive — solid foundation:** per-route `<title>`/meta description/canonical/OG/Twitter Card injection via `scripts/prerender.mjs`, plus product-level `Product`/`AggregateOffer`/`AggregateRating` JSON-LD generated per product from live catalog data. `sitemap.xml` is dynamically generated from `is_active` products (edge function `sitemap/index.ts`) and fetched into the static build. `merchant-feed.xml` (Google Merchant Center RSS) is generated with the required `g:id`/`g:title`/`g:price`/`g:availability`/`g:brand`/`g:condition` fields, correctly using `identifier_exists: no` for a private-label food catalog with no GTINs. `robots.txt` correctly disallows private routes (`/admin`, `/checkout`, `/orders`, `/dashboard`, `/login`, `/signup`) and points to both sitemaps.
- **H-2 (repeated from above, primary SEO impact):** legacy Wix URL 301s are configured in a file Vercel ignores — meaning any link equity/index entries pointing at the old Wix URL structure are currently being lost to a silent soft-200-homepage rather than redirected.
- **H-3 (repeated):** no real 404 status for genuinely invalid URLs — same soft-404 concern applies broadly, not just to the legacy-Wix set.
- **Missing schema types requested in the audit brief but not found in the codebase:** `Organization` schema (no sitewide business/brand JSON-LD found — only per-product), `BreadcrumbList` schema (no breadcrumb component or schema found in `ProductDetailPage.tsx`/`ShopPage.tsx`). Both are low-effort, meaningful additions for a spice/dry-fruit e-commerce site targeting category-level search intent ("indian spices", "whole spices", "ground masala", "dry fruits online").
- **Category/URL structure:** flat `/product/:slug` and `/shop?category=` (query-param, not path-segment) — functional, but path-segment category URLs (e.g. `/shop/whole-spices`) are marginally stronger for category-level SEO and shareability than query params, which are sometimes deprioritized by crawlers relative to path segments. Not urgent, but worth considering if category pages become a bigger acquisition channel.
- **No keyword-stuffing observed** — copy reviewed in `scripts/prerender.mjs`'s static route metadata reads naturally, appropriately targets "Indian spices," "masalas," "dry fruits" without stuffing. No changes needed there; brief's instruction not to over-optimize is already being followed.

---

# Code Quality Findings

- **C-1's migration drift is, first and foremost, a code-quality/maintainability problem** (see Critical section) — stale, misleading migration files sit alongside real ones with no markers distinguishing "applied" from "superseded," other than prose comments a future contributor could easily miss.
- **L-2 — 31 occurrences of `any`/`as any`** despite `strict: true` in `tsconfig.app.json`. The generated `Database` type (`src/lib/database.types.ts`) is available and largely unused for typing query results in a few admin components.
- **Router duplication:** `App.tsx` reimplements client-side routing by hand (path matching, `pushState`, `popstate` listener, a large prop-drilled `navigateToX` function set) rather than using a router library. This is a defensible choice for a small route count, but it's already at 19 routes and growing — the hand-rolled approach means every new route requires touching `App.tsx`'s `Page` union, the `handlePopState` if-chain, and a new `navigateToX` function, and it's the direct cause of H-3 (no `else`/404 branch) and the code-splitting gap (Performance finding #1). Recommend evaluating a lightweight router (e.g. `wouter`, or `react-router` if bundle size is acceptable) as a structural improvement — **not urgent**, but flagged since it's the root cause of two separate findings above.
- **No dead code or genuinely unused dependencies found** in the areas reviewed — the dependency list is lean (5 production packages) and each is used.
- **Duplicate logic risk:** delivery-fee calculation exists both as a Postgres function (`get_delivery_fee`, used by the `orders`-total-recompute trigger) and as a client-side call (`src/lib/delivery.ts`, called from `CheckoutPage.tsx` to show the fee before order placement). This is **not a bug** — the trigger is authoritative and the client call is just for UX preview — but it's worth a code comment noting the client-side value is never trusted, to prevent a future maintainer from "optimizing" by trusting the client value and removing the server recompute.
- **Hardcoded business data** (store address "J-31/95, B-1, Amina Tower, Kachi Bagh, Pili Kothi, Varanasi - 221001" appears literally in `CheckoutPage.tsx` and likely elsewhere) — low priority, but if the store address changes, this requires a code change + redeploy rather than a content-table edit. Given `content_pages`/`promotional_banners` tables already exist for admin-editable content, consider moving static business info there too.

---

# Reliability / Monitoring Findings

- **No error boundary found** in `src/` (no `componentDidCatch`/`ErrorBoundary` component located via search) — a single uncaught render error anywhere in the tree would blank the entire SPA for the user with no recovery UI, given there's also no 404/fallback page (H-3) to fall back to.
- **`scripts/smoke.mjs` exists and runs as part of `npm run build`** (`"build": "vite build && node scripts/prerender.mjs && node scripts/generate-merchant-feed.mjs && node scripts/smoke.mjs"`) — this is a positive finding: there's already a build-time smoke test gating deploys. Not reviewed in full detail in this pass; recommend confirming it actually fails the build (non-zero exit) on a broken output rather than just logging.
- **No monitoring/error-tracking SDK found** (no Sentry, no LogRocket, no analogous package in `package.json`). Combined with the lack of an error boundary, a production JS error is currently invisible to the team unless a user reports it. Recommend adding lightweight error tracking, at minimum for the checkout/payment flow given its business criticality.
- **No analytics package found** (no GA4/Plausible/PostHog in `package.json` or referenced in `index.html`). If analytics exist, they're loaded through a mechanism not captured in this repo (e.g., a Vercel-level script injection) — worth confirming, since "no analytics" would mean the conversion-funnel findings above can't currently be measured empirically either.
- **Backups/migration safety/rollback strategy:** entirely a Supabase-project-level concern (point-in-time recovery plan, backup retention) not visible from this repo — recommend confirming Supabase project backup settings directly in the dashboard; out of scope for a static code audit.

---

# Recommended Architecture Improvements

*(Directional, not urgent — none of these should be started without user sign-off per the audit brief's "do not redesign/refactor yet" instruction.)*

1. Reconcile `supabase/migrations/` with the live schema (C-1) — foundational, should happen before any other architecture work, since every other recommendation here assumes migrations are trustworthy.
2. Introduce route-level code splitting (`React.lazy`) — biggest concrete performance lever found, low risk, no behavior change.
3. Consider a lightweight router library to replace the hand-rolled `App.tsx` switch, which is the structural root cause of two findings (H-3, part of Performance #1) and will keep costing a small amount of extra code per new route indefinitely.
4. Add a defense-in-depth `BEFORE UPDATE` trigger on `orders` mirroring the existing `order_items` pricing-enforcement pattern (L-1) — small, high-confidence hardening that doesn't depend on first resolving C-1.
5. Add an admin review-moderation queue if H-5 is confirmed live (`reviews.is_approved` defaulting to `true`) — the admin panel already has the UI patterns (`AdminOrdersView.tsx`'s status-management flow is a close template).

---

# Prioritized Remediation Plan

## P0 — Fix immediately
- **C-1**: Pull the live Supabase schema/RLS policies into version control and reconcile with `supabase/migrations/`. This is the prerequisite for confidently answering "can a customer tamper with their own order's payment status" and every other RLS-dependent question in this report.
- **H-2**: Port the legacy-URL 301 redirects from `public/_redirects` into `vercel.json`'s `redirects` array — currently silently non-functional in production, actively losing SEO value every day it's left as-is.

## P1 — Fix before further production growth
- **H-3**: Add a real 404/not-found page and router branch.
- **H-4**: Add rate limiting/validation to `contact_submissions` and `back_in_stock_notifications` anonymous-insert endpoints.
- **H-5**: Confirm live default for `reviews.is_approved`; add moderation if auto-approved.
- **L-1**: Add a protective trigger on `orders` for `payment_status`/`total_amount`/`status` (defense-in-depth, cheap insurance regardless of C-1's outcome).
- **M-1**: Restrict edge-function CORS from `*` to known origins.

## P2 — High-value UX/performance/SEO improvements
- Route-level code splitting (biggest concrete perf win identified).
- Recipe image optimization (WebP conversion + `loading="lazy"` + explicit dimensions).
- `Organization` and `BreadcrumbList` JSON-LD.
- Surface delivery-area/trust signals higher on the homepage (conversion).
- Accessibility pass: `alt` text coverage, `prefers-reduced-motion` guard, semantic interactive elements over `onClick`-`div`s.

## P3 — Nice-to-have cleanup and optimization
- M-2 (constant-time secret comparison), M-3 (dev-dependency bumps), L-2 (`any` cleanup), L-3/L-4 (dead Netlify config removal, font-loading tweak), category path-segment URLs, hardcoded business-info → content table migration.

---

## Top 10 Improvements by Expected Impact

1. **Reconcile migrations with live schema (C-1)** — unlocks confident verification of everything else; currently the biggest unknown in the whole audit.
2. **Fix legacy-URL redirects on Vercel (H-2)** — currently losing SEO equity for zero cost to fix; purely a "port the file" job.
3. **Add a real 404 page (H-3)** — small effort, fixes both SEO soft-404 and a confusing UX dead-end.
4. **Route-level code splitting** — largest concrete, low-risk performance win identified (keeps the entire admin panel out of every shopper's initial bundle).
5. **Defense-in-depth trigger on `orders`** — cheap insurance against the one payment-integrity scenario this audit couldn't fully rule out from static analysis alone.
6. **Rate-limit/validate public anonymous-write forms** — closes an easy, currently-open spam vector.
7. **Confirm and, if needed, gate review auto-approval** — protects brand/legal exposure from unmoderated public content.
8. **Recipe image optimization (WebP + lazy-loading)** — concrete, boundable Core Web Vitals win with 8.2MB of source material already identified.
9. **Restrict edge-function CORS** — closes unnecessary cross-origin exposure on payment/messaging endpoints.
10. **Add error boundary + basic error tracking** — currently a production JS error is invisible until a customer complains; cheap to add, directly protects revenue-path (checkout) visibility.
