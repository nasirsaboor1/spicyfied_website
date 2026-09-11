# Spicyfied — Live UI/UX, Conversion, Mobile & Performance Audit

## Methodology — read this before the findings

**This sandbox cannot reach `spicyfied-website.vercel.app` or `spicyfied.in` directly** — the environment's egress policy blocks both hosts (confirmed via a 403 on the CONNECT tunnel; per this environment's own rules, that is a policy denial to be reported, not routed around).

What was actually done instead, with your approval: the **exact production build** (`npm run build` — the same `vite build && prerender && generate-merchant-feed && smoke` pipeline that produces what Vercel deploys) was built and served locally, wired to the **real, live production Supabase project** (using the public anon key — the same key already embedded in the live site's JS bundle). Chromium was driven with Playwright through this sandbox's required egress proxy so that every externally-hosted resource (Supabase Storage product photos, GitHub-hosted category images, Google Fonts) loaded exactly as it would for a real visitor, not from a mocked or stubbed environment. **Every product, price, image, and piece of copy shown below is real, current, live production data** — nothing was fabricated or seeded.

What this does **not** reproduce: Vercel's own edge/CDN behavior — response headers, cache behavior, and geographic latency. Absolute load-time numbers measured against a local Node server are not representative of that and are **excluded** from this report's claims; where performance is discussed, only hosting-independent facts are used (payload composition, file sizes, code-splitting, accessibility-tree structure).

Two things could not be completed live and are marked accordingly wherever they matter: (1) the full authenticated checkout form (address entry, payment method, order summary) — reaching it requires completing an email/WhatsApp OTP round-trip, and this sandbox's email-testing services (mailinator.com) are also policy-blocked; the checkout description in this report for that specific step is **INFERRED** from `src/pages/CheckoutPage.tsx`, not observed live, and is labeled as such. (2) External social-media links from the footer/contact page were not followed (same network policy).

Every other finding below is labeled:
- **OBSERVED** — seen directly in a real screenshot or real rendered DOM.
- **MEASURED** — a real number captured from the live app (file size, resource count, axe-core violation, viewport overflow check).
- **INFERRED** — reasoned from source code because live observation wasn't possible for that specific point.

A methodology note worth stating plainly: two apparent "bugs" surfaced during testing and were **disproven** before being written up — a blank-looking scroll-reveal section and "broken" product-card images that turned out to be artifacts of headless-browser screenshot timing, not real defects. Both are described in-line where relevant, specifically so the corrective process is visible rather than hidden.

Test accounts: one throwaway account was created at `/signup` (a secondary, team/admin-only path — see Checkout section) using a clearly-labeled test address (`qa-audit-spicyfied-<timestamp>@mailinator.com`, name "QA Audit Test"). No order was placed and no payment was attempted. You may want to remove this row from `admin_users`/`auth.users`/`customer_profiles` if its presence bothers you — it has no admin flag and holds no data beyond the signup form fields.

---

# Executive Summary

Spicyfied's storefront is **more capable than a first skim of the code would suggest** — real, mostly-good product photography; a genuinely distinctive, well-executed "Look Closer" authenticity section; a clean OTP-first login flow; a working cart and add-to-cart flow with no horizontal-overflow bugs at any tested mobile width. This is not a broken or unfinished site.

It is, however, held back by a specific, recurring pattern: **content and finishing polish lag behind the underlying engineering.** Product descriptions are visibly templated boilerplate repeated verbatim in structure across every product checked. There are zero customer reviews on any product. The public contact email is an unrelated-looking personal Gmail address, undercutting the trust the physical address and phone number just built. Several icon-only buttons (the cart icon, the product-gallery arrows) have no accessible name at all — a real, confirmed WCAG failure, not a style nitpick. And running the actual production build against the actual live database surfaced a genuine, currently-active defect no code read-through would have caught: **the SEO prerendering and Google Merchant Center feed generation scripts are broken** (`column products.category does not exist`), meaning individual product pages ship with no server-rendered meta tags or Product schema, and the merchant feed doesn't exist.

None of this requires a redesign. It requires: real content, real reviews infrastructure, a few accessibility fixes with exact file locations already in hand, and one genuinely urgent one-line-root-cause SEO bug fix.

---

# First 5 Seconds

Evaluated against the real, rendered homepage (`home__desktop__viewport.png`), not the source.

1. **What does Spicyfied sell?** Partially clear. The hero headline ("Grown in purity, refined by hand.") and subhead never say the words "spices," "masala," or "dry fruits" — a first-time visitor has to infer the category from the site name "Spicyfied" and the nav items (Shop, Categories, Recipes). It resolves within a few seconds via the nav, but the hero itself doesn't do this job. **OBSERVED.**
2. **Why buy from Spicyfied?** The four pillars (Purity, Elegance, Taste, Richness) attempt this, but "Elegance" is an odd word for spice quality and none of the four is concretely differentiating — every premium spice competitor claims purity and small-batch sourcing in similar language. **OBSERVED.**
3. **Why trust Spicyfied?** Nothing in the first viewport signals trust — no review count, no customer photos, no certification, no "X,000 orders delivered." The trust case is made much better a few sections down (see Homepage section), just not in the first 5 seconds. **OBSERVED.**
4. **Where does it deliver?** Not stated anywhere above the fold. Delivery area (free within 5km of Varanasi, ₹50 flat elsewhere in India) only surfaces at checkout. **OBSERVED** (confirmed absent from hero/nav; delivery messaging confirmed present only on `CheckoutPage.tsx` per Phase 1 source review — **INFERRED** for the checkout-specific copy, **OBSERVED** for its absence on the homepage).
5. **What should I click next?** Clear — "Explore the Collection" is the only real CTA in the first viewport, high-contrast, well-placed. **OBSERVED.**
6. **Does it feel premium?** Largely yes — the dark ink-green/cream/saffron palette, serif display type (Fraunces) paired with a clean sans body face, and generous whitespace read as considered, not templated. **OBSERVED.**
7. **Does it feel like a real, established food brand?** Mostly yes on the homepage; this impression **erodes** once you reach product pages with generic templated descriptions and zero reviews, and erodes further on the Contact page where the listed email is `southmountainenter@gmail.com` — unrelated to the brand name. **OBSERVED.**
8. **Anything that looks unfinished/generic/AI-generated/template-like?** Yes, concretely: every product description checked (Cinnamon, Nutmeg) follows the identical five-line template — "Aromatic Profile: [Product] is known for its distinctive aroma and flavor. / Origin: Harvested and processed using traditional methods. / Culinary Uses: Widely used in various dishes and beverages. / Health Benefits: Contains natural compounds that support overall wellness. / Quality: Sourced from trusted regions known for premium [product]." — with the product name swapped in and nothing else changing. This is the single clearest "template/AI-boilerplate" signal on the site. **OBSERVED** (verified on 2 of 25 products; structure is generic enough that it reads as a fill-in-the-blank pattern rather than product-specific writing).

---

# Customer Journey

## Homepage → Shop
Clicking "Explore the Collection" or "Shop" in the nav lands on `/shop`, showing **"25 products found"** with working category filters (All / Whole Spices / Dry Fruits / Seeds) and a price-range slider (₹0–₹10000). **MEASURED.** No friction here — the transition is immediate, no loading flash, filters are visible and understandable.

## Shop → Product
Clicking a product card navigates to `/product/<slug>` (e.g., `/product/cinnamon`) with a breadcrumb (Home / Shop / Whole Spices / Cinnamon) for orientation. **OBSERVED.** One friction point: **the entire product card is a `<div>` with a click handler, not a link** (`src/components/ProductCard.tsx:17-19`) — works fine with a mouse, but is not keyboard-focusable and announces as nothing to a screen reader; only the inner "View Details" button is actually operable without a mouse. **OBSERVED (confirmed via source + axe scan showing no accessible-name issue here specifically, but confirmed via keyboard-navigation reasoning from the exact JSX).**

## Product → Add to Cart
Selecting a size (100g/50g/250g/500g/1kg, each with its own price) and clicking "Add to Cart" produces immediate, clear feedback: the button becomes a green "✓ Added to Cart" state, a "View Cart" shortcut appears in place, and the header cart icon updates its count badge. **OBSERVED, MEASURED** (cart badge went from empty to "1" after the click). This is a well-built micro-interaction — no ambiguity about whether the action worked.

## Cart
Opening the cart (desktop: an unlabeled icon button in the header; mobile: a slide-over panel) shows a clean, correct summary: item thumbnail, name, size, unit price, quantity stepper, remove (trash) icon, running total, "Proceed to Checkout" (primary) and "Continue Shopping" (secondary). **OBSERVED.** Friction point: the "Ordering in bulk? Bulk quantities have different pricing. Contact us directly for a custom quote." note appears **three separate times** in one short flow (on the product page, again in the added-to-cart state, again in the cart drawer) — redundant enough to read as noise by the third repetition. **OBSERVED.**

## Cart → Checkout
"Proceed to Checkout" while logged out correctly redirects to `/login` rather than dead-ending or erroring. **OBSERVED.** The login screen is OTP-first (Email or WhatsApp toggle, single email field, "Send Verification Code") with genuinely good microcopy: *"New here? We'll create your account automatically once you verify your email."* — this is a modern, low-friction pattern (no separate signup form, no password to invent) that most competitors in this category don't bother with. **OBSERVED, and a positive finding.** Password-based sign-in/signup exist as secondary links explicitly labeled *"Admin or team member? Sign in with password"* / *"Setting up a team account? Sign Up"* — i.e., **not** the path an ordinary customer is meant to use.

Completing the OTP loop to reach the actual address/payment/order-summary screen was not possible from this sandbox (blocked email-testing service — see Methodology). That screen's content — address form, delivery-vs-pickup toggle, delivery fee display, payment method selection, order summary — is described from source code in the Checkout section below and marked **INFERRED**.

## A real, live bug found along this exact path
Testing the *other* signup form (`/signup`, the password-based "team account" path — reached while probing the login screen's secondary links) with a throwaway test account produced a raw, user-facing JavaScript error: **`"Unexpected end of JSON input"`** rendered directly in the form UI where a friendly validation/error message should be. **OBSERVED** (screenshot: `signup_result` capture; exact text captured from the live DOM). This form is not the primary customer path, but it is live, reachable, and currently broken for anyone who does use it (a returning team member, or a customer who clicks through from the login screen's secondary link out of confusion).

---

# Homepage

Section-by-section, top to bottom, against the real rendered page.

| Section | Purpose | Works | Doesn't | Verdict |
|---|---|---|---|---|
| **Hero** (headline, subhead, "Explore the Collection" CTA, 4 pillars) | First impression, category + value framing | Strong visual craft; clear single CTA; good typographic hierarchy | Never states product category in words; "Elegance" pillar is off-brand-voice for a spice merchant | **MODIFY** — add one line naming the product categories; reconsider "Elegance" copy |
| **"Look Closer" / authenticity reveal** (Cardamom/Cinnamon/Clove macro photography, "Shop the real thing" CTAs) | Differentiation via radical photo-transparency | Genuinely excellent — real macro photography, "01/02/03 · THE REAL THING" labeling, elegant reveal-on-scroll animation, each links directly to the relevant product | None found | **KEEP**, unmodified — this is the homepage's best asset |
| **"You'd be surprised what's in the jar"** (4-card adulteration-test guide: cinnamon/cardamom/clove/pepper) | Education-as-trust-signal, teaches customers to verify quality themselves | Directly, concretely differentiating — no competitor audited elsewhere does this; specific, actionable, testable claims (not vague "purity" language) | None found | **KEEP** — arguably the second-best asset on the page, deserves more prominence, not less |
| **"Shop by Category"** (4 circular category cards: Whole Spices, Dry Fruits, Seeds, Blended Spices–Coming Soon) | Category-level navigation | Clean, simple, working (once real browser/network conditions are used — see Methodology note on an image-loading false alarm) | "Blended Spices — Coming Soon" occupying a permanent 1-of-4 slot advertises an absent product line | **MODIFY** — consider a 3-card layout until Blended Spices actually ships, or replace the slot with a stronger converting category |
| **Bestsellers / Everyday Essentials / Healthy Snacking** (product grids) | Product discovery, real inventory on display | Real products, real prices, real (mostly good) photography, "Bestseller" badges | One product ("Shah Jeera") has no photo at all — a plain color placeholder instead; Nutmeg shows "STARTING FROM ₹6" with no unit label (it's ₹6 **per piece**, not per weight like every other card — looks like a pricing error at a glance) | **MODIFY** — add the missing photo; add a unit qualifier ("/pc") next to unit-priced items |
| **Footer** | Navigation, legal, brand reinforcement | Complete: Quick Links, Categories, Legal & Policies, copyright, "Made with ❤️ for quality and purity" | Not evaluated for broken links (external social icons not reachable from this sandbox) | **KEEP**, verify social links separately |

**Storytelling sequence assessment:** the current order (hero → authenticity reveal → adulteration-test guide → categories → product grids → footer) is logically sound — it leads with an emotional/trust hook before asking for a purchase decision, which is the right sequence. The one structural gap is that the *strongest* trust content (the reveal + adulteration guide) sits below the fold with nothing in the hero pointing down to it — a returning or impatient visitor who doesn't scroll never sees Spicyfied's actual differentiator.

---

# Brand Perception

- **Premium perception:** Real, not performative. Ink-green (`#211C17`-adjacent) and cream palette, saffron accent, Fraunces serif for display type — consistent and deliberate, not a default template palette. **OBSERVED.**
- **Indian identity:** Present but understated — "Choose Pure, Choose Us" tagline, Varanasi address, INR pricing, but no explicit visual motifs (no regional pattern work, no Hindi/Devanagari typographic accents) beyond product names themselves. Neither a strength nor a weakness, a neutral observation.
- **Authenticity:** Strongly reinforced by the "Look Closer" and adulteration-test sections specifically — this is where the brand's authenticity claim earns its keep with concrete, checkable evidence rather than adjectives.
- **Warmth / appetite appeal:** Product photography does real work here — the Dried Kiwi and Dried Mix Fruit shots in particular are vivid and appetizing. **OBSERVED.**
- **Consistency:** Breaks down specifically at the content layer — the visual system is consistent everywhere tested, but the *copy* system is not (hand-crafted homepage copy vs. templated product descriptions vs. an off-brand contact email).
- **Nothing reads as AI-generated at the visual/design level.** The one AI/template signal found is textual (product descriptions), not visual.

---

# Shop & Discovery

- **25 products, 3 real categories** (Whole Spices, Dry Fruits, Seeds) plus one "Coming Soon" (Blended Spices). **MEASURED.**
- Filter UI (category buttons + price range) is immediately visible on desktop, collapses to a "Filters" button/drawer on mobile — correct, standard responsive pattern. **OBSERVED.**
- **Time to find a specific item:** a user typing "turmeric" into the header search bar was not tested end-to-end (search-result behavior not captured live), but category filtering to "Whole Spices" or "Seeds" narrows the 25-product catalog quickly and legibly. **PARTIALLY OBSERVED** — search itself is an untested gap in this pass, flagged as such rather than assumed to work.
- Product cards show category-appropriate photography at a consistent aspect ratio (square) with a consistent "STARTING FROM ₹X" + "View Details" treatment. **OBSERVED**, no layout inconsistency found across the grid.
- No stock-status indicators were visible on any of the cards checked (no "low stock"/"out of stock" badges appeared, though the code supports them per `ProductCard.tsx`) — likely means current inventory is healthy, not a bug.

---

# Product Page

Evaluated on Cinnamon (Whole Spices, bestseller) and Nutmeg (Whole Spices, per-piece pricing) — both **OBSERVED** live.

**What works:**
- Clear size/variant selector with per-size pricing shown inline (100g ₹125, 50g ₹65, 250g ₹298, 500g ₹595, 1kg ₹1190) — no hidden pricing, no "select to see price" friction.
- Quantity stepper, delivery-pincode checker ("Enter pincode" + "Check") directly on the product page — lets a customer confirm deliverability before committing to checkout, genuinely good friction reduction.
- Dual CTA (green "Add to Cart" / orange "Buy Now") — standard, effective pattern.
- Breadcrumb navigation for orientation and (per Phase 1's source review) SEO internal linking.
- Image gallery with 2 photos and prev/next arrows.
- "You may also like" cross-sell carousel with 4 related products, real prices, real photos (mostly).

**What would stop a purchase right now** — the question the brief asked directly:
1. **The description tells you nothing product-specific.** "Contains natural compounds that support overall wellness" is the kind of sentence that answers no real question a spice buyer has (Ceylon or Cassia? Whole or ground? How strong? How fresh — harvest date, batch date?). A comparison-shopping customer gets more useful information from a competitor's listing.
2. **Zero reviews** ("0.0 · (0 reviews)" / "No reviews yet. Be the first to review this product!") on a product explicitly badged "Bestseller" — the badge and the empty review state visually contradict each other and undercut both.
3. Only 2 product photos, both from similar angles — no packaging shot, no scale reference (a coin/hand for size), no close-up texture shot.

**Accessibility, confirmed via axe-core on the live rendered page (critical/serious only):**
- **CRITICAL — `button-name`** (7-8 elements per page): the product image gallery's prev/next arrow buttons have no accessible name at all (`.left-4`, `.right-4` in the axe target list) — a screen-reader user cannot tell what these buttons do. Same violation recurs on the cart and every page with the header cart icon (see Accessibility section for the shared root cause).
- **SERIOUS — `color-contrast`** (8-9 elements): confirmed failing elements include saffron-colored eyebrow labels (`.text-saffron`) on cream backgrounds.

---

# Cart

- Desktop: opens as a dropdown/panel from the header cart icon. Mobile: a full slide-over drawer with a clear "Your Cart" header and close (×). **OBSERVED**, both consistent and functional.
- Line item shows thumbnail, name, size, price, quantity stepper (+/-), and a trash/remove icon — everything needed to edit is present without a separate page.
- Subtotal ("Total: ₹125") is clear; no hidden fees shown at this stage (delivery fee is calculated later, at address entry — reasonable, since fee depends on pincode).
- "Proceed to Checkout" and "Continue Shopping" are both present and clearly differentiated (primary/secondary button treatment).
- **No cross-sell inside the cart itself** — "You may also like" only appears on the product page, not reinforced at the cart step where a customer is already primed to add one more item. This is a legitimate, non-manipulative opportunity (a real recommendation, not a dark pattern) that's currently unused.
- Mobile cart drawer scrolls correctly with no observed overflow or clipped content at 390px/430px. **MEASURED** (`overflow: false` on both widths).

---

# Checkout

**OBSERVED:** logging out and clicking "Proceed to Checkout" correctly redirects to the OTP login screen rather than erroring or silently failing — no dead end.

**INFERRED (from `src/pages/CheckoutPage.tsx`, not reached live in this pass):** once authenticated, checkout presents a delivery-vs-pickup toggle (pickup forces cash-on-pickup; delivery requires online payment via Razorpay UPI/card — this split is enforced both client-side and by a database constraint, confirmed in the Phase 1 security audit), an address form or saved-address selector, a live delivery-fee calculation keyed to pincode, an order summary (subtotal/tax/shipping/total), and Razorpay's own checkout modal for payment. This entire step needs a direct, human check against the live site before being treated as fully verified — this report explicitly does not claim to have seen it.

**Plausible abandonment points, reasoned from what could and couldn't be observed:**
- The OTP step itself (mandatory account verification before checkout) is one extra step and one context-switch (to an inbox or WhatsApp) compared to guest checkout — a real, deliberate trade-off for security/spam-reduction that will cost some fraction of last-step conversions. Not a bug, a genuine design decision worth knowing the cost of.
- The "Ordering in bulk?" note repeating through product → cart (see Cart section) will very likely also appear at checkout, compounding the redundancy noted earlier.
- (INFERRED) COD is only available for in-store pickup, never for delivery — a real customer who prefers COD and wants delivery will hit a wall at the payment-method step with no COD-for-delivery option. This is a legitimate business/fraud-risk decision, not necessarily a bug, but it is a plausible source of cart abandonment specifically among COD-preferring Indian online shoppers, worth knowing is happening rather than assuming it isn't.

---

# Mobile

Tested at 390px (iPhone 12/13-class) and 430px (iPhone 14 Pro Max-class), both **MEASURED** for horizontal overflow on home/shop/product/cart: **zero overflow found at either width, on any page tested.** This is a genuinely good, verified result — no `scrollWidth > clientWidth` on any of the eight page/width combinations checked.

**What works well specifically on mobile:**
- Hamburger nav menu, correctly hidden desktop nav items behind it.
- Single-column product grid on `/shop` — large, legible cards, no cramming.
- A **sticky bottom action bar** on the product page ("TOTAL ₹125 / Add to Cart / Buy Now") that stays anchored while scrolling — a well-established, effective mobile commerce pattern, correctly implemented. (A first full-page screenshot appeared to show this bar overlapping page content; re-verified with a plain viewport screenshot and confirmed it renders correctly — the overlap was an artifact of how a stitched full-page screenshot composites `position: fixed` elements, not a real bug. Noted here specifically because getting this wrong in a report would have been a false claim.)
- Cart drawer's touch targets (quantity +/-, remove icon, Proceed/Continue buttons) all rendered at reasonable, tappable sizes in the captured screenshots.

**Not fully verified in this pass:** exact touch-target hit-area sizes in pixels (visual size in a screenshot doesn't guarantee the actual tappable hit area matches), real on-device software-keyboard behavior on checkout form fields (only reachable via the blocked OTP step), and pinch-zoom/gallery-swipe gesture behavior on the product image gallery.

---

# Accessibility

Ran axe-core (industry-standard automated ruleset) against the live rendered DOM of every page captured, then manually interpreted which violations are real UX-impacting problems vs. minor. Full violation list is consistent and repeats across pages, pointing to a small number of root causes rather than scattered one-offs:

| Severity | Rule | Where confirmed | Root cause (exact location) |
|---|---|---|---|
| **Critical** | `button-name` (buttons must have discernible text) | Home, Shop, Product, Cart — 7-8 elements per page | Header cart icon button has no `aria-label` and no visible text (`src/components/Header.tsx:93-103`, the desktop cart trigger specifically — the mobile equivalent at line ~175-179 *does* have `aria-label="Open cart"`, so this is an inconsistency between the two, not a universal miss); product-gallery prev/next arrow buttons (`.left-4`/`.right-4` targets) are icon-only with no label |
| **Serious** | `color-contrast` | Home, Shop, Product, Cart, Contact — 4-9 elements per page | Saffron-colored (`.text-saffron`) small-caps eyebrow labels on cream backgrounds fall below WCAG AA contrast |
| **Moderate** | `heading-order` | Home, Shop, Product, Cart | One instance of a heading level skip (h-level jumps rather than increasing by one) |
| **Moderate** | `landmark-one-main` | Every page tested | No `<main>` landmark element anywhere in the app — a screen-reader user has no fast way to skip to primary content |
| **Moderate** | `region` (content should be in landmarks) | Every page tested, 7-30 elements | Follows directly from the missing `<main>`/landmark structure above |
| **Moderate** | `landmark-unique` | Product, Cart | Duplicate unlabeled landmark roles |

**Manual findings beyond what axe can catch:**
- Product cards (`ProductCard.tsx`) and the homepage logo (`Header.tsx:57`) use `<div onClick>` as their primary interactive surface rather than `<a>`/`<button>` — not keyboard-focusable, not announced as interactive to assistive tech, confirmed by reading the exact source alongside the live rendered behavior (Tab-key navigation through the product grid skips the cards entirely and lands only on the "View Details" buttons).
- No `prefers-reduced-motion` handling was found in the stylesheet or the scroll-driven "Look Closer" reveal animation's implementation (per Phase 1 source review) — a vestibular-sensitive user gets the full motion regardless of their OS-level preference.
- Reduced-motion and full screen-reader walkthrough (NVDA/VoiceOver) were not performed live in this pass — the axe scan plus manual DOM/keyboard reasoning above is what this report is actually claiming, not a full manual audit.

---

# Performance

**What is and isn't claimed here, precisely:** absolute load-time numbers from this sandbox's local server are not representative of Vercel's production CDN and are excluded. What follows is hosting-independent and real.

**MEASURED, directly from the live production build and live database:**
- **JS bundle: one single 194.8KB gzipped chunk, no route-level code splitting** — confirmed by both the Vite build output itself (`(!) Some chunks are larger than 500 kB after minification... Consider dynamic import()`) and by resource-timing capture showing the same `index-*.js` file loading identically on every route. This directly confirms Phase 1's source-level prediction: the entire admin panel's code ships to every anonymous shopper.
- **Product photography is served at native camera resolution with no resizing.** Directly measured file sizes for product-card images: Cinnamon 1.02MB, Clove 0.82MB, Pepper 1.01MB, Star Anise 1.09MB — each at **3024×4032px** — displayed on a product card at a few hundred pixels wide. This is not a marginal inefficiency; it's roughly 10-30x more image data than the display size needs, repeated across a 25-product catalog. The "-min" filename suffix (e.g., `Cinnamon (1)-min.JPG`) suggests a compression pass was attempted and still produced megabyte-scale files — the fix needs actual resizing, not just re-compression.
- **Decorative homepage hero images are also oversized relative to their role:** the header logo alone is 385.7KB (`spicyfied_logo_.jpeg`), a single decorative pepper photo is 259KB, and the three "Look Closer" hero WebPs run 107-151KB each — WebP is the right format choice, but the dimensions/quality settings are pushing file size well past what a hero image needs.
- **Lazy-loading is implemented correctly** for product-card images (`loading="lazy"` in `ProductCard.tsx`) — confirmed via a real, deliberate scroll-through test that these images only complete loading once scrolled near the viewport, exactly as intended. This is a genuine positive finding, and directly corrects an assumption: a naive automated screenshot check initially made these images look broken/unloaded; a real user-paced scroll proves they work correctly.
- **A real, currently-active, previously-unknown production defect:** running the actual `npm run build` pipeline against the live database produces `Failed to fetch products: column products.category does not exist`, twice — once in `scripts/prerender.mjs` (per-product SEO prerendering) and once in `scripts/generate-merchant-feed.mjs` (Google Merchant Center feed). Both scripts query a `products.category` column that does not exist in the live schema (the real column is `products.category_id`, a foreign key — confirmed against the live database in the Phase 1/2 security work). **The practical, measured consequence:** only the static routes (`/`, `/shop`, `/contact`, `/privacy`, `/terms`, `/shipping`, `/refund`) get prerendered HTML; **no individual `/product/<slug>` page is prerendered**, meaning none of them ship server-rendered meta tags, Open Graph data, or the per-product `Product`/`AggregateOffer` JSON-LD that Phase 1's audit assumed was working (it was written correctly in the script — it just can't run against the real schema). `merchant-feed.xml` does not get generated at all. Since this is the same script Vercel's own build would run against the same live database, this is not a local-only issue — it will fail identically in the real production build, and very likely already has been failing in every deploy since whichever schema change introduced `category_id` in place of a `category` column. This is this audit's single highest-confidence, most surprising finding, and it was only findable by actually running the build — no amount of source reading would have surfaced it.
- **Fonts:** Google Fonts loaded via `@import` in `index.css` (confirmed present in source; confirmed in this sandbox that the request to `fonts.googleapis.com` needs the same proxy path as everything else external — not a production issue, just confirms the dependency is real and external, consistent with Phase 1's render-blocking-@import finding).

---

# Image Quality

Assessed on real, live product and homepage photography.

**Strong, appetizing, on-brand:**
- Dried Kiwi (vivid green cross-sections, genuinely appetizing)
- Dried Mix Fruit (bright, colorful, well-lit)
- The three "Look Closer" macro shots (Cardamom, Cinnamon, Clove) — the best photography on the site, shot specifically to support the authenticity-education narrative
- Cinnamon, Clove, Pepper, Star Anise, Kabab Chini product-card photography — real, unstaged, consistent enough

**Real, confirmed problems:**
- **"Shah Jeera" has no product photo at all** — a plain dark-green placeholder with the product name in text, appearing on the homepage's Everyday Essentials section and in "You may also like" carousels. Reads as an unfinished listing next to fully-photographed neighbors.
- **Inconsistent backgrounds across the catalog**: some products are shot on plain white/grey seamless backgrounds (Cinnamon), others appear on a light fabric/cloth surface — no single consistent styling system across the 25-product catalog. This doesn't look "cheap," but it does look assembled over time rather than shot as one coherent set.
- **Every product photo is a raw, full camera-resolution file** (per Performance section) — this is simultaneously an image-quality risk (nothing has verified these display correctly at every card size without browser-side downscaling artifacts) and the single largest performance cost on the site.
- **Category-card images are sourced from an unrelated third-party GitHub repository** (`raw.githubusercontent.com/nasirsaboor1/Spice/...`) rather than the same Supabase Storage bucket every other product photo lives in — functionally fine today (confirmed reachable, confirmed loading), but a fragile, easy-to-silently-break dependency: if that external repo is ever renamed, made private, or has its files moved, these three homepage category images break with no warning and no relationship to the site's own content-management path.

Nothing observed reads as AI-generated imagery — every photo is a real, if inconsistently produced, product/food photograph.

---

# Conversion

Framed by the requested categories — no dark patterns recommended, consistent with the brief.

| Recommendation | Category |
|---|---|
| Write real, product-specific descriptions (origin specifics, grind/cut, culinary pairing suggestions, actual harvest/batch freshness info) to replace the templated boilerplate | INCREASES TRUST, IMPROVES DISCOVERY |
| Stand up a real review-collection flow so "Bestseller" badges aren't sitting next to "0 reviews" | INCREASES TRUST |
| Fix the contact email to a domain-matched address (`hello@spicyfied.in` or similar) instead of an unrelated personal Gmail address | INCREASES TRUST |
| Surface the delivery-area promise ("free within 5km of Varanasi, ₹50 flat elsewhere in India") higher up — homepage or shop page banner, not only at checkout | REDUCES FRICTION |
| Add a genuine cross-sell moment inside the cart drawer itself (not just the product page), using the same "You may also like" logic already built | INCREASES AOV |
| Give the "Look Closer" / adulteration-test content more homepage prominence (it's the strongest trust asset and currently requires scrolling past the hero to reach) | INCREASES TRUST, IMPROVES DISCOVERY |
| Add a product photo for every catalog item before it's featured in cross-sell/homepage carousels (fix Shah Jeera specifically) | INCREASES TRUST |
| Label unit-priced items ("/pc") distinctly from weight-priced items on compact product cards | REDUCES FRICTION (prevents the "is this a pricing error?" hesitation) |
| Fix the broken merchant-feed/prerender build scripts (Performance section) | IMPROVES DISCOVERY (this is an acquisition-channel bug, not just a technical one — no product Google Shopping feed currently exists to submit) |

No fake urgency, fake scarcity, fake review, or countdown-timer pattern was found anywhere on the site, and none is recommended here, consistent with the brief.

---

# Things Already Done Well

Stated plainly, because a report that's all findings under-communicates what shouldn't change:

1. The "Look Closer" authenticity-reveal section and the adulteration-test guide — genuinely differentiated, well-executed, on-strategy content. Don't touch the concept; only consider surfacing it earlier.
2. The OTP-first login/signup flow for ordinary customers — modern, low-friction, well-written microcopy.
3. Add-to-cart micro-interaction feedback (button state change, "View Cart" shortcut, header badge update) — clear, immediate, no ambiguity.
4. The cart drawer itself — complete, correctly editable, no missing information.
5. Lazy-loading on product images is implemented correctly (verified via real scroll behavior, not just present in source).
6. Zero horizontal-overflow bugs found at 390px or 430px on any page tested — a real, verified, clean result.
7. The delivery-pincode checker directly on the product page — a genuine friction-reducer most competitors skip.
8. The visual/brand system (palette, type, spacing) — consistent, deliberate, premium-reading, with no template-default tells.
9. COD-restricted-to-pickup, delivery-requires-online-payment — a considered fraud/logistics decision enforced at both the UI and database level (confirmed in the Phase 1/2 security work), not an accidental gap.

---

# Things That Should NOT Be Changed

- The dark ink-green/cream/saffron palette and Fraunces serif display type — this is working, distinctive brand equity; don't "modernize" it toward a generic light/white e-commerce template.
- The "Look Closer" scroll-driven reveal concept — the mechanism works once tested correctly; don't remove it because a naive screenshot made it look broken.
- The dual "Add to Cart" / "Buy Now" CTA pattern on the product page — standard, effective, no reason to consolidate to one button.
- The category structure (Whole Spices / Dry Fruits / Seeds / Blended Spices) — clear, appropriately sized for a 25-product catalog; don't over-fragment it with more categories before the catalog itself grows.
- The OTP-first auth model — do not revert to a password-only flow for ordinary customers; it is a genuine strength, not something competitors have matched.

---

# Prioritized Recommendations

For each: **Impact / Effort / Confidence.**

| # | Recommendation | Impact | Effort | Confidence |
|---|---|---|---|---|
| 1 | Fix the `products.category` → `category_id` mismatch in `scripts/prerender.mjs` and `scripts/generate-merchant-feed.mjs` | HIGH | SMALL | HIGH |
| 2 | Add `aria-label` to the desktop header cart icon button and the product-gallery prev/next arrows | MEDIUM | SMALL | HIGH |
| 3 | Write real, product-specific descriptions to replace the templated boilerplate (start with bestsellers) | HIGH | LARGE | HIGH |
| 4 | Fix the contact-page email to a brand-matched address | MEDIUM | SMALL | HIGH |
| 5 | Add a photo for Shah Jeera (and audit the rest of the 25-product catalog for the same gap) | MEDIUM | SMALL | HIGH |
| 6 | Resize/compress product photography for web delivery instead of serving native camera resolution | HIGH | MEDIUM | HIGH |
| 7 | Stand up a real review-collection nudge (post-delivery email/WhatsApp prompt) so "Bestseller" badges aren't next to zero reviews | HIGH | MEDIUM | MEDIUM |
| 8 | Add a `<main>` landmark and fix heading-order to resolve the moderate axe violations site-wide | MEDIUM | SMALL | HIGH |
| 9 | Surface delivery-area promise on the homepage/shop page, not only at checkout | MEDIUM | SMALL | MEDIUM |
| 10 | Fix the broken `/signup` (team/admin) form's raw "Unexpected end of JSON input" error | LOW-MEDIUM | SMALL | HIGH |
| 11 | Reduce the "Ordering in bulk?" note to appearing once per flow instead of three times | LOW | SMALL | MEDIUM |
| 12 | Add cross-sell recommendations inside the cart drawer | MEDIUM | MEDIUM | MEDIUM |
| 13 | Route-level code-splitting so the admin panel doesn't ship to every shopper (carried over from Phase 1, re-confirmed live) | MEDIUM | MEDIUM | HIGH |
| 14 | Complete a real, human, end-to-end OTP checkout walkthrough (this report could not) | HIGH (as verification) | SMALL | N/A — this is a "go check it" item, not a design change |

---

# THE 10 CHANGES I WOULD MAKE FIRST

1. **Fix the `products.category` column bug in `scripts/prerender.mjs`/`generate-merchant-feed.mjs`.** This is a one-line-per-file root cause (swap the query to join `categories(slug)` the same way `src/lib/products.ts` already correctly does) that is silently costing every product page its SEO metadata and killing the Google Shopping feed entirely, in production, right now. Nothing else on this list has this combination of tiny effort and confirmed, currently-active damage.
2. **Add `aria-label` to the cart icon button and gallery arrows.** Exact file/line known (`Header.tsx:93-103`), a five-minute fix, and it's the difference between a screen-reader user being able to find the cart at all or not.
3. **Replace templated product descriptions with real, product-specific copy, starting with the 7 bestsellers.** This is the single clearest "does this look unfinished/generic" signal on the entire site, and it's directly inside the moment a customer decides whether to buy.
4. **Fix the contact email.** One field, high leverage — `southmountainenter@gmail.com` actively works against every bit of trust the physical address and phone number just built.
5. **Give Shah Jeera (and any other photo-less product) a real photo before it appears in cross-sell carousels.** A placeholder next to seven fully-photographed neighbors reads as broken, not "coming soon."
6. **Resize product photography for web.** 0.8-1.1MB native-camera-resolution files on a 25-product catalog compound badly as the catalog grows; the fix is mechanical (a build-time or upload-time resize step), not a redesign.
7. **Start collecting reviews.** Even a handful of real reviews would stop the specific, jarring "Bestseller badge next to 0 reviews" contradiction found on the very product the site is telling customers to trust most.
8. **Add a `<main>` landmark site-wide.** One structural change that resolves the two most-repeated moderate accessibility violations (`landmark-one-main`, `region`) across every page in one move.
9. **Surface the delivery-area promise earlier than checkout.** "Free within 5km of Varanasi, ₹50 elsewhere in India" is a real, concrete, specific answer to a real hesitation ("does this even ship to me?") that currently only appears after a customer has already committed to checking out.
10. **Do a real, human, logged-in walkthrough of checkout.** This is the one part of the funnel this report could not verify live, and it's also the part where a real bug would be the most expensive to leave unfound — someone on your side needs to place one real test order (or get as close as possible without paying) before trusting that this step converts as well as everything upstream of it.
