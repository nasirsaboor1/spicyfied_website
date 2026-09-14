# 23. Product Content Safety + PDP Copy Cleanup Audit

Status: **Audit only. No database, code, or content changed.**

## 0. Method

Reviewed two separate sources of truth, since they turned out to differ
sharply:

1. **Live database content** — fetched directly from the real Supabase
   project (`products.description`, `products.health_benefits`,
   `product_stories`, `reviews`) for all 13 active products.
2. **Hardcoded UI copy** — grepped every customer-facing `.tsx` file
   (Homepage, Shop, PDP, Footer, Contact, legal pages, Category card,
   Bulk-pricing note) for the exact risk categories named in the request.

**Headline finding: the single biggest content-safety issue on this site
is in the database, not the UI code.** All 13 live products share one
identical, templated description (only the product name is substituted)
containing an unverified origin claim, an unverified wellness/health claim,
and an unverified "trusted regions / premium" quality claim — on every
single product page, with no per-product truth behind any of the three.
This is more consequential than anything found in the hardcoded homepage
copy, and is flagged as the top launch blocker in this report.

---

## 1. Database content — all 13 live products (identical template)

Confirmed via direct query: every active product's `description` field
follows this exact five-line template, with only the product name changed:

```
- Aromatic Profile: [Name] is known for its distinctive aroma and flavor.
- Origin: Harvested and processed using traditional methods.
- Culinary Uses: Widely used in various dishes and beverages.
- Health Benefits: Contains natural compounds that support overall wellness.
- Quality: Sourced from trusted regions known for premium [name].
```

`health_benefits` (the dedicated field meant for this) is `null` or empty
on every product — meaning the only "health" content that exists lives
inside the generic description bullet above, not in reviewed, per-product
health copy. `product_stories` has one row with every field (`story_title`,
`story_content`, `heritage_info`, `sourcing_details`) `null` — there is no
real origin/heritage/sourcing content anywhere in the database. `reviews`
has zero rows.

| # | Phrase | Where | Classification | Why |
|---|---|---|---|---|
| 1 | "Origin: Harvested and processed using traditional methods." | `description`, all 13 products | **REMOVE/REWRITE** | Says nothing specific (true of literally any spice ever harvested), reads as a placeholder, and asserts a "traditional methods" process claim with zero backing. |
| 2 | "Health Benefits: Contains natural compounds that support overall wellness." | `description`, all 13 products | **REMOVE/REWRITE — highest priority** | A vague wellness/health claim on a food product, applied identically regardless of species, with no substantiation anywhere in the database. This is exactly the pattern food-safety and advertising rules (India's FSSAI food-claim restrictions, and general consumer-protection principles) exist to catch. |
| 3 | "Quality: Sourced from trusted regions known for premium [name]." | `description`, all 13 products | **REMOVE/REWRITE** | "Trusted regions" names no region and is unverifiable; "premium" is an unsupported quality superlative applied uniformly to all 13 products regardless of any real quality differentiation. |

**Proposed safe replacement** (culinary/sensory, no origin or health claim,
same for the template but naturally reads per-product since it only
references what's already true — the name and category):

> `- Aromatic Profile: [Name] is known for its distinctive aroma and flavor.`
> `- Culinary Uses: Widely used in various dishes and beverages.`
> `- In the Kitchen: A pantry staple valued for the depth it adds to everyday cooking.`

This keeps the two lines that are genuinely safe (aroma is a sensory fact
observable by the customer; "widely used in various dishes" is true and
unfalsifiable), drops the three risky lines entirely, and replaces them
with one honest, generic-but-true culinary closer rather than another
unverified claim. **This is a database content edit, not a code change —
explicitly not made in this pass, per instruction.**

---

## 2. Hardcoded UI copy

### 2.1 Footer (`src/components/Footer.tsx:31`) — appears on every page

> "Your trusted source for premium quality spices, dry fruits, and seeds.
> We bring you the finest products sourced from the best regions, ensuring
> purity and freshness in every pack."

**Classification: REMOVE/REWRITE — high priority (site-wide visibility).**
Stacks five separate unverifiable claims in one sentence: "trusted source,"
"premium quality," "finest products," "sourced from the best regions"
(unnamed origin claim), "ensuring purity" (absolute purity guarantee).

**Safe replacement:**
> "Whole spices, dry fruits, and seeds for everyday Indian cooking, packed
> to order."

Neutral, factual, makes no origin, purity, or superlative-quality claim.

### 2.2 Homepage hero paragraph (`src/pages/HomePage.tsx`, hero section)

> "Every batch is sourced with care, cleaned by hand, and packed to honour
> the taste nature intended, with no fillers, no shortcuts, no compromise."

**Classification: NEEDS EVIDENCE.** "Cleaned by hand" and "sourced with
care" are process claims a real small operation could plausibly stand
behind — but need a yes/no from whoever runs sourcing/packing before
staying as-is. "No fillers... no compromise" is a defensible absence-claim
if true.

**Safe replacement (if hand-cleaning can't be confirmed today):**
> "Every pack is prepared with care — no fillers, nothing hidden, just the
> spice."

### 2.3 Homepage "Pillars" (`src/pages/HomePage.tsx`, `PILLARS` array)

| Pillar | Current copy | Classification | Safe replacement |
|---|---|---|---|
| Purity | "No fillers, no colouring, nothing hidden. Every batch is exactly what it says on the label." | **NEEDS EVIDENCE** (confirm no-filler/no-colouring is true for all products) | "What's on the label is what's in the jar — no fillers, no colouring added." |
| Elegance | "Small-batch sourcing and careful hand-cleaning, so nothing but the spice ever reaches your kitchen." | **NEEDS EVIDENCE** ("small-batch," "hand-cleaning") | "Carefully cleaned and prepared, so nothing but the spice reaches your kitchen." |
| Taste | "Sun-ripened and freshly ground close to harvest, so the aroma survives the journey to your pantry." | **NEEDS EVIDENCE** (harvest-timing specifics) | "Ground to preserve the aroma, so it's just as vivid when it reaches your pantry." |
| Richness | "The quality of a private spice merchant, brought to the everyday kitchen without the special-occasion price tag." | **SAFE** — comparative/aspirational marketing language, no factual or health claim, nothing to verify | Keep as-is |

### 2.4 Hero trust badge (`src/pages/HomePage.tsx`)

> "Hand-Selected / Small-Batch / Unadulterated"

**Classification: NEEDS EVIDENCE / BUSINESS INPUT REQUIRED.** This is the
single most prominent claim on the entire site — the first thing a visitor
reads, styled as a certification-like badge. "Unadulterated" in particular
is an absolute purity claim sitting directly above a section (the
shopkeeper's notebook, further down the same page) that teaches customers
how commonly spices ARE adulterated in the market — if this badge's claim
about Spicyfied's own product isn't backed by an actual QA/testing process,
the juxtaposition is a real reputational risk, not just a wording nitpick.

**Safe replacement (if none of the three words can be confirmed today):**
> "Whole Spices · Dry Fruits · Seeds" (a neutral category statement instead
> of a badge of claims), or, if a lighter marketing tone is wanted:
> "Whole. Fresh. Simple." (sensory/descriptive, no absolute claims).

### 2.5 "Look closer" Cinnamon caption (`src/pages/HomePage.tsx` and the
unused `src/components/SpiceReveal.tsx`)

> "True Ceylon quills, thin bark rolled by hand into paper-fine layers."

**Classification: BUSINESS INPUT REQUIRED — highest priority for this
category.** This is a specific botanical-species claim (true Ceylon
cinnamon vs. the far more common Cassia) plus a hand-rolled process claim,
sitting on the same page as a section that explicitly teaches customers
the Ceylon-vs-Cassia test. If this cinnamon is not verified true Ceylon,
this is the highest-visibility, highest-specificity false claim on the
site — worse than a generic "premium quality" line because it's concrete
and falsifiable by the exact test taught two sections later.

**Safe replacement (if species/process can't be confirmed today):**
> "Thin, tightly rolled quills with a delicate, papery bark."

Purely visual/sensory, describes only what's photographed, makes no
species or process claim. (Note: this exact string also exists in
`src/components/SpiceReveal.tsx` line 33, a component that is not
currently imported or rendered anywhere — dead code, not a live-site risk
today, but should be fixed in the same pass if that component is ever
wired back in, to avoid reintroducing this exact claim later.)

### 2.6 Shop page hero banner (`src/pages/ShopPage.tsx`)

> "Hand-cleaned and packed to protect their aroma — nothing added, nothing
> hidden, ready for everyday cooking." (and the shorter per-category
> variant, same wording)

**Classification: NEEDS EVIDENCE** ("hand-cleaned").

**Safe replacement:**
> "Packed to protect their aroma — nothing added, nothing hidden, ready
> for everyday cooking."

### 2.7 Contact page (`src/pages/ContactPage.tsx`)

> "Have a question or want to learn more about our premium spices?"

**Classification: SAFE / low priority.** A generic marketing adjective in
a low-visibility, non-transactional context (not a purity, origin, or
health claim). Optional tightening to "our spices" if a stricter house
style is wanted, but not a blocking issue.

### 2.8 "Bestseller" badge (`ProductCard.tsx`, `ProductDetailPage.tsx`,
`HomePage.tsx` — all driven by the `is_featured` database flag)

**Classification: BUSINESS INPUT REQUIRED.** This is a customer-behaviour
claim ("this is what other customers buy most") — but the underlying
database field is a manually-set `is_featured` flag, not a computed
best-seller-by-sales-volume metric (confirmed by reading
`src/lib/products.ts` — there is no sales-aggregation query anywhere in the
codebase). If `is_featured` is set by real sales data, the label is
accurate and **SAFE**. If it's a merchandising/curation choice unrelated to
actual sales, the label itself is the unverified claim, independent of any
copy on the page — the fix would be a UI-label change (e.g., "Featured" or
"Shop's Pick" instead of "Bestseller"), not a content edit. This needs a
direct answer from whoever manages the catalogue before either classifying
this as resolved or scheduling a code-level relabel.

### 2.9 Already fixed, for reference — not re-flagged

"Everyday Essentials · the kitchen staples people reorder most" (a
reorder/customer-behaviour claim) was already identified and corrected in
an earlier pass this session to "pantry staples for daily cooking" —
confirmed still in that corrected state; not re-flagged here.

### 2.10 Legal pages, Contact form, Bulk Pricing note

Checked `PrivacyPolicyPage.tsx`, `TermsConditionsPage.tsx`,
`ShippingDeliveryPage.tsx`, `RefundCancellationPage.tsx`,
`BulkPricingNote.tsx` — all "guarantee" mentions found are standard
disclaiming legal language ("we cannot guarantee X"), not marketing
claims. **SAFE**, nothing to change.

---

## 3. Full results table

| Phrase | Exact location | Classification | Launch-blocking? |
|---|---|---|---|
| "Origin: Harvested and processed using traditional methods." | DB `products.description`, all 13 products | REMOVE/REWRITE | **Yes** |
| "Health Benefits: Contains natural compounds that support overall wellness." | DB `products.description`, all 13 products | REMOVE/REWRITE | **Yes — highest priority** |
| "Quality: Sourced from trusted regions known for premium [name]." | DB `products.description`, all 13 products | REMOVE/REWRITE | **Yes** |
| "Your trusted source for premium quality... sourced from the best regions, ensuring purity and freshness" | `Footer.tsx:31` (every page) | REMOVE/REWRITE | **Yes (site-wide)** |
| "Hand-Selected / Small-Batch / Unadulterated" | `HomePage.tsx` hero badge | NEEDS EVIDENCE / BUSINESS INPUT | Yes, unless confirmed true |
| "True Ceylon quills, thin bark rolled by hand into paper-fine layers." | `HomePage.tsx` (live) + `SpiceReveal.tsx` (dead code) | BUSINESS INPUT REQUIRED | Yes, unless confirmed true |
| "Every batch is sourced with care, cleaned by hand... no compromise." | `HomePage.tsx` hero paragraph | NEEDS EVIDENCE | Non-blocking, but should be confirmed soon |
| Pillar: "No fillers, no colouring, nothing hidden..." | `HomePage.tsx` `PILLARS` | NEEDS EVIDENCE | Non-blocking |
| Pillar: "Small-batch sourcing and careful hand-cleaning..." | `HomePage.tsx` `PILLARS` | NEEDS EVIDENCE | Non-blocking |
| Pillar: "Sun-ripened and freshly ground close to harvest..." | `HomePage.tsx` `PILLARS` | NEEDS EVIDENCE | Non-blocking |
| Pillar: "The quality of a private spice merchant..." | `HomePage.tsx` `PILLARS` | SAFE | No |
| "Hand-cleaned and packed to protect their aroma..." | `ShopPage.tsx` hero banner | NEEDS EVIDENCE | Non-blocking |
| "our premium spices" | `ContactPage.tsx` | SAFE (low priority) | No |
| "Bestseller" badge | `ProductCard.tsx`, `ProductDetailPage.tsx`, `HomePage.tsx` (driven by `is_featured`) | BUSINESS INPUT REQUIRED | Non-blocking, but worth resolving |
| Legal-page "guarantee" disclaimers | Privacy/Terms/Shipping/Refund pages | SAFE | No |
| "Everyday Essentials · pantry staples for daily cooking" | `HomePage.tsx` | SAFE (already fixed earlier this session) | No |

---

## 4. Launch blockers (content, not code)

1. **The templated product description** (§1, all 13 live products) —
   the single highest-priority item. Every product page currently carries
   an unverified health claim and an unverified origin/quality claim.
2. **The footer's stacked trust/origin/purity claims** (§2.1) — site-wide.
3. **The homepage hero badge's "Unadulterated" claim** and **the "True
   Ceylon / hand-rolled" cinnamon caption** (§2.4, §2.5) — both need a
   direct yes/no from whoever runs sourcing before they can be called safe
   or need rewriting; both sit in high-visibility spots on the homepage.

None of these require a code change to fix in the sense of new features —
items 1 and 2 are content edits (database row updates / a copy change in
`Footer.tsx`); items 3 need a business decision first, then either "leave
as-is, now confirmed true" or a copy swap. No code was changed in this
pass, per instruction.

## 5. Non-blocking items

- The three homepage "Pillars" needing evidence (§2.3) — lower visibility
  than the hero badge, worth confirming but not urgent to block on.
- Shop page's "Hand-cleaned" line (§2.6).
- "Bestseller" label accuracy (§2.8) — worth resolving, but not a
  false-claim risk if `is_featured` genuinely does reflect real sales
  curation; needs a business answer either way.
- Contact page's "premium spices" (§2.7) — optional tightening only.
- `SpiceReveal.tsx` dead code (§2.5) — cleanup candidate, not a live risk.

---

**No database, code, or content was changed in this pass.** Awaiting your
decision on which items to fix now (and how — content edit vs. business
confirmation vs. code-level relabeling) before any implementation.
