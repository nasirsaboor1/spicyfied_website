# Spicyfied — UI/UX Implementation Plan

Companion to `UI_UX_CONVERSION_AUDIT.md`. Nothing in this plan has been implemented — this is a proposal, organized by priority, awaiting your approval per the brief ("DO NOT MODIFY THE WEBSITE YET").

Every item cites the evidence it's based on (OBSERVED live / MEASURED live / INFERRED from source) and the specific file(s) it would touch.

---

# P0 — Broken/confusing customer experience

### P0-1. Fix the broken SEO prerender + merchant feed build scripts

**Current problem:** `scripts/prerender.mjs` and `scripts/generate-merchant-feed.mjs` both query `products.category`, a column that does not exist in the live schema (the real relation is `products.category_id → categories`). Both fail silently into a caught error and skip their work.

**Evidence:** MEASURED — running the actual `npm run build` pipeline against the live production database produced, verbatim:
```
Failed to fetch products: column products.category does not exist
[merchant-feed] Failed to fetch products: column products.category does not exist
```
Confirmed the live `products` table has no `category` column via direct database inspection in the Phase 1/2 security work (only `category_id`). Confirmed `src/lib/products.ts`'s client-side query already does this correctly (`categories(slug, name)` join), so the fix pattern already exists in the same codebase.

**Proposed solution:** In `scripts/prerender.mjs` and `scripts/generate-merchant-feed.mjs`, change the Supabase query from selecting a bare `category` column to joining `categories(slug, name)` and reading `product.categories?.slug` (or `.name`, depending which reads better in the JSON-LD `category` field and the merchant feed's category mapping), mirroring `src/lib/products.ts:12-13` and `:111`.

**Expected customer impact:** Individual product pages regain server-rendered `<title>`, meta description, Open Graph tags, and `Product`/`AggregateOffer` JSON-LD — currently shipping with none of that. `merchant-feed.xml` starts being generated again, restoring the Google Shopping feed input.

**Files affected:** `scripts/prerender.mjs`, `scripts/generate-merchant-feed.mjs`.

**Effort:** Small (the fix is a query change in two files, following an existing correct pattern in a third).

**Risk of regression:** Very low. The fix makes a currently-failing code path succeed; it doesn't touch any customer-facing runtime code (`src/`), only build-time scripts. Verify with `npm run build` and confirm `dist/product/<slug>/index.html` files exist with real `<title>`/JSON-LD content, and `dist/merchant-feed.xml` exists with real `<item>` entries.

---

### P0-2. Add accessible names to icon-only buttons (cart icon, gallery arrows)

**Current problem:** The desktop header cart-icon button has no `aria-label` and no visible text — axe-core flags this as a **critical** `button-name` violation, confirmed on every page with the header present. The product-image-gallery prev/next arrow buttons have the same problem.

**Evidence:** MEASURED — axe-core scan of the live rendered DOM, `home.json`/`product_desktop.json`/`cart_desktop.json` all show `button-name: critical`, with exact CSS target selectors resolving to the desktop cart button (`Header.tsx:93-103`) and the gallery arrows (`.left-4`/`.right-4` on the product page). Confirmed by reading the exact source: the **mobile** cart button (`Header.tsx` ~175-179) already has `aria-label="Open cart"` — the desktop one simply doesn't, an inconsistency rather than a universal miss.

**Proposed solution:** Add `aria-label="Open cart"` to the desktop cart button in `Header.tsx` (matching the mobile one already correct), and add `aria-label="Previous image"`/`aria-label="Next image"` to the gallery arrow buttons in `ProductDetailPage.tsx` (or wherever the gallery component lives).

**Expected customer impact:** A screen-reader user can now identify and operate the cart and the product gallery — currently they cannot; this is the difference between "usable" and "not usable" for that population, not a cosmetic improvement.

**Files affected:** `src/components/Header.tsx`, product image gallery component (likely inline in `src/pages/ProductDetailPage.tsx`).

**Effort:** Small.

**Risk of regression:** None — additive attribute only, no behavior change.

---

### P0-3. Fix the contact email

**Current problem:** The live Contact page lists `southmountainenter@gmail.com` as the official contact email — a personal-looking Gmail address unrelated to the "Spicyfied" brand name.

**Evidence:** OBSERVED directly on the live-data-backed Contact page render (`contact__desktop__viewport.png`).

**Proposed solution:** Replace with a brand-matched address (e.g., `hello@spicyfied.in`, `support@spicyfied.in`) once one exists, or clearly explain the relationship if `southmountainenter@gmail.com` is intentional (e.g., a parent-company name) rather than leaving it unexplained.

**Expected customer impact:** Removes a concrete, specific trust question ("why does a premium spice brand's official contact look like someone's personal email?") that currently sits right next to otherwise strong trust signals (real street address, real phone number).

**Files affected:** Wherever contact info is sourced — likely a constant in `src/pages/ContactPage.tsx` or a `content_pages`/site-settings table row (needs a quick source check before implementation to confirm whether it's hardcoded or DB-driven).

**Effort:** Small (once a real replacement address exists — the blocker here is a business decision, not engineering).

**Risk of regression:** None.

---

### P0-4. Fix the `/signup` "Unexpected end of JSON input" error

**Current problem:** Submitting the password-based signup form (the secondary "team/admin account" path reachable from the login page) throws a raw, unhandled error string directly into the UI instead of a friendly validation or error message.

**Evidence:** OBSERVED live with a real throwaway test submission — captured verbatim from the DOM: `"Unexpected end of JSON input"`.

**Proposed solution:** Root-cause this in `src/pages/SignupPage.tsx`/`src/context/AuthContext.tsx`'s `signUp` error handling — the message is characteristic of a `response.json()` call on an empty or non-JSON response body, likely an edge function or Supabase Auth response being parsed without checking `response.ok`/content-type first. Wrap in proper error handling that surfaces a real, actionable message ("Something went wrong creating your account — please try again" at minimum, or the actual validation reason if recoverable).

**Expected customer impact:** This path is not the primary customer journey (see P1 note on the OTP flow being primary), but it is live and reachable, and a broken form with a raw technical error reflects badly on the brand for whoever does hit it — team members onboarding, or a confused customer who clicked the wrong link on the login page.

**Files affected:** `src/pages/SignupPage.tsx`, `src/context/AuthContext.tsx`.

**Effort:** Small–Medium (small once the root cause is located; needs a short investigation first).

**Risk of regression:** Low — this is exception-handling around an already-broken path; can't make it more broken.

---

# P1 — High-impact conversion/trust improvements

### P1-1. Replace templated product descriptions with real copy

**Current problem:** Every product description checked (Cinnamon, Nutmeg) follows an identical five-line template with the product name substituted and nothing else changing — reads as unmistakably generic/AI-boilerplate, provides no information that would help a comparison-shopping customer decide to buy.

**Evidence:** OBSERVED on 2 of 25 live products; structure is generic enough (identical section headers, identical vague claims like "Contains natural compounds that support overall wellness") to be confidently treated as a site-wide pattern rather than a two-product coincidence.

**Proposed solution:** Write real, product-specific descriptions — actual origin/region specifics (not "traditional methods"), whole vs. ground, Ceylon vs. Cassia where relevant, actual culinary pairing suggestions, and genuine freshness/batch information if available. Prioritize the 7 confirmed bestsellers first (Cinnamon, Clove, Pepper, Star Anise, Kabab Chini, Dried Kiwi, Dried Mix Fruit), then the rest of the 25-product catalog.

**Expected customer impact:** Directly addresses the audit's clearest "feels unfinished/generic" signal, at the exact moment (product page) a purchase decision is made.

**Files affected:** No code change — this is a content/data change against the `products.description`/`health_benefits` columns (via the admin panel's product editor, `AdminProductsView.tsx`/`ProductFormModal.tsx`, which already exists for exactly this).

**Effort:** Large (25 products' worth of real writing, though it can ship incrementally starting with bestsellers).

**Risk of regression:** None — pure content change through an existing admin tool.

---

### P1-2. Fill the missing Shah Jeera photo (and audit the rest of the catalog for the same gap)

**Current problem:** Shah Jeera renders as a plain dark-green color placeholder with text instead of a photo, visible on the homepage and in "You may also like" carousels next to fully-photographed products.

**Evidence:** OBSERVED directly (`home__desktop__full.png`, `cart_open_desktop.png`).

**Proposed solution:** Photograph and upload a real product image for Shah Jeera via the existing admin product-image upload flow. While doing so, audit the remaining ~24 products for the same gap (this pass only directly confirmed Shah Jeera, but recommends checking all).

**Expected customer impact:** Removes a specific, visible "this listing looks broken/incomplete" moment sitting directly next to fully-finished neighbors.

**Files affected:** No code change — content via `AdminProductsView.tsx`/`ProductFormModal.tsx` → Supabase Storage.

**Effort:** Small.

**Risk of regression:** None.

---

### P1-3. Resize/compress product photography for web delivery

**Current problem:** Every product-card photo checked is served at native camera resolution (~3024×4032px) and 0.8-1.1MB file size, displayed at a few hundred pixels wide on any product card.

**Evidence:** MEASURED directly — real HTTP responses from Supabase Storage confirmed via curl: Cinnamon 1,046,133 bytes, Clove 837,725 bytes, Pepper 1,029,865 bytes, Star Anise 1,118,636 bytes, all at 3024×4032. The "-min" filename suffix indicates a compression pass was already attempted and still produced this result — the fix needs actual dimension resizing, not another compression pass.

**Proposed solution:** Add an image-resize step to the upload path (`ProductFormModal.tsx`'s upload flow, or a Supabase Storage transform/edge function) that produces web-appropriate dimensions (e.g., 1200px longest edge for the primary product image, with a smaller thumbnail variant for grid cards) before or alongside the original. Supabase Storage supports on-the-fly image transformations on paid tiers — worth checking plan eligibility before building a custom resize pipeline.

**Expected customer impact:** Directly reduces page weight across every page with product images (home, shop, product detail, cart cross-sells) — the single largest concrete performance lever this audit found, larger than any JS optimization.

**Files affected:** `src/components/admin/ProductFormModal.tsx` (upload path), possibly a new Supabase Edge Function for server-side resizing, or a Storage transform configuration.

**Effort:** Medium (requires either a Supabase Storage transform config change or a new resize pipeline; re-processing the existing 25-product catalog is a one-time batch job on top of that).

**Risk of regression:** Low-Medium — test that resized images still display correctly across all card sizes/aspect ratios before rolling out to the full catalog.

---

### P1-4. Stand up review collection

**Current problem:** Every product checked shows "0.0 · (0 reviews)" — including products explicitly badged "Bestseller," a direct visual contradiction that undercuts trust at the exact moment it's being asserted.

**Evidence:** OBSERVED on Cinnamon's live product page.

**Proposed solution:** The database-level review infrastructure already exists and was hardened in the Phase 2 security work (verified-purchase enforcement, moderation gating via `is_approved`) — the gap is entirely on the collection side. Add a post-delivery prompt (email or WhatsApp, reusing the existing `send-whatsapp-message` edge function's pattern) inviting customers to review what they bought, linking directly to the relevant product's review form.

**Expected customer impact:** Even a small number of real reviews changes a bestseller's page from actively undermining trust to reinforcing it.

**Files affected:** New edge function or extension of the existing order-status-change flow in `AdminOrdersView.tsx`/`supabase/functions/send-whatsapp-message/`; no changes needed to the review submission UI itself (`ProductReviews.tsx` already works, per Phase 1 review).

**Effort:** Medium.

**Risk of regression:** Low — additive notification flow, doesn't touch existing checkout/order code.

---

### P1-5. Surface delivery-area promise earlier than checkout

**Current problem:** "Free delivery within 5km of Varanasi (221001), ₹50 flat elsewhere in India" — a concrete, specific, trust-building answer to "does this even ship to me?" — currently only appears at checkout, per source review of `CheckoutPage.tsx`. Not visible on the homepage or shop page in this pass's live captures.

**Evidence:** OBSERVED absent from the homepage hero and shop page; INFERRED present at checkout from source (`CheckoutPage.tsx`, confirmed in Phase 1).

**Proposed solution:** Add a short, persistent banner or line item (homepage hero area, or a thin strip under the main nav) stating the delivery promise in plain terms, before a customer has invested time browsing.

**Expected customer impact:** Answers a real hesitation point earlier in the funnel, potentially preventing an abandoned browsing session from someone who assumed (incorrectly or correctly) they're out of the delivery area.

**Files affected:** `src/pages/HomePage.tsx` (new banner section) or `src/components/Header.tsx` (persistent strip).

**Effort:** Small.

**Risk of regression:** Low — purely additive; watch for mobile layout impact if added as a persistent header strip (test at 390px/430px before shipping).

---

# P2 — Performance/mobile/accessibility improvements

### P2-1. Add a `<main>` landmark and fix heading-order (site-wide)

**Current problem:** Every page tested is missing a `<main>` landmark element, producing the two most-repeated moderate axe violations (`landmark-one-main`, `region`) across the entire site; one `heading-order` skip was also found consistently.

**Evidence:** MEASURED via axe-core on every captured page (home, shop, product, cart, contact, signup — 6-30 affected elements per page).

**Proposed solution:** Wrap each page's primary content in a semantic `<main>` element (likely in `App.tsx`'s page-rendering logic, given the hand-rolled router renders page components directly); audit and fix the single heading-level skip.

**Expected customer impact:** Restores fast content-skipping for screen-reader users site-wide in one structural change.

**Files affected:** `src/App.tsx`, and whichever specific component contains the heading-order skip (needs a quick targeted check per page).

**Effort:** Small.

**Risk of regression:** Very low — semantic wrapper element, no visual change expected if done correctly (verify no unintended CSS targeting `body > div` or similar that could be affected by the new wrapper).

---

### P2-2. Route-level code splitting

**Current problem:** The entire application — including the full admin panel (`AdminOrdersView`, `AdminProductsView`, `AdminDashboardView`, `AdminTeamView`, `AdminCustomersView`, CSV export, packing-slip generation) — ships as one 194.8KB gzipped JS chunk to every anonymous shopper, confirmed identical across every route tested.

**Evidence:** MEASURED — Vite's own build output flags this (`Some chunks are larger than 500 kB after minification... Consider dynamic import()`), and live resource-timing capture confirms the same single JS file loads on every route regardless of whether admin code is ever needed.

**Proposed solution:** Wrap route components in `React.lazy()`/`Suspense`, at minimum splitting out the `/admin` subtree (the largest, least-needed-by-shoppers chunk).

**Expected customer impact:** Reduces the JS payload every anonymous shopper downloads and parses, improving parse/execute time particularly on lower-end mobile devices.

**Files affected:** `src/App.tsx` (import statements for `AdminPage` and its subtree).

**Effort:** Medium.

**Risk of regression:** Medium — requires testing that lazy-loaded routes still navigate correctly through the app's hand-rolled `window.history`-based router (not a standard React Router setup, so `React.lazy`'s `Suspense` boundary needs to be placed carefully relative to the existing route-switching logic).

---

### P2-3. Resize/optimize decorative homepage images

**Current problem:** Non-product decorative images are also oversized relative to their role: header logo 385.7KB, a decorative pepper photo 259KB, "Look Closer" hero WebPs 107-151KB each.

**Evidence:** MEASURED directly from live resource-timing capture.

**Proposed solution:** Re-export the logo at an appropriate display resolution (it renders at 64px wide per captured DOM data — a 385KB file for a 64px display is extreme even before considering retina scaling); review WebP quality/dimension settings on the hero images.

**Expected customer impact:** Smaller contribution than P1-3 (product photos) but compounds on every single page load since these are homepage/global assets, not per-product.

**Files affected:** `public/spicyfied_logo_.jpeg` and related, `public/images/spice-scroll/*`.

**Effort:** Small.

**Risk of regression:** None if re-exported at equivalent visual quality — verify visually after resizing.

---

### P2-4. Make category-card images resilient (stop depending on an unrelated external GitHub repo)

**Current problem:** The three homepage category-card images (Whole Spices, Dry Fruits, Seeds) load from `raw.githubusercontent.com/nasirsaboor1/Spice/...` — a repository unrelated to and outside the control of the Spicyfied content-management flow (Supabase Storage, used for every other product image).

**Evidence:** OBSERVED in source (`HomePage.tsx:221-232`) and confirmed live (these URLs currently resolve and load correctly).

**Proposed solution:** Move these three images into the same Supabase Storage bucket every other product photo already lives in, and reference them the same way, so the homepage's category imagery is managed through the same content path as everything else and isn't exposed to an unrelated repository's lifecycle.

**Expected customer impact:** None visible to customers today (it currently works) — this is a fragility/reliability fix, preventing a future silent breakage with no warning.

**Files affected:** `src/pages/HomePage.tsx`.

**Effort:** Small.

**Risk of regression:** None.

---

# P3 — Polish

### P3-1. De-duplicate the "Ordering in bulk?" note

**Current problem:** The same bulk-pricing note appears three times in one short flow (product page → added-to-cart state → cart drawer), reading as noise by the third repetition.

**Evidence:** OBSERVED across `product_desktop_full.png`, `after_add_to_cart_desktop.png`, `cart_open_desktop.png`.

**Proposed solution:** Keep it on the product page (where a bulk buyer is actively choosing quantity) and drop it from the cart drawer, or replace the cart-drawer instance with a link rather than the full repeated text block.

**Files affected:** `src/components/BulkPricingNote.tsx` usage sites — likely `src/pages/ProductDetailPage.tsx` and `src/components/Cart.tsx`.

**Effort:** Small. **Risk:** None.

---

### P3-2. Add a unit qualifier to non-weight-priced product cards

**Current problem:** Nutmeg's card shows "STARTING FROM ₹6" with no unit — it's priced per piece, not per weight like every other product's card, and looks like a data error at a glance.

**Evidence:** OBSERVED — confirmed Nutmeg's actual variant is "Pcs" at ₹6 via its live product page, correctly priced, just unlabeled on the compact card.

**Proposed solution:** Show the unit alongside the price on `ProductCard.tsx` when it isn't a weight (`/pc` suffix or similar), sourced from `product_variants.weight_unit`.

**Files affected:** `src/components/ProductCard.tsx`.

**Effort:** Small. **Risk:** None.

---

### P3-3. Reconsider the "Blended Spices — Coming Soon" homepage slot

**Current problem:** A permanent 1-of-4 slot in the homepage's "Shop by Category" section advertises a product line that doesn't exist yet.

**Evidence:** OBSERVED live.

**Proposed solution:** Either replace the slot with a real, converting category until Blended Spices ships, or move to a 3-card layout.

**Files affected:** `src/pages/HomePage.tsx`.

**Effort:** Small. **Risk:** None — purely a content/layout choice.

---

### P3-4. Give keyboard/screen-reader users real access to product cards and the homepage logo

**Current problem:** `ProductCard.tsx`'s whole-card click target and the header logo (`Header.tsx:57`) are both plain `<div onClick>` elements — not keyboard-focusable, not announced as interactive.

**Evidence:** OBSERVED in source, confirmed via live keyboard-tab-order reasoning against the rendered product grid (Tab skips the cards, landing only on the inner "View Details" button).

**Proposed solution:** Convert both to real `<button>`/`<a>` elements, or add `role="link"`/`tabIndex={0}`/`onKeyDown` handling if a semantic element genuinely can't be used for layout reasons.

**Files affected:** `src/components/ProductCard.tsx`, `src/components/Header.tsx`.

**Effort:** Small-Medium (needs care that existing click-stopPropagation logic for the nested "View Details" button, `ProductCard.tsx:80-83`, keeps working).

**Risk of regression:** Low-Medium — test that the nested button's independent click behavior isn't broken by wrapping the outer div in a new interactive element.

---

# Sequencing note

P0 items are all small-effort and independent of each other — safe to do in parallel or any order. P1-1 (real descriptions) and P1-3 (image resizing) are the two largest-effort items and the two with the clearest compounding value as the catalog grows; starting them early, even if they ship incrementally, is worth more than sequencing them last. P2-2 (code splitting) is the one item in this whole plan with genuine regression risk given the app's non-standard hand-rolled router — recommend doing it in isolation, with a full manual click-through of every route afterward, not bundled with other changes in the same review pass.
