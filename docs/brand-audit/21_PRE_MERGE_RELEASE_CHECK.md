# 21. Pre-Merge Release Check

Final verification pass on `claude/install-frontend-design-skill-316i16` before
merging to `main`. No code was changed in this pass — this is a check, not an
implementation task. Every item below was either confirmed working or
confirmed as a known, disclosed limitation of this sandbox (not a site bug).

## 1. Deployment / branch status

- **Local branch matches remote exactly.** `git log origin/<branch>..HEAD` is
  empty — nothing unpushed. Latest commit on both local and GitHub:
  `d5508f6 Verify database content cleanup`.
- **No pull request exists** for this branch (`list_pull_requests` returned
  zero results), and the repository has **no GitHub Actions workflows**
  (`.github/workflows/` does not exist). There is therefore no CI signal and
  no way to query an actual Vercel deployment status from this sandbox — this
  is the same disclosed limitation as the previous pre-merge check. A
  `vercel.json` exists (rewrites + security headers, including a CSP that
  correctly allow-lists `checkout.razorpay.com` and the Supabase project
  domain), so if Vercel is connected directly to this GitHub repo/branch, it
  would deploy from these same commits — but that connection and its result
  cannot be verified from here. **Recommend checking the Vercel dashboard
  directly** to confirm the latest deployment matches commit `d5508f6`.
- **Latest commits are included**: verified via `git log` — the last 8
  commits on this branch (content-safety cleanup, database verification,
  PDP facts block, final polish, homepage refinement, backend script fixes,
  QA report) are all present in both the local tree and on GitHub.

## 2. Functional verification

All checks below were run against the dev server with **real, live-fetched
product data** (13 active products, freshly pulled from Supabase moments
before testing) — not fabricated content. Where a page requires a browser
directly reaching Supabase, this sandbox's browser cannot hold a TLS tunnel
through the environment's proxy (`ERR_CERT_AUTHORITY_INVALID`, a pre-existing
limitation noted repeatedly earlier in this workstream — direct `curl`/Node
requests succeed normally). To verify actual rendering, the real fetched data
was replayed into the page via Playwright network interception, exactly as
in prior QA passes.

| Area | Result | Notes |
|---|---|---|
| Homepage | **PASS** | Loads correctly, renders real content. |
| Shop (real products) | **PASS** | All 13/13 active products render by name. |
| PDP | **PASS** | Cinnamon PDP renders safe `Profile: Cinnamon, packed for everyday kitchen use.` copy; Add to Cart present. |
| Cart | **PASS** | Add-to-cart click succeeds; item appears in cart drawer. |
| Checkout loads | **PASS** | Unauthenticated: correctly redirects to login (by design — `CheckoutPage.tsx` has a `useEffect` that calls `onNavigateToLogin()` when `!user`, not a bug). Authenticated (simulated session, same technique as the prior Live Customer Flow QA): full order form renders — real address, real cart item (Cinnamon, ₹249), correct Subtotal/Tax/Delivery math. |
| Dashboard refresh | **PASS** | Authenticated direct load renders Profile, Total Orders, Saved Addresses with correct real-shaped data. |
| Orders refresh | **PASS** | Authenticated direct load renders the order list with correct order data (order number, status, total). |
| Product descriptions safe | **PASS** | See §3 below. |
| Merchant feed | **PASS** | `npm run build` → `generate-merchant-feed.mjs` → `dist/merchant-feed.xml` with 13 products, 0 risky phrases. |
| Prerender | **PASS** | `prerender.mjs` → 13/13 product pages + 7 static pages prerendered successfully. |
| Mobile flow | **PASS** | Homepage, Shop, and PDP all render correctly at 390×844 viewport. |
| No console errors on core pages | **PASS, with one disclosed caveat** | See §4 below — all captured console entries are the sandbox's known Supabase-TLS artifact or gracefully-handled fetch failures, not application errors. |

## 3. Product content safety re-check

Re-confirmed as part of this pass (already fully verified and documented in
`24_DATABASE_CONTENT_CLEANUP_VERIFICATION.md`):

- Live database: 0 of 25 products (active + inactive) match any risky
  phrase from the original audit.
- Fresh prerendered HTML (`dist/product/*/index.html`) and
  `dist/merchant-feed.xml`, generated during **this** pass's build: scanned
  for the full risky-phrase list — **0 matches**.

This is not a launch blocker.

## 4. Console error detail

Every core page (Homepage, Shop, PDP, Cart, Checkout, Dashboard, Orders,
Mobile) was checked with console listeners attached. All captured entries
fall into exactly two categories, both expected and non-blocking:

1. `Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID` /
   `net::ERR_FAILED` — this sandbox's browser cannot complete a TLS handshake
   with Supabase through the environment's proxy. Confirmed pre-existing:
   direct `curl`/Node calls to the same Supabase project succeed without
   issue. Not reproducible outside this sandbox.
2. Two app-level `console.error` calls wrapping network calls this test
   didn't mock: `Error fetching delivery fee` (Checkout's `get_delivery_fee`
   RPC) and `Error fetching product`/`Error fetching products` (an earlier,
   now-fixed test-script bug in this same pass — a route mock that returned
   all 13 products instead of filtering by slug; re-tested with a corrected
   mock and confirmed clean). Both are caught by the app's own error
   handling and degrade gracefully (Checkout shows a sensible default
   delivery message rather than crashing).

No unhandled exceptions, no React warnings, no genuine application-level
errors were found on any page.

## 5. Razorpay mode

**Not determinable from this sandbox — same open item as the prior
pre-merge check and the Live Customer Flow QA.**

- Code-level: `supabase/functions/create-razorpay-order/index.ts` reads a
  single `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` pair from Supabase Edge
  Function secrets (`Deno.env.get(...)`) and returns `key_id` to the client
  unchanged — whichever value is configured there determines live vs. test
  mode. This sandbox has no Supabase service-role key, no dashboard access,
  and no CLI access, so that secret's value cannot be read or inferred.
- Actually invoking the function to read back `key_id` (the public key
  prefix, `rzp_test_...` vs `rzp_live_...`, is not itself sensitive) would
  require an authenticated user and a real row in the `orders` table, and
  would call Razorpay's live API to create a real order object — this falls
  under the payment/Razorpay boundary this session must stop for, so it was
  **not attempted**.
- **No real paid order was placed or attempted.** No `create-razorpay-order`
  or `verify-razorpay-payment` invocation was made at any point in this
  session.
- **Action needed from the owner**: check the `RAZORPAY_KEY_ID` secret
  directly in the Supabase dashboard (Edge Functions → Secrets) and confirm
  whether it starts with `rzp_test_` or `rzp_live_` before ever completing a
  real end-to-end payment test against this database.

## 6. Repository cleanliness

Confirmed via `git status --porcelain`:

- `.agents/` — **untracked/local**, not committed. ✓
- `.claude/` — **untracked/local**, not committed. ✓
- `skills-lock.json` — **untracked/local**, not committed. ✓
- `docs/brand-audit/15_TASTE_SKILL_REVIEW.md` — **uncommitted**, not
  approved for commit. ✓
- `git diff --cached --stat` — **empty**, nothing staged. ✓
- `git diff --stat -- src/ scripts/` — **empty**, no code changed during
  this verification pass. ✓

## Verdict

**READY TO MERGE**

Every functional area requested (Homepage, Shop, PDP, Cart, Checkout,
Dashboard, Orders, product content safety, merchant feed, prerender, mobile,
console errors) passes. The two open items are both pre-existing,
non-blocking, and already known to the owner:

1. **Vercel deployment status cannot be verified from this sandbox** (no PR,
   no CI) — recommend a quick manual check of the Vercel dashboard against
   commit `d5508f6` before merging, as a final sanity check outside this
   session's reach.
2. **Razorpay test/live mode is unconfirmed** — recommend checking the
   `RAZORPAY_KEY_ID` secret's prefix in the Supabase dashboard before any
   real end-to-end payment is ever run against this database. This does not
   block merging the branch itself, since no code change in this branch
   touches payment logic.

No code was changed, nothing was merged, and nothing was pushed to `main` in
this pass. Waiting for explicit approval before merging.
