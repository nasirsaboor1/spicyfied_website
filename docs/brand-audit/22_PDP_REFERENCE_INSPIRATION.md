# 22. PDP Reference Inspiration — Furniché & Aurora (Inspiration Only)

Status: **Reference + implementation plan. Code changes described here are
what was actually implemented — see §6 for the final scope.**

## 0. What the references actually show

**Reference 1 — "Furniché" chair PDP (desktop):** full-bleed calm product
photo filling the entire left column; right column has a small-caps
breadcrumb, a large serif-adjacent title, a short editorial paragraph, a
big price with an "Early bird price" pill beside it, a thin full-width
divider, a "Colors:" swatch row, a "Dimensions:" section built from **compact
label/value rows separated by thin dividers** (Height / Width / Depth /
Seat height), a "See more chair specs" expand link, and one full-width
black "Add to Cart" button at the very bottom.

**Reference 2 — "Aurora" skincare app (mobile screens):** a circular framed
product photo, name, description, then two side-by-side info boxes
("Targets: Dryness" / "Suited to: All Skin Types"), a star-rating line with
a review-count link, a divider, then a bottom row with price on the left
and a pill-shaped "Add to Cart" on the right. Also shown: a home screen,
a checkout screen, and a New Arrivals grid — none of those are PDP-relevant
and aren't discussed further here.

## 1. Honest comparison against the current Spicyfied PDP

Several of the requested inspiration points are **already substantially
true of the current PDP** (`src/pages/ProductDetailPage.tsx`) — this
section says so plainly rather than manufacturing gaps to justify a bigger
rewrite:

| Inspiration point | Already true of current PDP? |
|---|---|
| Large calm product image area | **Mostly yes.** `aspect-square`, generous `p-8 md:p-12` internal padding, single fine border, cream-soft ground, no competing chrome. Minor polish possible, no structural rebuild needed. |
| Clear left-image / right-info structure | **Yes**, exactly (`grid-cols-1 lg:grid-cols-2`). |
| Strong CTA hierarchy | **Yes**, already two clearly-weighted actions (ink "Add to Cart" primary, saffron "Buy Now" secondary), consistent height, side by side. |
| Mobile sticky buying action | **Yes**, already exists (`md:hidden fixed bottom-0` bar with running total + both CTAs). |
| Thin dividers / restrained surfaces | **Mostly yes** — Description and Uses & Benefits already use `border-t border-black/10`; variant buttons use 2px borders, not shadows. |
| **Compact product detail/spec rows** | **No — this is the one genuinely missing piece.** There is currently no compact "quick facts" row block anywhere on the PDP; product facts are either buried in the free-text description or not surfaced at all. |
| Soft but precise card spacing / section rhythm | Reasonably good already (`space-y-7`), but the price block flows directly into "Select Size" with no visual pause — Furniché's divider-after-price beat is a small, real improvement. |

**Conclusion:** the PDP does not need a rebuild. The one substantive,
genuinely missing idea worth borrowing is Furniché's **compact spec-row
block** — everything else is refinement, not restructuring.

## 2. What to take

1. **Compact spec/detail rows** (Furniché's Dimensions pattern) — a short
   block of label-left/value-right rows separated by thin dividers,
   positioned right after the price, before the size selector. This is the
   one real structural addition from this pass.
2. **A single thin divider after the price block** to separate "what this
   is" (name, rating, price) from "the facts" (new spec rows) from "your
   choices" (size, quantity, delivery) — a small, safe rhythm improvement.
3. **General principle of restraint** — both references keep visual noise
   very low (a handful of dividers, no heavy shadows, no gradient badges
   competing with each other). Spicyfied's PDP already mostly does this;
   worth protecting rather than adding to.

## 3. What NOT to copy

- **Furniché's monospace/technical typography and "Early bird price" pill.**
  Spicyfied keeps its existing Fraunces serif + tracked-uppercase-label
  system; introducing a second display face would contradict the
  established identity for no real gain. "Early bird price" is also a
  pricing-urgency device this brand doesn't use.
- **Furniché's "Colors:" swatch row.** Spicyfied's products don't have
  color variants — this doesn't apply and nothing should be invented to
  fill that slot.
- **Aurora's circular framed product photo and pill-shaped mobile buttons.**
  A skincare-app visual language; Spicyfied's square, isolated product
  photography with rectangular buttons already reads correctly for a
  grocery/spice context and shouldn't be reshaped to match a different
  category's product photography convention.
- **Aurora's "Targets" / "Suited to" info boxes.** This is exactly the
  "invent flavour/use tags" trap the brief warns against — Spicyfied has
  no flavour-pairing, skin/use-target, or similar structured field on any
  product (`Product` type has only `description`, `health_benefits`,
  `category`, `stock_status` — no tags table, no use-case field). Adding a
  box like this would mean inventing categorical claims not backed by
  data. Flagged in §5 as something that needs new content first, not
  implemented.
- **Aurora's warm cream/beige skincare palette and its "Pay Now" checkout
  screen.** Not a PDP concern, and checkout is explicitly out of scope for
  this pass regardless.
- **Both references' page-level minimalism taken to the point of losing
  Spicyfied's existing trust content** (the notebook-style honesty already
  built into this site). Nothing about "compact detail rows" should mean
  cutting the existing Description, Uses & Benefits, or Story sections —
  those stay exactly as they are.

## 4. Proposed safe PDP v2 layout (desktop)

No structural reordering beyond one insertion. Reading top to bottom in the
right column, only the bolded line is new:

1. Breadcrumb (unchanged)
2. Bestseller badge, title, provenance line, rating link (unchanged)
3. Price + unit price (unchanged)
4. **New: thin divider, then a compact "Product Details" row block —
   Category, Pack Size (selected variant), Price per Unit (when
   computable), Availability — each a label-left/value-right row with a
   thin divider between rows, mirroring Furniché's Dimensions block
   exactly in structure, using only fields that already exist on
   `ProductWithDetails`.**
5. Select Size (unchanged)
6. Quantity (unchanged)
7. Delivery / pincode check (unchanged)
8. Out-of-stock Notify Me block, or Add to Cart / Buy Now + bulk pricing
   note (unchanged)
9. Description (unchanged)
10. Uses & Benefits (unchanged)
11. Story section, related products, reviews (unchanged, below the
    two-column grid as today)

## 5. Mobile PDP improvements proposed

- The new "Product Details" row block reflows naturally under the
  existing `grid-cols-1` mobile layout — no separate mobile variant
  needed, it's just a stacked block like everything else on mobile.
- Reviewed the existing mobile sticky CTA bar
  (`md:hidden fixed bottom-0 ... Total / Add to Cart / Buy Now`) — it
  already matches the "mobile-friendly sticky buying action" goal
  structurally. No safe, non-cosmetic change identified beyond what's
  already there; over-engineering an already-working sticky bar was judged
  a higher risk than value, so it was left as-is.

## 6. Which ideas can be implemented with existing data only

- **Compact spec rows** — yes, entirely: `product.category` (via the
  existing `CATEGORY_LABELS` map), the selected variant's `size` (Pack
  Size), the already-computed `getUnitPrice()` result (Price per Unit,
  shown only when computable, exactly like the existing unit-price line
  under the main price), and `product.stock_status` (Availability, mapped
  to "In Stock" / "Low Stock" / "Out of Stock"). Nothing new is fetched or
  invented — this reuses data already loaded on this exact page.
- **The rhythm divider** — pure layout, no data dependency.

## 7. Which ideas require new product fields/content (not implemented)

- **"Targets" / "Suited to" style use-case boxes** (Aurora) — needs a real,
  fact-checked flavour/use-case field per product that does not currently
  exist anywhere in the schema. Not implemented.
- **Color/variant swatches** (Furniché) — not applicable; Spicyfied's
  variants are size-based, not color-based. Not implemented, not needed.
- **"See more specs" expandable panel** (Furniché) — would only be
  meaningful once there are enough real spec fields to justify hiding some
  by default; with only four rows this pass, everything fits without
  needing to collapse anything. Revisit if more real spec fields are added
  later.

## 8. What was actually implemented

See the commit for this pass. Summary: added the compact "Product Details"
row block (§2.1, §6) with a preceding thin divider (§2.2), immediately
after the price block and before Select Size. No other structural change
was made — per §1's honest assessment, nothing else on this PDP needed
rebuilding. No new claims, no new product data, no schema change, no
checkout/payment/auth/order change.
