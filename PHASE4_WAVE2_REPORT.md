# Phase 4 — Implementation Wave 2 Report

Performance & Image Architecture. Companion documents: `IMAGE_MIGRATION_PLAN.md` (architecture detail + the backfill script), `VARIANT_DATA_FIX_PLAN.md` (the `weight_unit` data issue). All work was implemented and measured against a local production build (`npm run build` + `vite preview`), driven with Playwright/Chromium through the sandbox's egress proxy, wired to the real, live production Supabase project (read-only, via the existing anon key throughout — no write credential was available or used this session). Nothing was deployed; every commit is on `claude/dazzling-johnson-ees9eb`.

---

# Executive Summary

The primary objective — a sustainable image architecture, not a one-off compression pass — is met with a filename-convention system that needs **zero database schema change**: every product photo gets two resized WebP variants (thumb/medium) uploaded alongside the original at predictable derived Storage paths, and the frontend tries the resized variant first, falling back to the original automatically if it isn't there. That fallback is what makes this safe to ship immediately: a photo that hasn't been backfilled yet just keeps working exactly as it does today, at its current size, with no broken state possible.

Shipped and verified this wave: the new upload pipeline (client-side, in-browser resize — no new infrastructure), a tested-but-not-executed one-time backfill script for the 41 existing photos, route-level code splitting (admin panel + recipe pages no longer ship to an anonymous shopper — main bundle down ~19% raw / ~17% gzipped), LCP/loading-priority fixes on the actual measured LCP elements, the four remaining Wave 1 accessibility findings plus everything else axe found once properly settled (the tested public pages are now at **zero** axe violations, from a starting point of several per page), a fixed and working `npm run lint`, and a fully-investigated, evidence-based plan for the `weight_unit` data issue.

**Not done, and explicitly gated:** the image backfill has not been run against production Storage, and the `weight_unit` correction has not been run against production data. Both are dry-run/read-verified and ready; both need an explicit go-ahead per the brief's safety gate. See "Production Migration Required" below.

---

# Performance Before

Measured live: `/`, `/shop`, `/product/cinnamon`, at 1440px desktop and 390px mobile. LCP/FCP/CLS captured via `PerformanceObserver` at the true pre-scroll initial viewport (matching how real Core Web Vitals are measured) — an earlier pass of this same measurement script initially captured these *after* a synthetic full-page scroll and got contaminated by Home's scroll-triggered "Look Closer" reveal animation registering later, larger LCP candidates a real user's initial page-load would never see; caught and fixed before being reported (see "Remaining Risks" for detail — the corrected numbers below are the ones that matter).

| Page/viewport | LCP element | LCP | FCP | CLS |
|---|---|---|---|---|
| Home desktop | `<h1>` headline (text, not an image) | 660ms | 660ms | 0.005 |
| Home mobile | `<p>` subhead (text) | 572ms | 572ms | 0.083 |
| Shop desktop | First product card image | 2268ms | 452ms | 0.001 |
| Shop mobile | First product card image | 1848ms | 528ms | 0.028 |
| Product desktop | Main gallery image | 1572ms | 552ms | 0.001 |
| Product mobile | Main gallery image | 1500ms | 520ms | 0.003 |

**JS:** one chunk, no code-splitting — `dist/assets/index-*.js`, 727,358 bytes raw / 199,540 bytes gzipped, confirmed identical on every route. Direct string search in the built bundle (`grep -o "Packing Slip\|Add Product\|admin_users"`) found admin-panel UI strings present in that single public chunk — the entire admin panel (orders, product editor, CSV/packing-slip export, team management) shipped to every anonymous shopper.

**Images:** product photography served at native camera resolution. Real, largest examples pulled from live resource-timing capture: Kebab Chini 2,911,739 bytes at full camera resolution, Javitri 2,706,369 bytes, Kebab Chini (2) 2,221,382 bytes — several individual photos exceeding 2MB **each**, displayed on a card a few hundred pixels wide.

**Accessibility (axe-core, properly settled — see methodology note under Accessibility):** color-contrast and/or region findings on Home, Shop, Product, Contact; `page-has-heading-one` on Login/Signup (no `<h1>` on either page). Full before/after table below.

---

# Existing Image Architecture

Traced end-to-end before changing anything (Phase B):

1. **Admin upload:** a plain `<input type="file" accept="image/*">` in `ProductFormModal.tsx` → `handleUploadImage()` → `uploadProductImage()` in `src/lib/adminProducts.ts`.
2. **What happened to the file:** nothing. No resize, no compression, no type/size validation — whatever the browser file picker returned went straight to Storage, filename `${Date.now()}-${sanitizedOriginalName}`.
3. **Storage:** a public bucket named `Product Image`.
4. **`product_images.image_url`:** stores a raw Storage object path (e.g. `/Cinnamon (1)-min.JPG`), not a URL.
5. **Product cards resolve it via** `resolveImageUrl()` in `lib/products.ts` — `supabase.storage.from(bucket).getPublicUrl(path)` — then use that URL directly, no transform.
6. **Product detail pages:** same resolution, same lack of transform.
7. **SEO prerender / merchant feed:** same `resolveImageUrl` pattern (already fixed in Wave 1 to use it correctly at all — see `PHASE4_WAVE1_REPORT.md` item 1).
8. **Recipes:** a completely separate, unrelated pipeline — local static files at `public/images/recipes/{id}.jpg` (already reasonably sized, 87–254KB each; not part of this wave's scope).
9. **Supabase Storage image transformation:** tested directly against the live project (`GET .../render/image/public/...?width=300`) — returned `403 FeatureNotEnabled`. Not available on this project's current plan. Ruled out on that empirical basis, not assumed.

---

# New Image Architecture

Full detail, tier-size measurement methodology, and the "why not X" reasoning for each alternative considered are in `IMAGE_MIGRATION_PLAN.md`. Summary:

- **Two tiers, both measured against real rendered `<img>` widths, not guessed:** `thumb` (800px longest edge, WebP q78) for product cards and the detail-page thumbnail strip; `medium` (1600px longest edge, WebP q82) for the main product-detail gallery image. A third `large`/zoom tier was deliberately **not** generated — no zoom/lightbox feature exists in the app today to consume it, and generating an unused tier would be exactly the "arbitrarily choose dimensions" the brief said not to do. Adding one later (if a zoom feature ships) is a one-line config change.
- **Zero schema change.** `product_images.image_url` still stores only the original path, exactly as before. Resized variants live at a derived Storage path computed by a pure string function from that same path (`Cinnamon (1)-min.JPG` → `Cinnamon (1)-min--thumb.webp`) — so every existing row already "has" correct derived URLs the instant the corresponding Storage object exists, no database backfill needed at all.
- **Original retained, never served publicly, never deleted.** Kept only as the fallback target and a reprocessing source.

---

# Future Upload Pipeline

`src/lib/imageProcessing.ts` (new) + `uploadProductImage()` in `src/lib/adminProducts.ts` (rewritten). Runs entirely in the admin's browser via the Canvas API — chosen over a Supabase Edge Function specifically because Supabase's built-in transform isn't available on this plan (confirmed above) and a 25-product catalog doesn't justify standing up and maintaining a server-side image pipeline for what the browser already does for free.

- **Validates** MIME type and file size (25MB cap) before reading anything.
- **Normalizes orientation** via `createImageBitmap(file, { imageOrientation: 'from-image' })` — no EXIF-parsing library needed.
- **Strips metadata** as a free side effect of the canvas re-draw (a freshly drawn canvas carries no EXIF/GPS/ICC data).
- **Deterministic, non-colliding filenames:** `${Date.now()}-${crypto.randomUUID().slice(0,8)}-${sanitizedName}`.
- **Fails cleanly:** the original is the row of record — if it fails to upload, nothing is inserted, no orphan. Variant generation/upload happens only after the original succeeds and is best-effort: a failed variant doesn't fail the whole upload (the photo still works via the original everywhere) and surfaces a specific, non-blocking warning in the admin UI (`ProductFormModal.tsx`) naming which variant failed.
- **No orphan variants possible by construction:** nothing is ever uploaded before the thing it depends on exists, and the database row (which only ever references the original) is written last.

---

# Responsive Image Delivery

Every product-image consumer now renders through `ResilientImage` (`src/components/ResilientImage.tsx`) — a small wrapper that requests the resized variant and falls back to the always-present original on a load error, with no visible flash or broken-image state either way. Updated: `ProductCard.tsx` (used by Shop, Home's three product grids, and the "shop these" carousel on recipe pages), `ProductDetailPage.tsx` (main gallery image and the thumbnail strip), `Cart.tsx` (cart line-item thumbnail).

**Loading priority set from measured LCP, not guessed:**
- Shop's first 3 product cards (the measured LCP element on that page) get `loading="eager"` + `fetchPriority="high"`; every other card stays `loading="lazy"` (a `priority` prop threaded from `ShopPage.tsx`'s `.map()` index).
- The product-detail page's main gallery image (the measured LCP element there) gets `loading="eager"` + `fetchPriority="high"` + `decoding="sync"`; its thumbnail strip stays `loading="lazy"`.
- Home's hero images were investigated and deliberately **not** touched — the corrected LCP measurement (see "Performance Before") shows Home's actual initial LCP is the `<h1>`/subhead text, not the scroll-triggered "Look Closer" images. Those images are below-the-fold, scroll-revealed content by design (the site's stated differentiator, explicitly protected from redesign in Wave 1); they were never the real LCP candidate, and changing their loading behavior would have been a fix for a problem that a corrected measurement shows doesn't exist.

CLS: product-card images sit inside an `aspect-square` container (unchanged), so no `width`/`height` attributes were added to the `<img>` itself — the container already fully constrains layout before any image loads, and adding a mismatched intrinsic-size hint (source photos aren't literally square before `object-cover` crops them) would add noise, not remove risk. Confirmed CLS is unaffected in Performance After.

---

# Bundle Splitting

`AdminPage`, `RecipesPage`, and `RecipeDetailPage` converted to `React.lazy()` in `App.tsx`, wrapped in `<Suspense>` with the existing `SpiceLoader` component as fallback (no new loading-indicator component needed). This is the one item in the whole Wave 2 scope with genuine regression risk given the app's hand-rolled, non-React-Router `window.history` router, per Wave 1's own audit note — tested in isolation, live, in a real browser:

- Direct load of `/recipes` — works.
- Client-side click-through from a recipes listing card into a recipe detail page (`/recipes/fluffy-pancakes`) — works, lazy chunk loads correctly.
- Client-side nav Home → Recipes via the header link — works.
- Direct load of `/admin` while unauthenticated — correctly redirects to `/login`, no crash, no console/page errors.

Zero `pageerror` or console errors across all four checks.

**Before → after, main chunk:** 727,358 → 587,061 bytes raw (**−19.3%**), 199,540 → 164,971 bytes gzipped (**−17.3%**). Confirmed via direct string search that admin-only UI text (`"Packing Slip"`, `"Add Product"`) is now present **only** in the separate `AdminPage-*.js` chunk (73,260 bytes raw / 17,981 gzipped), not in the main chunk an anonymous shopper downloads. (`admin_users` still appears in the main chunk — correctly: that's a small, legitimate query in `App.tsx`'s post-login admin-redirect check, not admin UI code.)

| Chunk | Raw bytes | Gzip bytes | Loaded by an anonymous shopper? |
|---|---|---|---|
| `index-*.js` (main) | 587,061 | 164,971 | Always |
| `AdminPage-*.js` | 73,260 | 17,981 | Only on `/admin` |
| `RecipesPage-*.js` | 7,597 | 2,463 | Only on `/recipes` |
| `RecipeDetailPage-*.js` | 6,353 | 2,208 | Only on a recipe detail page |
| `recipeImages-*.js` | 57,206 | 16,732 | Only alongside the two recipe chunks above |
| `users-*.js` | 776 | 405 | Small shared chunk, negligible |

---

# Accessibility

**Methodology correction, stated plainly rather than hidden:** an early re-scan pass (no scroll, ~1.8s settle) reported *more* color-contrast violations on Home than existed before this wave's fixes — investigated rather than assumed real. Every one of them traced to the same root cause already documented in `PHASE4_WAVE1_REPORT.md`'s Task 8: the site's `Reveal` component fades content in via a CSS animation triggered by `IntersectionObserver` (with a 2-second fallback timer for content never scrolled into view), and a quick scan can sample a color mid-fade. Confirmed by re-running with a full scroll-through and a 2-second settle after the last scroll step: every one of those "violations" disappeared. Two genuine, stable ones remained after that correction — both `text-gray-400` on a light background, unrelated to the fade timing.

**Fixed this wave**, all local text-color/tag swaps, no visual redesign:
- Gray breadcrumb (confirmed `#8b9084` on cream, 3.03:1) → `text-ink/70` (was `/50`), now ≈5.5:1.
- Ochre "Nutrient Rich" label (confirmed `#c9a227` on cream, 2.24:1) → added `ochre-dark` (`#79611A`) to the existing palette (mirroring how `saffron-dark` already exists for the identical reason), ≈5.5:1. Palette DEFAULT/light values untouched.
- Footer `text-cream/40` "Coming Soon" text (confirmed `#757c6f` on ink, 3.49:1) → `/55` (its two active-category siblings stay at `/70`, preserving the intentional "this one's disabled" visual distinction while clearing AA), ≈5.2:1.
- The hidden crawler/no-JS fallback SEO snippet injected by `prerender.mjs` (`#prerender-seo`) — sat outside any landmark, causing a `region` violation on every page. Fixed with `aria-hidden="true"`: this content is genuinely not meant for assistive tech (the real, accessible page is the hydrated React tree that fully replaces it), so marking it hidden is the honest annotation, not a workaround.
- `page-has-heading-one` on Login/Signup/Reset-Password — none had an `<h1>` anywhere (both a `<h2>` "Welcome Back"/"Create Account"/"Set New Password" and, on Login, a second mutually-exclusive `<h2>` "Reset Password"/"Enter Verification Code" mode). All promoted to `<h1>`; the two Login ones never render simultaneously, so no duplicate-`<h1>` risk.
- Two further genuine `text-gray-400`-on-light findings surfaced by the corrected scan, same class of issue as the confirmed three above: the "Blended Spices (Coming Soon)" label (`CategoryCard.tsx`, plus the same text in `Header.tsx`'s mobile dropdown) and "— the kitchen staples people reorder most" (`HomePage.tsx`). Both →`text-gray-600` (≈6.5–7:1 against their respective backgrounds). A near-miss `text-gray-500` (4.48:1 vs the 4.5:1 threshold — a 0.02 margin) on the product page's "More from the same shelf" label also bumped to `gray-600` for the same reason.

**Deliberately not touched:** `text-gray-600`/`text-gray-500` as a class are each used 50+ times across the codebase for ordinary secondary body copy; a global swap would be a real visual change across the whole site, not a contained fix, and nearly all of those instances were never flagged (they're on different backgrounds where the existing shade already passes). Fixed only the specific, axe-confirmed instances.

**Before → after, axe-core (properly settled: full scroll-through + 2s post-scroll wait before scanning), desktop/390px/430px:**

| Page | Before | After |
|---|---|---|
| Home | color-contrast, region | **CLEAN** |
| Shop | color-contrast, region | **CLEAN** |
| Product | color-contrast, region | **CLEAN** |
| Contact | color-contrast, region | **CLEAN** |
| Login | region, page-has-heading-one | **CLEAN** |
| Signup | region, page-has-heading-one | **CLEAN** |
| Recipes | *(not previously scanned)* | **CLEAN** |

**21/21 page×viewport combinations clean** — the brief's "target zero known WCAG AA violations on the tested public pages" is met, not just approached.

---

# Variant Data Issue

Full investigation, evidence, and prepared SQL in `VARIANT_DATA_FIX_PLAN.md`. Summary: inspected the live records (not assumed) for all four flagged products. Three — Walnut Kernel Rose, Cashew, Walnut Shell Chile — show **exact linear price scaling** across their weight-based siblings (e.g. Cashew: ₹245 @ 250g → ₹490 @ the disputed "500" row → ₹980 @ 1kg, precisely 2×/4×), which is about as strong as evidence gets that `weight_unit` should be `'g'`, not `'unit'`. The fourth, Almond, has the same unit-label problem but its price does **not** scale linearly (275g priced at ≈2× what the 250g rate predicts) — flagged as a separate, distinct issue for the shop owner to confirm rather than silently corrected, since this plan has no way to tell a pricing typo from a deliberate premium-grade tier. SQL for all four is prepared (one `UPDATE ... WHERE id = '<row>'` each, touching only `weight_unit`/`weight_value`, never `price` or `variant_name`) but **not executed**.

---

# ESLint

Root-caused, not just patched around: `npm run lint` crashed (`TypeError: Cannot read properties of undefined (reading 'allowShortCircuit')`) inside `@typescript-eslint/eslint-plugin`'s wrapped `no-unused-expressions` rule. Installed versions: `eslint@9.39.5` (a very recent patch release) against `typescript-eslint@8.8.1` — a version from much earlier in the 9.x line's life, left behind because `package-lock.json` had pinned it since. `package.json` already declared `typescript-eslint: "^8.3.0"`, a range that already permitted anything up to (but not past) 9.0.0 — so refreshing to the latest version satisfying that **already-declared** range (`8.70.0`) is not a version-range change, let alone a "broad package upgrade": it's exactly what a routine `npm install` would have picked up if the lockfile weren't stale.

```
$ npm install typescript-eslint@^8.3.0
# resolved to 8.70.0, already permitted by the existing ^8.3.0 range

$ npm run lint
# no longer crashes — runs to completion
```

**`npm run lint` now runs successfully but does not fully PASS**: 31 errors (all `@typescript-eslint/no-explicit-any`) and 12 warnings (`react-hooks/exhaustive-deps`, `react-refresh/only-export-components`), spread across 17 files. Checked every file this wave touched against that list by exact line number: **zero of the 31 errors or 12 warnings are in code this wave (or Wave 1) wrote** — e.g. `adminProducts.ts:92`'s flagged `any` is a pre-existing cast in `listAdminProducts()`, untouched by this wave's `uploadProductImage()` rewrite; `ProductFormModal.tsx`'s nine flagged `any`s are all in pre-existing `catch (err: any)` blocks in handlers this wave didn't touch; `ShopPage.tsx:27` and `ProductDetailPage.tsx:58`'s flagged hooks warnings are pre-existing `useEffect` calls unrelated to this wave's `priority` prop / `ResilientImage` changes. This is pre-existing codebase debt (every admin-panel handler using `catch (err: any)`, several `useEffect` calls with intentionally-partial dependency arrays) — fixing all 43 is a real, separate, unrelated cleanup effort, explicitly not undertaken here per "do not make unrelated cleanup changes." No lint rule was disabled or weakened to make this number look better.

---

# Tests

```
$ npm run typecheck    # clean, no errors, after every change in this wave
$ npm run build        # clean; 13/13 product pages prerendered; merchant-feed.xml: 13 items; smoke test passed
$ npm run lint         # runs (was crashing before this wave); 31 pre-existing errors / 12 pre-existing warnings, none introduced by this wave (see ESLint above)
```

Two builds during this wave hit a transient Supabase `Gateway Timeout` mid-prerender; both times an immediate clean re-run produced the full 13/13 result with no code changes — a network blip, not caused by anything in this wave (same category of transient failure documented in Wave 1).

**axe-core:** see Accessibility above — 21/21 clean.

**Browser regression, live, at desktop/390px/430px** across Home, Shop, Product, Recipes, Login, Signup, Contact (Cart and Admin checked functionally at desktop, per below):
- **Zero horizontal overflow** on all 21 page×viewport combinations.
- **Zero uncaught page errors** on all 21.
- Shop → product card click → product page navigation: works, 25 cards render.
- Add to Cart → cart drawer opens, shows the item, close button closes it: works. Cart's line-item image renders correctly (currently falling back to the full-size original, as expected — see Performance After).
- Shah Jeera (the confirmed no-photo product) → the gradient/initial-letter placeholder renders correctly, not a broken image, unaffected by any of this wave's `ResilientImage` changes (which only activate when a photo exists) — confirmed live rather than assumed. Full detail under "Manual Actions Required."
- Category images (Wave 1's local `/images/categories/*.jpg`) still load correctly at their 400×400 size — unaffected by this wave's product-photo pipeline (a separate asset path, deliberately not touched).
- `/admin` while unauthenticated → redirects to `/login` cleanly (the lazy-loaded chunk loads and the auth-gate logic inside it still runs correctly) — admin **login-gate** behavior verified; the authenticated admin UI itself (product upload form, etc.) could not be exercised end-to-end in this session (no admin credentials available), see "Manual Actions Required."
- Prerender: 13/13 products, confirmed via file listing.
- Merchant feed: `merchant-feed.xml` present, 13 `<item>` entries, confirmed via `grep -c "<item>"`.
- SEO image URLs: still valid — the prerender/merchant-feed scripts were not touched by this wave's image-pipeline changes (they continue resolving the original `image_url`, which this wave's architecture guarantees always exists).

---

# Performance After

Measured with the identical methodology and script as "Performance Before" (LCP/FCP/CLS at true pre-scroll initial viewport).

| Metric | Before | After | % change |
|---|---|---|---|
| Main JS chunk (raw) | 727,358 B | 587,061 B | **−19.3%** |
| Main JS chunk (gzip) | 199,540 B | 164,971 B | **−17.3%** |
| Home LCP (desktop) | 660ms | 540ms | −18.2% |
| Home LCP (mobile) | 572ms | 420ms | −26.6% |
| Shop LCP (desktop) | 2268ms | 1928ms | −15.0% |
| Shop LCP (mobile) | 1848ms | 1640ms | −11.3% |
| Product LCP (desktop) | 1572ms | 1892ms | **+20.4%** |
| Product LCP (mobile) | 1500ms | 1528ms | +1.9% |
| CLS (all pages) | ≤0.083 | ≤0.083 | unchanged |

**The JS numbers are real and live now** — the code-split bundle is what `npm run build` produces today, unconditionally.

**The LCP picture is mixed, and I'm not going to round that off.** Shop and Home both improved — plausibly the smaller main JS chunk parsing/executing faster, though this wasn't isolated further. Product's desktop LCP got *worse* (+20%). Root cause, confirmed rather than guessed: the product page's main gallery image now requests `medium_url` first (per the new pipeline), which does not exist yet for any of the 41 existing photos (the backfill hasn't run — see below) — so every single load pays for one failed request before `ResilientImage`'s `onError` fallback fires and re-requests the original. That failed round-trip is exactly the interim cost of shipping this code *before* running the backfill, and it resolves itself completely the moment the backfill runs (at that point the first request succeeds, and the *medium* WebP is ~227KB average versus the ~800KB–2.9MB originals it replaces — a real, large win, not just a wash). This is stated here precisely so it isn't discovered as a surprise later.

**Image byte totals across a full page (all photos, scrolled-to) are not reported as a before/after delta.** Investigated why: `loading="lazy"`'s native browser prefetch-distance heuristic (how far below the viewport an image is before the browser starts fetching it) proved measurably timing-sensitive between otherwise-identical runs during Phase A/O measurement — the same page, same code, produced meaningfully different total-byte figures run to run purely from scroll-timing variance in a headless synthetic test, independent of anything this wave changed. Rather than present a full-page-weight number that isn't actually comparable run-to-run, this report relies on the deterministic numbers instead: JS bundle size (build output, not timing-sensitive), individual file sizes (Phase A's directly-measured largest images, and Phase G's dry-run-verified real output sizes below), and LCP at the fixed pre-scroll measurement point.

**Real, deterministic image-size evidence (from the dry-run backfill against all 41 live photos — see `IMAGE_MIGRATION_PLAN.md`):** average thumb 68KB, average medium 227KB, both tiers for all 41 photos combined ≈11.8MB — versus several individual originals alone already exceeding that (Kebab Chini 2.9MB, Javitri 2.7MB). This is the number that actually lands once the backfill is approved and run; it is not reflected in today's live measurements above because the backfill hasn't been applied to production Storage.

---

# Production Migration Required

Neither of the two production-data changes prepared this wave has been applied. Both are read/dry-run verified against the real, live project and ready to run on approval.

1. **Image backfill** (`scripts/backfill-image-variants.mjs --apply`) — generates the two WebP variants for all 41 existing photos. Dry-run verified: 0 failures across all 41. Requires a `SUPABASE_SERVICE_ROLE_KEY` (Storage write; the anon key used everywhere else this session cannot write to Storage). No database writes at all. Full detail and exact permissions in `IMAGE_MIGRATION_PLAN.md`.
2. **Variant data correction** (`VARIANT_DATA_FIX_PLAN.md`) — 4 `UPDATE product_variants` statements, each scoped to one row by primary key, fixing `weight_unit`/`weight_value` only. Uses the same production database write access already used for prior approved migrations in this project — no new permission category.

---

# Manual Actions Required

- **Shah Jeera's missing photo** — still genuinely absent (confirmed again live this wave; the placeholder renders correctly, not a broken image). No AI-generated image was created or substituted, per the explicit instruction not to invent one. This remains a real photo the shop needs to take and upload — not something any code change can resolve.
- **Approve or decline** the two production changes above (`SUPABASE_SERVICE_ROLE_KEY` for the image backfill; a go/no-go on the variant data SQL, including the separate Almond price question raised in `VARIANT_DATA_FIX_PLAN.md`).
- **Verify the authenticated admin upload flow end-to-end** — this session had no admin credentials, so the new `uploadProductImage()` path (validation, variant generation, the non-blocking-warning UI) could not be exercised as a real logged-in admin uploading a real photo through the actual form. Everything upstream of authentication (the processing logic itself, `deriveVariantPath` consistency between the browser pipeline and the Node backfill script, the Storage/DB write shape) was verified directly; the click-through-the-actual-UI step wasn't possible this session and should be done once credentials are available.

---

# Remaining Risks

- **Product-page LCP regression until the backfill runs** (+20% desktop, measured and explained above) — resolves itself once the image backfill is applied; not a code defect, a sequencing cost of shipping the frontend change ahead of the data migration. If minimizing that gap matters, run the backfill promptly after this wave merges rather than leaving it open-ended.
- **Extra failed-request overhead site-wide until the backfill runs** — every product image on every page pays one wasted request (a small, fast-failing 404) before falling back to its original. Bytes-wise this is small (Supabase's 404 responses are tiny), but it's real, additional request-count overhead that disappears entirely once the backfill runs.
- **`sharp` was added as a devDependency** for the backfill script only (confirmed via `grep` that it's never imported by anything under `src/`, and confirmed via `grep -c sharp` against every built JS chunk that only unrelated English-word matches appear — the package itself is not in the bundle). It has no runtime footprint on the deployed site, but it is a new line in `package.json`'s devDependencies, worth knowing about even though it doesn't affect what ships.
- **The Almond price anomaly** (`VARIANT_DATA_FIX_PLAN.md`) is flagged, not resolved — applying the unit fix without also resolving the price question leaves a real, known inconsistency in that one product's pricing ladder.

---

# Deferred Items

Per the brief's explicit scope: rewriting product descriptions, review-collection automation, bulk reprocessing beyond this wave's one prepared (not-yet-run) script, a homepage delivery banner, cart cross-sells, checkout redesign, homepage structural redesign — none started.

Also newly surfaced this wave and deliberately left alone, each for a stated reason:
- A large-tier (zoom/lightbox) image variant — no feature exists to consume it yet; trivial to add later (see "New Image Architecture").
- `document.title` reverting to the homepage default after client-side hydration on a direct product-page load, even though the prerendered HTML has the correct per-product `<title>` (confirmed: `dist/product/shah-jeera/index.html` has `<title>Buy Shah Jeera Online | Spicyfied</title>`, but `page.title()` reads the generic default ~1.5s after load). This affects the browser tab title after JS takes over, not the prerendered HTML crawlers/social-share unfurls see (Wave 1's SEO fix), and wasn't named in this wave's scope — flagged here rather than silently noticed and dropped.
- The pre-existing 43 lint findings (31 errors, 12 warnings) — see ESLint above; a real, separate, unrelated cleanup effort.

---

# READY FOR PRODUCTION IMAGE MIGRATION: **YES**

The backfill script is written, dry-run-verified against all 41 real live photos with zero failures, cannot delete or mutate anything by construction, and needs only a `SUPABASE_SERVICE_ROLE_KEY` to run for real. The only reason it hasn't run is that key wasn't available this session and the brief's safety gate reserves this decision for explicit approval regardless.

# READY FOR VARIANT DATA CORRECTION: **YES for 3 of 4 products, CONDITIONAL for the 4th**

Walnut Kernel Rose, Cashew, and Walnut Shell Chile: yes, high confidence, exact linear price evidence across every sibling variant. Almond: the same unit-label fix is equally safe and well-evidenced on its own terms, but its price doesn't fit the same linear pattern its siblings do — apply the unit fix if you want, but get the 275g/1kg prices confirmed by the shop owner before or alongside it, since this plan cannot distinguish a pricing typo from a deliberate premium tier.
