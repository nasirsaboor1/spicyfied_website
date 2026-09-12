# 14 — Homepage and Shop Fix Plan

Revised, narrower plan covering only what's being implemented this pass, plus findings from investigation. Per instruction, this pass implements exactly five items: footer category fix, Look Closer replacement, moving the Shopkeeper's Notebook higher, category image/fallback correction, and the Shop 0-product investigation report. Everything else in the parent request (hero composition, Shop page commerce redesign, product card variant mechanism) is deliberately deferred.

---

## 1. Footer category fix

**Finding:** `Footer.tsx`'s "Categories" column hardcodes `Everyday Essentials` and `Healthy Snacking` as plain, non-clickable text — confirmed fabricated in doc 01, still present. Neither exists anywhere else in the app (not in `Header.tsx`'s real category list, not in `ShopPage.tsx`'s filters, not in the product category enum).

**Fix:** Replace with the same three real categories used everywhere else (`Whole Spices`, `Dry Fruits`, `Seeds`) as real links to the Shop page filtered by that category, plus keep the honest `Blended Spices (Coming Soon)` line as-is.

## 2. "Look Closer" section replacement

**Finding:** The current implementation (`SpiceReveal.tsx`) renders three full-viewport-height (`h-screen`) scroll-pinned panels back to back — roughly 3 full screens of dark `bg-ink`, each with a scroll-progress-driven image reveal (Framer Motion `useScroll`/`useTransform`). Confirmed via a real Ultra-mode screenshot capture earlier in this engagement (doc 01/12) that this renders almost entirely blank in practice — faint glow blobs only, no visible photography or text for most of its multi-screen scroll distance. This is exactly the "huge dark blank scroll area" being flagged again now.

**Fix:** Replace the scroll-driven multi-screen sequence with a single, compact, always-visible section on a **cream background** — a static grid of the same real product photography (the owner-supplied isolated cutouts already in `spiceHeroPhotos.ts`: cardamom, cinnamon, clove), each in a soft cream-toned tile with its existing real caption text, using the site's already-reliable `Reveal` component (a simple intersection-observer fade-in already used successfully elsewhere on this same page) instead of the risky per-panel scroll-linked animation. Content is visible immediately on scroll-into-view, not gated behind a multi-screen scroll distance.

**Not done:** deleting `SpiceReveal.tsx`/`spiceHeroPhotos.ts` outright — leaving the files in place (unused) rather than removing them, in case there's a future reason to revisit a scroll-driven treatment once it can be made reliable. Only `HomePage.tsx`'s usage changes.

## 3. Move Shopkeeper's Notebook higher

**Finding:** Currently ordered Hero → Pillars → Look Closer (huge) → Notebook → Categories. Because "Look Closer" is being cut from ~3 screen-heights to one normal section, the Notebook is now reached almost immediately after the pillars without needing to reorder any JSX — satisfying "directly after a shortened Look Closer section" as stated in the brief. No section reordering needed, only the Look Closer shortening above achieves this.

## 4. Category circles — image/fallback correction

**Finding, important:** the three real category circles (`Whole Spices`, `Dry Fruits`, `Seeds`) already have real image URLs wired in `HomePage.tsx`, hosted on `raw.githubusercontent.com`. Directly verified all three URLs return HTTP 200 with real file content (870KB, 15KB, and 1.3MB respectively). **These are not missing assets** — the "empty ring" appearance seen in earlier screenshots this session was almost certainly a loading-timing artifact of automated headless screenshot capture (some of these images are quite large for a small circular thumbnail and may not finish loading within a short automated wait), not a real defect for an actual visitor on a normal connection.

**What this means for the fix:** no code change is needed to add photography — it's already there and already wired to `CategoryCard.tsx`, which already has a proper fallback (a gradient + initial letter) for the one genuinely-imageless case (`Blended Spices`, honestly marked "Coming Soon" — not something to fabricate an image for). This item is being closed as **verified working**, confirmed with a longer-wait screenshot in this pass's verification step, not a code fix.

**Worth flagging separately (not fixed in this pass):** two of the three images (870KB, 1.3MB) are large for a 160×160px circular thumbnail. This doesn't cause a missing-image bug, but it is a legitimate future performance/optimization item — resizing/compressing these specific source images would make them render faster for real visitors on slower connections. Flagging as a **P2 follow-up**, not implementing here since it needs image-processing tooling out of this pass's scope.

## 5. Shop "0 products" investigation report

**Finding, re-confirmed:** `fetchProductsWithDetails()` (`src/lib/products.ts`) runs `supabase.from('products').select(PRODUCT_SELECT)` with **no filter conditions at all** — it unconditionally fetches every row. Direct database query earlier this session confirmed 25 real products exist, and RLS policies on `products`, `categories`, `product_variants`, and `product_images` all grant public `SELECT` with no restrictive condition (`qual: true`). There is no `is_active`, `stock_status`, or similar filter anywhere in the fetch path that could be silently excluding rows.

**Conclusion:** there is no code-level or data-level bug causing zero products to display. The "0 products found" seen repeatedly during this session's testing has a single, consistent, already-identified cause: this sandbox's browser cannot reach the live Supabase project over the network (confirmed via browser console errors: `ERR_CONNECTION_RESET` / "Failed to fetch" on the Supabase client's own request, unrelated to certificates, RLS, or query correctness). This is an environment limitation of the testing sandbox, not a defect in the deployed application. No code change is being made for this item, since there's nothing to fix — the earlier-implemented Shop page empty state (Reset Filters / View All Products, from the Visual Stabilisation Pass) remains the correct, honest handling for a *genuine* no-results case, which is a separate, real scenario (a customer's filters matching nothing) from this sandbox's inability to connect at all.

---

## Explicitly deferred (not implemented this pass, per instruction)

- Hero: richer product/ingredient composition beyond the current single cinnamon photo (item 4 of the parent request) — needs either a real composed photo shoot or careful reuse of existing assets; not attempted here to avoid rushing something that risks looking assembled rather than deliberate.
- Shop page: intro copy rewrite, price-bracket filter, product card commerce fields (item 5) — scoped for a future pass.
- Product card variant-selection mechanism (item 6) — **decided** (Quick Add for single-variant, Choose Size/PDP for multi-variant, per your explicit choice), not yet implemented.
- Login/Signup/auth pages — explicitly left alone per instruction; already improved in the prior green-reduction pass and not touched further.
