# 20. Final Polish + Mobile + Accessibility + Release QA

Status: **Combined low-risk polish pass. Implemented and verified. Commit pending per commit policy below.**

Scope: visual/accessibility/consistency polish only, across Header, Cart,
Checkout, PDP, Dashboard, product cards, star ratings, reviews, category
cards, and the recipe pages. No payment, auth, database, or business logic
touched anywhere in this pass.

---

## 1. What was checked

**Mobile (all pages in the requested list):** homepage, shop, product cards,
PDP, cart drawer, checkout, login, signup, dashboard, orders, footer — each
loaded at a 390×844 mobile viewport and checked for horizontal scroll,
layout breakage, and (where relevant) real product data rendering.

**Accessibility and contrast:** every `<input>`/`<textarea>`/`<select>` across
Login, Signup, Reset Password, Contact, Checkout, Dashboard, Product Reviews,
and the PDP Notify-Me/pincode fields; every icon-only button (cart quantity
steppers, PDP image carousel arrows, header logo/menu); focus-visible
behavior (checked for any `focus:outline-none` without a replacement focus
indicator); tap targets; disabled-button styling.

**Visual consistency:** searched every customer-facing `.tsx` file for
leftover default Tailwind `gray-*`/`blue-*` colors, `shadow-md`/`shadow-lg`/
`shadow-xl`/`shadow-2xl` used as a generic card-elevation crutch (as opposed
to a deliberate, brand-tinted hover effect), unlinked form labels, and
missing image alt text.

**Product image sanity:** verified real product and category image URLs
directly against the live Supabase project (not assumed) — both the REST
data and the actual image bytes.

**SEO / merchant feed:** re-ran `npm run build` (which chains `vite build →
prerender.mjs → generate-merchant-feed.mjs → smoke.mjs`) to confirm the
column-mismatch fix from the previous pass (doc 19 / commit
`60eadca`) is still in effect.

**Live preview QA:** re-verified Homepage, Shop, PDP, Cart, Checkout
(authenticated via simulated session, as in every prior pass this session —
no real OTP path exists in this sandbox), Login, Dashboard, Orders, and
mobile, all against real production data replayed through Playwright (the
technique established in doc 19, needed because this sandbox's browser
cannot maintain a stable tunnel to Supabase, though `curl`/Node can — see
§4 below for the up-to-date detail on this).

**Explicitly out of scope, not touched or reviewed:** the Admin panel
(`src/pages/AdminPage.tsx` and `src/components/admin/*`) — not part of the
customer-facing page list this pass named, and left alone to keep this
pass tightly scoped.

---

## 2. What was fixed

### Header (`src/components/Header.tsx`, `src/App.tsx`)
- **Real navigation bug, not just visual:** the logo click used
  `window.location.href = '/'` (a hard page reload) and the "Home" nav link
  (desktop and mobile) had no click handler at all — every other nav item
  (Shop, Categories, Recipes, Contact) already used proper SPA navigation
  via `preventDefault` + a callback. Fixed by adding `onNavigateToHome` to
  `Header`'s props (wired from `App.tsx`'s existing `navigateToHome`
  function, which was already defined but never passed in) and using it
  consistently for the logo and both Home links.
- Converted the logo from a `<div onClick>` to a real `<button>` with
  `aria-label="Spicyfied home"` — the div was not keyboard-focusable or
  activatable, a real accessibility gap.
- Categories dropdown and user-account dropdown: `shadow-xl` → `border
  border-black/10`, `border-gray-200` → `border-black/10`, `text-gray-400`
  → `text-charcoal/40`, `text-gray-500` → `text-charcoal/60` (matching the
  fine-border convention already used everywhere else on the site).

### Global background (`src/App.tsx`)
- Root wrapper `bg-gray-50` → `bg-cream` — the one remaining default-gray
  surface behind every page.

### Star ratings (`src/components/StarRating.tsx`)
- `fill-yellow-400`/`text-yellow-400` → `fill-ochre`/`text-ochre` (existing
  brand gold token, not a generic Tailwind yellow); `text-gray-300` →
  `text-charcoal/20`; `text-gray-600` → `text-charcoal/70`.
- Added `aria-label` ("Rate N stars") to each interactive star button —
  previously icon-only with no accessible name.

### Product reviews (`src/components/ProductReviews.tsx`)
- Full gray/shadow cleanup: `text-gray-900` → `text-ink`, `text-gray-700`
  → `text-charcoal/70`, `text-gray-600`/`500` → `text-charcoal/70`/`50`,
  `text-gray-400` → `text-charcoal/20`, `border-gray-300` →
  `border-black/10`, `shadow-md` → `border border-black/10` (review form
  panel, review cards, empty state).
- "Cancel" button converted from `bg-gray-200 text-gray-800
  hover:bg-gray-300` to the ghost-border pattern already established
  everywhere else (`border border-ink text-ink hover:bg-ink hover:text-cream`).
- Linked the "Your Review" textarea to its label via `htmlFor`/`id`
  (previously unlinked); added `role="group"`/`aria-labelledby` around the
  interactive star-rating control so its purpose is announced.

### Category cards (`src/components/CategoryCard.tsx`)
- Converted the clickable card from a `<div onClick>` to a real `<button>`
  (only when not `comingSoon` — the disabled "Coming Soon" card correctly
  stays a non-interactive `<div>`), with `aria-label={title}`. Previously
  not keyboard-focusable or activatable.
- `text-gray-400` (Coming Soon label) → `text-charcoal/40`.

### Product cards (`src/components/ProductCard.tsx`) — real broken-state bug
- **Added a graceful fallback for a genuinely failed product image.**
  Previously, if a product image URL 404'd or the network dropped mid-load,
  there was no `onError` handling anywhere — the customer would see the
  browser's native broken-image icon. Now it falls back to the same
  ink-to-moss gradient placeholder with the product name that already
  existed for the "no image at all" case, via a small `imageFailed` state
  toggled on `<img onError>`. Screenshot evidence in §7 confirms this now
  renders as a deliberate placeholder instead of a broken-image icon.

### PDP (`src/pages/ProductDetailPage.tsx`)
- Same broken-image fallback added to both the main product image and the
  thumbnail strip (previously neither had `onError` handling; thumbnails
  now fall back to a small gradient-with-initial placeholder, reset
  correctly when switching images).
- Added `aria-label` to the image-carousel prev/next arrow buttons and the
  quantity +/− buttons (all were icon/symbol-only with no accessible name).
- Added a visually-hidden (`sr-only`) `<label>` for the Notify-Me email
  input and the pincode input — both previously relied on placeholder text
  only, which is not a substitute for a real label.
- Gray-token cleanup: `text-gray-600` → `text-charcoal/70` (rating link,
  provenance-adjacent copy, description panels), `text-gray-500` →
  `text-charcoal/50` (related-products caption, unit total label).

### Checkout (`src/pages/CheckoutPage.tsx`) — real accessibility bug
- **Every address-form and pickup-form `<label>` was unlinked** (no
  `htmlFor`, no matching input `id`) — a genuine, pre-existing accessibility
  gap where a screen reader could not associate "Full Name", "Phone",
  "Address Line 1/2", "City", "State", "PIN Code" labels with their fields.
  Fixed by adding matching `id`/`htmlFor` pairs to all nine fields (address
  form) plus the two pickup fields.
- Added `aria-label="Order notes"` to the notes textarea (previously
  identified only by a nearby heading, not programmatically).
- Added the same broken-image fallback as Cart/ProductCard to the
  order-items thumbnail (per-item error tracking, since this section maps
  over multiple cart items).

### Dashboard (`src/pages/DashboardPage.tsx`)
- Same unlinked-label fix applied to the profile-edit form (Full Name,
  Phone) and the address form (Full Name, Phone, Address Line 1, City,
  State, PIN) — five previously-unlinked label/input pairs, given distinct
  `id`s from the Checkout ones to avoid collisions if both forms happen to
  be open in the same render.

### Cart (`src/components/Cart.tsx`)
- Same broken-image fallback added (per-item, matching Checkout's pattern).
- Added `aria-label` to the quantity +/− buttons and the remove (trash)
  button — all three were icon-only with no accessible name.

### Recipes pages (`src/pages/RecipesPage.tsx`, `src/pages/RecipeDetailPage.tsx`)
- Full gray-token cleanup (`text-gray-700/600/500/400/800` → the matching
  `text-charcoal/NN` or `text-charcoal` tokens) for consistency with the
  rest of the site. No shadow changes were needed — the one `hover:shadow-xl
  hover:shadow-ink/10` and `hover:shadow-lg` uses on these pages are already
  brand-tinted hover effects, not generic gray card shadows, so they were
  left as-is.

---

## 3. What was intentionally not touched

- **Admin panel** (`AdminPage.tsx`, `src/components/admin/*`) — still has
  gray/blue Tailwind defaults and heavier shadows, but it's not a
  customer-facing surface and wasn't in this pass's page list. Flagged here
  as a candidate for a future, separate pass if wanted.
- **`CategoryCard`'s and `RecipesPage`'s brand-tinted hover shadows**
  (`shadow-saffron/20`, `shadow-ink/10`) — these are deliberate, colored
  elevation effects on hover, not the generic gray "vibe-coded" shadow
  pattern this pass targeted, so they were left in place.
- **The PDP image-carousel arrow buttons' `shadow-lg`** and the **Add to
  Cart button's `shadow-lg shadow-ink/10`** — both are a small white/dark
  floating control needing visual separation from the photo/page beneath
  it, a standard and appropriate use of shadow, not a leftover default.
- **Star-rating yellow → ochre** was the one deliberate exception to
  "don't touch colors that aren't gray" — it's a one-line, purely cosmetic
  brand-consistency improvement explicitly covered by this pass's "final
  visual consistency" scope, with zero risk to any logic.
- No payment, Razorpay, checkout business logic (delivery-fee calculation,
  order placement, `create-razorpay-order`/`verify-razorpay-payment` calls),
  authentication/OTP, WhatsApp/SMS, Supabase functions, or database schema
  were changed anywhere in this pass — confirmed by re-reading every diff
  hunk in Checkout/Dashboard and finding only `label`/`input id`/`className`/
  `aria-*`/`onError` changes (see §6).

---

## 4. Product image sanity — findings

**Real Supabase Storage and GitHub-hosted category images were checked
directly against the live project, independent of the browser:**

```
HTTP 200 -- https://dzayzvouvbjzthneakdv.supabase.co/storage/v1/object/public/Product%20Image/Cinnamon%20(1)-min.JPG
HTTP 200 -- https://dzayzvouvbjzthneakdv.supabase.co/storage/v1/object/public/Product%20Image/Clove%20(1)-min.JPG
HTTP 200 -- https://dzayzvouvbjzthneakdv.supabase.co/storage/v1/object/public/Product%20Image/Jeera%20(1)-min.JPG
HTTP 200 -- https://raw.githubusercontent.com/nasirsaboor1/Spice/main/Cardamom%20(1)-min.JPG
HTTP 200 -- https://raw.githubusercontent.com/nasirsaboor1/Spice/main/Walnut.jpg
HTTP 200 -- https://raw.githubusercontent.com/nasirsaboor1/Spice/main/Chia%20Seeds-min.JPG
```

**These are not broken on the real site.** They come back 200 every time via
direct `curl`, confirming both the Supabase Storage bucket and the
GitHub-hosted category images are genuinely public and correctly resolved.

**However, when loaded from inside this sandbox's Playwright-launched
browser**, the same Supabase Storage image URLs frequently fail
(`net::ERR_CONNECTION_RESET` / the tunnel simply never completes), while
the identical URLs succeed instantly via `curl`/Node outside the browser.
This is the exact same sandbox/tooling limitation already diagnosed in
detail in doc 19 §0 (the environment's own proxy status endpoint logs
`ws_closed_mid_exchange` specifically for browser-originated connections to
this Supabase project) — it is not a defect in the site, the data, or the
image URLs themselves. **Documented here per instruction, before any
fixing was attempted** — and no fix was attempted for it, because there is
nothing on the site side to fix; it is this sandbox's network path to the
browser that's unreliable, not the production image hosting.

**What this pass did fix, as a direct, useful consequence of investigating
this:** while confirming the above, it became clear that if a product image
*genuinely* fails to load for a real customer (a temporary network blip, a
deleted storage file, a slow connection) — a scenario indistinguishable
from what this sandbox reproduces — the site had **no graceful handling**
for it anywhere except `CategoryCard`. That gap is now fixed (§2,
"Product cards" and "PDP"), verified with real screenshots in §7 showing
the deliberate placeholder rendering correctly in exactly this failure
condition.

**One test-script-only artifact, not a site bug:** an earlier run of this
pass's own verification script seeded a mobile-checkout test with a cart
item's raw, unresolved Supabase Storage path (e.g. `/Cinnamon (1)-min.JPG`)
instead of running it through `resolveImageUrl()` first, producing an
`http://localhost:5173/Cinnamon...` 404 in that one test only. Checked
against the real code (`src/lib/products.ts`'s `normalizeImages`) and
confirmed the real app always resolves image paths to full Supabase Storage
URLs before they ever reach `ProductCard`, `Cart`, or `Checkout` — this was
purely a gap in the test script's own data seeding, not a product code path,
and required no fix.

---

## 5. SEO / merchant feed re-check

Re-ran `npm run build` end to end. Confirmed the fix from the previous pass
(commit `60eadca`, "Fix prerender and merchant feed product queries")
remains in effect:

```
Prerendered 13 product pages.
Wrote dist/sitemap.xml from edge function.
[merchant-feed] Wrote dist/merchant-feed.xml with 13 products.
[ok]   index.html
[ok]   shop/index.html
[ok]   sitemap.xml
[ok]   robots.txt
[ok]   _redirects
[ok]   merchant-feed.xml

Smoke test passed.
```

No regression — still 13/13 real products prerendered, still a complete
merchant feed, exactly as after the prior fix.

---

## 6. Confirm no protected logic changed

Every diff hunk across all 12 changed files was reviewed. The only kinds of
lines touched anywhere in this pass are: `className` token swaps (gray/
shadow → brand tokens), `id`/`htmlFor` additions, `aria-label`/`role`
additions, `onError` handlers plus the small state variables and JSX
branches they need, the `<div>`→`<button>` element-type changes for
`Header`'s logo and `CategoryCard`, and the `onNavigateToHome` prop
plumbing between `App.tsx` and `Header.tsx`. A targeted content diff on
`CheckoutPage.tsx` and `DashboardPage.tsx` (the two files with the most
form changes) confirms zero non-cosmetic/non-a11y line changes — no
Razorpay call, no `create-razorpay-order`/`verify-razorpay-payment`
invocation, no delivery-fee calculation, no `handlePlaceOrder`,
`handleUpdateProfile`, `handleSaveAddress`, or any Supabase mutation was
touched. No file under `supabase/` was touched. No new dependency was added.

---

## 7. Screenshots captured this pass

- `mobile-homepage.png`, `mobile-shop.png` — real product data, no
  horizontal scroll, header/hamburger intact.
- `mobile-pdp.png`, `mobile-pdp-thumbfix.png` — main image and thumbnail
  strip both showing the new deliberate gradient-placeholder fallback
  (Cinnamon "C") instead of a broken-image icon.
- `mobile-cart.png` — cart drawer showing the same fallback on the line-item
  thumbnail, quantity stepper, Proceed to Checkout clearly primary.
- `mobile-checkout.png` — authenticated (simulated session), no horizontal
  scroll.
- `mobile-login.png`, `mobile-signup.png` — no horizontal scroll.
- `mobile-dashboard.png`, `mobile-orders.png` — both render correctly
  (confirms the doc-18 auth-routing fix still holds under today's changes).
- `mobile-footer.png` — footer renders correctly at mobile width.

## 8. Build / typecheck results

- `npx tsc --noEmit` — clean, run four times across this pass (after the
  `CategoryCard` button-conversion, after the `Cart`/`Checkout` map
  restructuring, and twice more after later edits) — zero errors every time.
- `npm run build` — passed every time it was run this pass, including the
  full prerender + merchant-feed chain (§5).

## 9. Changed files

```
src/App.tsx
src/components/Cart.tsx
src/components/CategoryCard.tsx
src/components/Header.tsx
src/components/ProductCard.tsx
src/components/ProductReviews.tsx
src/components/StarRating.tsx
src/pages/CheckoutPage.tsx
src/pages/DashboardPage.tsx
src/pages/ProductDetailPage.tsx
src/pages/RecipeDetailPage.tsx
src/pages/RecipesPage.tsx
```
12 files, 159 insertions / 89 deletions. No file outside `src/` was changed.

## 10. Launch blockers

**None.** Every check in this pass either passed outright or resolved to a
sandbox-only artifact (documented plainly in §4, not worked around by
pretending it isn't there) rather than a real product defect.

## 11. Non-blocking polish items (not done this pass, candidates for later)

- **Admin panel** visual consistency (gray/blue Tailwind defaults, heavier
  shadows) — out of scope for this customer-facing pass, worth a dedicated
  pass if the admin panel's polish matters to you.
- Nothing else outstanding from this pass's checklist — every other item
  requested was checked and, where a real issue existed, fixed.
