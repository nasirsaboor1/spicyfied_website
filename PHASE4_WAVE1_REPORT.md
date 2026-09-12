# Phase 4 — Implementation Wave 1 Report

Scope: small, high-confidence technical fixes only, per the Wave 1 brief. No redesign, no visual-identity changes, no checkout/auth-model changes, no product-description rewrites, no dependency upgrades. Nine commits, one per numbered item below plus one split-out fix discovered while implementing Task 2 (star-rating buttons).

All work was implemented and verified against a local production build (`npm run build` + `vite preview`) served at `http://127.0.0.1:4173`, browsed with Playwright/Chromium through the sandbox's egress proxy, and cross-checked directly against the live Supabase project. The app was **not** deployed anywhere during this wave; every commit is on `claude/dazzling-johnson-ees9eb` and pushed.

---

## 1. Fix SEO prerender + merchant feed

**Problem.** `scripts/prerender.mjs` and `scripts/generate-merchant-feed.mjs` selected `products.category`, `products.rating_average`, `products.rating_count`, and `product_images.sort_order` — none of which exist in the live schema (`products.category_id → categories`, `product_images.display_order`/`is_primary`). The query failed outright, so **zero** product pages were prerendered and the merchant feed silently had no real product data.

**Root cause.** The scripts predated a schema migration to `category_id`/`categories` and were never updated; `src/lib/products.ts` already had the correct pattern.

**Files changed.** `scripts/prerender.mjs`, `scripts/generate-merchant-feed.mjs`.

**Exact solution.**
- Query `categories(slug, name)` via the FK instead of a nonexistent `category` column.
- Fixed `product_images` sort to `is_primary` + `display_order` (was `sort_order`, which also doesn't exist — this was silently emptying every product's image array even after the category fix, since the sub-query's error was never checked).
- Added a `resolveImageUrl()` helper (`supabase.storage.from('Product Image').getPublicUrl()`) — `product_images.image_url` stores a raw Storage object path, not a URL; both scripts were passing that raw path directly into `og:image`/JSON-LD `image`/the merchant feed's `image_link`, which would have been broken even with the column-name fixes alone.
- Added a real `reviews` query so `aggregateRating` in JSON-LD reflects actual approved reviews instead of nonexistent columns; omitted entirely when a product has no reviews yet (no fabricated data).

**Verification.**
- `npm run build` succeeds, no "products.category does not exist" error.
- **13/13** product pages prerendered to `dist/product/<slug>/index.html`.
- `dist/merchant-feed.xml` generated with **13** items.

```
prerendered products: cinnamon, clove, jeera, shah-jeera, nutmeg, pepper,
  star-anise, white-pepper, bay-leaf, badi-ilachi, javitri, kabab-chini, cardamom
merchant-feed.xml: 13 <item> entries
```

**Before/after result.** 0 → 13 prerendered product pages; feed went from schema-broken (query error) to 13 valid items, 12 of which have a valid `g:image_link` (see Remaining Concerns).

**Remaining concern.** `shah-jeera` has no `g:image_link` — it genuinely has no photo uploaded in Supabase Storage. This is a real content gap, not a bug in the fix.

---

## 2. Accessible icon buttons

**Problem.** Confirmed `button-name` axe violations (critical impact) on icon-only buttons: desktop header cart, mobile menu toggle, gallery prev/next arrows, and others found while inspecting the same components.

**Files changed.** `src/components/Header.tsx`, `src/components/Cart.tsx`, `src/pages/ProductDetailPage.tsx`, `src/components/StarRating.tsx` (see below).

**Exact solution.**
- Header: `aria-label="Open cart"` (desktop + mobile), `aria-label="Account menu"` + `aria-expanded`, dynamic `aria-label` (`Open menu`/`Close menu`) + `aria-expanded` on the hamburger.
- Cart drawer: `aria-label="Close cart"`, and per-line-item `aria-label`s naming the product for quantity +/- and remove (`Decrease quantity of Cinnamon`, etc.) — these hadn't been touched by the original audit's button-name findings on the header alone, but turned out to be the actual source of most of the cart page's violations.
- ProductDetailPage: gallery `aria-label="Previous image"`/`"Next image"`, quantity `aria-label="Decrease quantity"`/`"Increase quantity"`.
- Left untouched: buttons that already have an accessible name via visible text or an inner `<img alt>` (Add to Cart, thumbnail selectors), per the "don't add redundant aria-labels" instruction.

**A second, deeper finding (StarRating.tsx).** Re-scanning after fixing a stale test-proxy config (below) surfaced a `button-name` violation the first pass missed entirely: `StarRating` renders 5 icon-only `<button>` elements with no text, used on the product page and in reviews. Fixed with a `role="img" aria-label="Rating: X out of 5"` wrapper for the read-only case (individual buttons `aria-hidden`+`tabIndex=-1`, since they're already `disabled`) and per-star `aria-label`s ("Rate 3 stars") for the interactive "Write Your Review" picker. Separate commit (`d17c6dd`).

**Verification.** `button-name` violations: present on home, shop, contact, and all three product/cart page variants in the BEFORE baseline → **zero** anywhere in the final AFTER scan (see § Accessibility Before/After).

---

## 3. Semantic page structure

**Problem.** No `<main>` landmark anywhere in the app (`landmark-one-main`); a heading-order violation from label text styled and marked up as `<h3>` directly after the page `<h1>` with no `<h2>` between; two unlabeled `<nav>` elements colliding (`landmark-unique`).

**Files changed.** `src/App.tsx`, `src/pages/HomePage.tsx`, `src/pages/ProductDetailPage.tsx`, `src/pages/ShopPage.tsx`, `src/components/Header.tsx`.

**Exact solution.**
- `App.tsx`: wrapped the entire page-content switch in a single `<main>` (no className — no layout/visual change), covering every route except `/admin` (out of scope: "public application structure"; `AdminPage` keeps its own pre-existing internal `<main>` untouched, so it isn't double-wrapped).
- `HomePage.tsx`: demoted the "Purity/Elegance/Taste/Richness" pillar `<h3>` labels to `<p>` (identical className) — they sat directly after the hero `<h1>` with nothing between.
- `ProductDetailPage.tsx`: demoted the 5 section labels ("Select Size", "Quantity", "Delivery", "Description", "Health Benefits") from `<h3>` to `<p>` for the same reason. The other `<h3>` on that page (in "You may also like", correctly nested under its own `<h2>`) was left alone.
- `Header.tsx`: `aria-label="Main"` on the primary nav; `ProductDetailPage.tsx`'s breadcrumb nav already got `aria-label="Breadcrumb"` under item 2 — together these resolve `landmark-unique`.
- **A regression caught during verification, not in the original brief:** the first version of the `<main>` wrap put `ShopPage`'s own internal `<main className="flex-1">` (a layout column, not a real second "main content" region) inside the new outer `<main>`, producing a `landmark-no-duplicate-main`/`landmark-main-is-top-level` violation on `/shop` that didn't exist before. Fixed by demoting `ShopPage`'s inner `<main>` to a plain `<div>` (identical className, no visual change).
- **A second regression, same root cause, mobile-only:** with the filter sidebar (containing its own `<h2>`/`<h3>`) hidden via `display:none` on mobile, the visible heading order on `/shop` at 390/430px became `h1 → h3` (product cards), skipping the sidebar's `h2` entirely — an `sr-only` `<h2>Products</h2>` was added right above the product grid so the order stays correct at every width with no visible change.

**Verification.** Ran axe against `/`, `/shop`, `/product/cinnamon`, the cart drawer, `/contact`, `/login`, `/signup` at desktop/390px/430px, before and after. Full results in § Accessibility Before/After.

---

## 4. Fix /signup error handling

**Problem.** The captured error was `Failed to execute 'json' on 'Response': Unexpected end of JSON input`, shown raw to the user on `/signup`.

**Root cause investigation.**
1. Tested `POST /auth/v1/signup` directly against the live Supabase project (curl, fresh test email): returns a normal `200` with a full JSON body (access token, user object). **The real signup flow works.**
2. Tested `GET /auth/v1/signup` (same endpoint, wrong method): returns `405` with `content-length: 0` — an **empty body**.
3. The earlier audit's own Playwright test harness (`/tmp/audit_tool/capture.js`, not part of this repo) proxied every intercepted request through `undici` but never forwarded the HTTP method or request body — silently turning the real `POST` into a bodyless `GET`. Supabase correctly 405s that with an empty body, and `gotrue-js`'s `Response.json()` call on an empty body throws exactly `"Unexpected end of JSON input"`. That's the reported error, reproduced and explained exactly.
4. **Conclusion: this was a bug in the audit's own test tooling, not in the shipped site.** Fixed the harness (forwards method + body now, and reads the proxy port from `$HTTPS_PROXY` instead of a stale hardcoded port from a previous session — a second, unrelated tooling bug found in the same investigation) so later waves don't hit the same false positive.

**The real fix (independent of the above).** `SignupPage.tsx` rendered `signUpError.message` verbatim regardless of what it was. That's an exposure risk on its own — any real transient network/provider failure would show raw SDK/JS text to a user. Added a mapper: known GoTrue errors (duplicate email, weak password, invalid email, rate limit) get plain-language copy; anything unrecognized falls back to one generic message. The real error is still logged to the console via the existing `AuthContext` catch block, so nothing is lost for debugging.

**Files changed.** `src/pages/SignupPage.tsx`. `AuthContext.tsx` (customer OTP login) and `LoginPage.tsx` were **not touched**, per the brief.

**Verification.** Three live scenarios through the actual signup form on the local build:
- Fresh email → succeeds, redirects home.
- Duplicate email (signed up twice with the same address) → "An account with this email already exists. Try signing in instead."
- Password mismatch → pre-existing client-side "Passwords do not match" message, unaffected.

No raw technical text is shown in any case.

---

## 5. Non-weight product unit display

**Problem.** Nutmeg's card showed a bare "₹6" with no indication it's priced per piece rather than by weight like every other product.

**Root cause.** `product_variants.weight_unit` (`'g'`/`'kg'`/`'pcs'`/`'unit'` in the live data) was never fetched into the app's product data layer at all — `RawVariant`/`ProductVariant` only carried `variant_name` (as `size`), price, and stock; `weight_unit` was dropped during normalization even though `product_variants(*)` already selects it.

**Files changed.** `src/types/index.ts`, `src/lib/products.ts`, `src/components/ProductCard.tsx`.

**Exact solution.** Threaded `weight_unit` through the existing normalization pipeline and, in `ProductCard`, append `" / pc"` to the price only when the cheapest variant's `weight_unit` is exactly `'pcs'`.

**A data-quality issue found and deliberately not touched.** Several nut products (Walnut Kernel Rose, Walnut Shell Chile, Almond, Cashew) have `weight_unit = 'unit'` with `variant_name` values like `"500"`/`"275"` that are clearly gram weights with a miscategorized unit column — a pre-existing Supabase data bug. Treating `'unit'` the same as `'pcs'` would have mislabeled real weight-priced products as per-piece, which is worse than the original ambiguity, so the fix is keyed strictly to `'pcs'` and this data issue is flagged here rather than "fixed" by guessing at a write to production data.

**Verification.** Live browser check on the local build: Nutmeg shows **"₹6 / pc"** (confirmed at desktop and 390px); Cinnamon and every other weight-priced product's price is pixel-identical to before.

---

## 6. Bulk-pricing message de-duplication

**Problem.** The full `BulkPricingNote` paragraph ("Ordering in bulk? ... Contact us directly for a custom quote") appeared verbatim three times in one continuous flow: product page → cart drawer → checkout.

**Files changed.** `src/components/Cart.tsx`, `src/pages/CheckoutPage.tsx`.

**Exact solution.** Kept the full note only on the product page (`ProductDetailPage.tsx`, unchanged), where a shopper is actively choosing quantity — per the brief's explicit preference. Removed the duplicate renders (and now-unused imports) from `Cart.tsx` and `CheckoutPage.tsx`. The bulk-order capability itself isn't gated by this note — contacting Spicyfied for a custom quote remains reachable via Contact Us regardless; this only stops repeating the same paragraph three times in one session.

**Verification.** `npm run build` clean; visually confirmed the note now appears exactly once, on the product page.

---

## 7. Category image reliability

**Problem.** The three homepage "Shop by Category" images loaded from `raw.githubusercontent.com/nasirsaboor1/Spice/...` — a personal GitHub repo with no CDN guarantees or availability SLA, outside Spicyfied's control.

**Files changed.** `src/pages/HomePage.tsx`; added `public/images/categories/{whole-spices,dry-fruits,seeds}.jpg`.

**Exact solution.** Per the brief's own fallback instruction (don't request broader Supabase Storage write access for three static images), downloaded the three source images and shipped them as local static assets instead. Resized to 400×400 (the cards render at 160×160 in a circle, so this comfortably covers retina) and re-encoded as JPEG — Cardamom 870KB → 48KB, Chia Seeds 1.3MB → 66KB, Walnut 15KB → 31KB (already-small source, re-encoded at consistent quality). No production database access of any kind was used or requested for this item.

**Verification.** All three images return `200` from the local build and load at their new 400×400 size; a full-page screenshot of the category section is visually unchanged from before.

---

## 8. Color contrast (saffron on cream)

**Problem/measurement.** Confirmed via axe: the brand's saffron `DEFAULT` (`#B85C2E`, Tailwind `text-saffron`) used as small (12–14px) uppercase "eyebrow" label text against cream/white backgrounds fails WCAG AA's 4.5:1 threshold for normal text. Exact ratios captured: ProductDetailPage's Select Size/Quantity/Delivery/Description/Health Benefits labels — **4.23:1** against `#FBF6EC`; Home's section eyebrows and "test" card labels — **2.83–4.36:1** depending on the card's exact background; the same eyebrow/tag pattern on the Recipes pages.

**Solution chosen.** "Darker existing brand tone for small text" (the brief's first suggested option). Switched these 14 confirmed sites from `text-saffron` to the palette's existing `text-saffron-dark` (`#8A3D1D`, already used elsewhere — e.g. the "low stock" badge) — computes to **~7.05:1** against cream/white, clearing AA with margin (and AAA). This is a local text-color swap, not a brand-color change: `tailwind.config.js`'s saffron definitions are untouched, and `text-saffron-light` (used on dark ink backgrounds, where it already passes) is untouched. Icon-only uses of `text-saffron` (`Clock`/`Timer`/`ChefHat`/`Users` glyphs) were deliberately left as-is — axe's text-contrast rule doesn't apply to them and there's no confirmed finding there.

**Files changed.** `src/pages/HomePage.tsx`, `src/pages/ProductDetailPage.tsx`, `src/pages/RecipesPage.tsx`, `src/pages/RecipeDetailPage.tsx` — 14 occurrences across 4 files.

**A measurement artifact caught before being misdiagnosed as unfixed.** A quick re-scan briefly flagged one "black pepper test" card as still failing (`#b07b63`, not the new `#8a3d1d`). Traced to the audit script itself sampling mid-way through that card's staggered CSS scroll-reveal fade-in (`animationDelay: 240ms` + a 700ms fade, per `Reveal.tsx`/`index.css`) before it had settled — not a real defect. Confirmed clean once the scan waited for the animation to finish.

**Verification.** Zero saffron-related `color-contrast` violations anywhere scanned (`/`, `/recipes`, a recipe detail page, `/product/cinnamon`, the cart drawer) after the fix, across desktop/390/430. A few unrelated, pre-existing contrast issues remain (gray breadcrumb text `#8b9084`, an `ochre`-colored label, footer `text-cream/40`) — out of scope per the brief's saffron-only framing, left untouched.

---

## Build Verification

```
$ npm run typecheck        # tsc --noEmit -p tsconfig.app.json
(clean, no errors)

$ npm run build             # vite build && prerender && merchant-feed && smoke
✓ 1999 modules transformed
Prerendered 13 product pages.
[merchant-feed] Wrote dist/merchant-feed.xml with 13 products.
[ok]   index.html / shop/index.html / sitemap.xml / robots.txt / _redirects / merchant-feed.xml
Smoke test passed.
```

Two builds during this wave hit a transient `Gateway Timeout` fetching products from Supabase mid-prerender; both times a clean re-run immediately after produced the full 13/13 result with no code changes, confirming it was a network blip and not caused by anything in this wave.

`npm run lint` fails in this environment on both the pre-Wave-1 commit and every commit in this wave, with the identical crash (`TypeError: Cannot read properties of undefined (reading 'allowShortCircuit')` inside `@typescript-eslint/eslint-plugin`'s `no-unused-expressions` rule, triggered while linting `App.tsx`). Confirmed via `git stash` that this reproduces identically before any Wave 1 change — a pre-existing ESLint/`@typescript-eslint` version mismatch in the environment, out of scope to fix here and not something Wave 1 introduced.

No automated test suite exists in this repo (`package.json` has no `test` script, no `*.test.*`/`*.spec.*` files) — verification for this wave relied on typecheck, build, the build's own smoke test, and live axe-core + Playwright browser checks described throughout this report.

---

## Accessibility Before/After

axe-core, desktop (1440px) + 390px + 430px, against a local production build. BEFORE = the Phase 3 audit's preserved baseline; AFTER = this wave's final build.

| Page | BEFORE violations | AFTER violations |
|---|---|---|
| Home (`/`) | button-name, color-contrast, heading-order, landmark-one-main, region | color-contrast, region |
| Shop (`/shop`) | button-name (desktop), color-contrast, heading-order (mobile), region | color-contrast, region |
| Contact (`/contact`) | button-name, color-contrast, landmark-one-main, region | color-contrast, region |
| Signup (`/signup`) | landmark-one-main, region | region |
| Login (`/login`) | *(not in BEFORE baseline)* | region |
| Product (`/product/…`) | button-name, color-contrast, heading-order, landmark-one-main, landmark-unique, region | color-contrast, region |
| Cart (drawer, open) | button-name, color-contrast, heading-order, landmark-one-main, landmark-unique, region | color-contrast, region |

**Eliminated site-wide:** `button-name`, `heading-order`, `landmark-one-main`, `landmark-unique`.

**Remaining, both before and after (out of Wave 1's named scope):** `region` (some content not wrapped in a landmark region — a broader structural item, not named in this wave's brief) and a residual `color-contrast` from unrelated colors (gray breadcrumb text, an ochre label, footer `text-cream/40`) — Task 8 was explicitly scoped to saffron-on-cream only.

Raw before/after JSON: `/tmp/audit_tool/reports/wave1_axe_comparison.json` (scratch space, not part of the repo).

---

## SEO Prerender Verification

- `npm run build` succeeds with no schema errors.
- 13/13 product pages prerendered (`dist/product/<slug>/index.html` exists for every active product).
- Verified on `cinnamon`: `<title>Buy Cinnamon Online | Spicyfied</title>`, canonical `https://spicyfied.in/product/cinnamon`, Open Graph `og:image` pointing at a real, resolved Supabase Storage URL, `Product`/`AggregateOffer` JSON-LD with real prices (`lowPrice`/`highPrice` from actual variants) and real image URLs.

---

## Merchant Feed Verification

- `dist/merchant-feed.xml` exists, contains **13** `<item>` entries.
- Category values are the hardcoded `GOOGLE_PRODUCT_CATEGORY` constant (unchanged — not database-sourced, never was); URLs and prices verified correct for every item.
- 12/13 items have a valid `g:image_link`; `shah-jeera` is missing one because that product genuinely has no photo uploaded to Supabase Storage yet (a real content gap, not introduced by this fix).

---

## Mobile Regression Verification

At 390px and 430px for Home, Shop, Product, Cart, Login, Signup, Contact: **zero horizontal overflow** (`document.documentElement.scrollWidth` vs `clientWidth` checked on every page/viewport), zero uncaught page errors in the browser console. Functional journey checked live on the build: header nav → Shop works, 25 product cards render and are clickable, clicking a card navigates to its product page, gallery next/prev arrows work, Add to Cart works, the cart drawer opens (shows "Your Cart") and its close button closes it. Nutmeg's "₹6 / pc" and the unchanged category images were visually confirmed at 390px.

---

## Deferred Items

Per the brief's explicit instruction, none of these were started: rewriting product descriptions, review-collection automation, product-image resizing architecture, bulk reprocessing of existing product images, route-level code splitting, a homepage delivery banner, cart cross-sells, homepage structural redesign, checkout redesign.

Also newly surfaced during this wave and deliberately left for a future wave (each is out of this wave's named scope, not silently missed):
- `region` axe violations (content outside any landmark region) — a broader structural item than the specific `landmark-one-main`/`landmark-unique` fixes named in Task 3.
- Non-saffron color-contrast issues: gray breadcrumb links (`#8b9084` on cream, 3.03:1), an `ochre`-colored label (2.24:1), footer `text-cream/40` (3.49:1) — Task 8 named saffron specifically.
- `product_variants.weight_unit = 'unit'` data-quality issue on several nut products (Walnut Kernel Rose, Walnut Shell Chile, Almond, Cashew) — their `variant_name` values are clearly gram weights with a miscategorized unit column in Supabase. A display-side workaround would have introduced a new mislabeling bug; this needs a data fix, not a code fix, and wasn't requested.
- `npm run lint` is broken in this environment independent of any Wave 1 change (pre-existing `@typescript-eslint` crash, confirmed via `git stash` against the pre-Wave-1 commit).
