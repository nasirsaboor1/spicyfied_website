# 16 — Taste Skill UI Review (Current Implementation)

Review of the live implementation, using Taste Skill's genre-agnostic hygiene lens (per doc 15's conclusion — visual-taste defaults from those skills are **not** applied; only universally-valid checks like rhythm consistency, contrast, and content honesty are) combined with this project's own brand audit.

**Source note:** `docs/brand-audit/03`, `04`, `09`, `11`, `12`, `13` are missing from disk (confirmed earlier this session — lost, never regenerated). This review is grounded instead in: the constraints restated directly in the request that commissioned it (green as brand base, purity/authenticity positioning, no fake reviews/urgency/sourcing/certifications, no generic clichés), this session's own prior, verified decisions (doc 14, and the Shop/ProductCard/PDP passes), and direct inspection of the current code on `claude/install-frontend-design-skill-316i16` @ `03cfd9b`. Nothing below is invented; every finding cites the actual file and line behavior observed.

No code was changed to produce this review.

---

## Homepage

### Visual rhythm / section spacing
- **[P2 — AESTHETIC]** Section-to-section vertical rhythm is inconsistent in the upper half of the page. Hero→Look Closer, Look Closer→Notebook, Category→Bestsellers, and Bestsellers→Everyday Essentials all land around 128–144px combined padding. But Notebook→Category compresses to 80px (Notebook section has no explicit bottom padding; Category's `py-20` top is the only contributor). The page reads as evenly paced until that one seam, which feels abrupt in comparison. (`src/pages/HomePage.tsx`, the section starting `The shopkeeper's notebook` has no `pb-*` class before the Category section's `py-20`.)
- **[P2 — AESTHETIC]** Four of five homepage sections (Look Closer, Notebook, Category, Bestsellers) announce themselves with the same eyebrow pattern (`text-saffron text-xs font-semibold tracking-[0.25em] uppercase`). Repeated back-to-back, it reads as a template rhythm rather than a designed one — the page never varies how it introduces a new idea.
- **[P2 — USABILITY]** The three product-rail sections (Bestsellers, Everyday Essentials, Healthy Snacking) use two different header treatments: Bestsellers/Healthy Snacking use eyebrow + `<h2>` + bottom border + "View All" on the right; Everyday Essentials uses a single uppercase line with an inline gray note and no eyebrow or border. Sitting one after another, the inconsistency is noticeable.

### Hero composition
- **[P1 — CONVERSION / AESTHETIC]** The hero's product image (`SPICE_HERO_PHOTOS.cinnamon`) is `hidden lg:flex` — it does not render at all below the `lg` breakpoint. On mobile and tablet, the hero is text + button only, which is a materially weaker first impression than desktop gets, on the devices most of your traffic likely uses.
- **[P2 — AESTHETIC]** The visible hero visual is a single isolated cinnamon stick floating against the plain dark-green background — accurate to the "look closer" honesty principle (it's a real product photo, not a lifestyle shot), but visually sparse at wide desktop widths where it sits alone in its column.

### Copy / trust
- **[P1 — TRUST / BRAND]** The Category section's subhead reads "Every jar tells the story of where it came from." No product currently has real story/sourcing data (`product_stories` table confirmed empty for all products, verified directly against the database earlier this session). This line implies a traceability narrative the current data doesn't back. Worth softening to something that doesn't promise a per-jar origin story until that data actually exists — this is exactly the class of claim the brand's own "no fake sourcing" rule is meant to catch, even though the phrasing is more atmospheric than a literal claim.
- **[P2 — AESTHETIC]** Several homepage sections still use unconverted default Tailwind grays (`text-gray-600`, `text-gray-400`) rather than the `charcoal` token used consistently on Shop/PDP/ProductCard (Notebook section body copy, Category subhead, Everyday Essentials inline note). Not a functional issue, just a small consistency gap between homepage and the more recently refined pages.

**No P0 issues found on the homepage.**

---

## Shop page

Already refined this session (price-bracket chips, brand-green active states, fine borders, honest empty state). No P0/P1 findings.

- **[P2 — USABILITY]** No sort control (price / newest) exists on the product grid — not a defect, an omission. Out of scope to add here (Shop page is excluded from this pass and from most recent approved passes' remaining backlog).

---

## Product cards

Already refined this session (Quick Add for single-variant, Choose Size for multi-variant, real badges only, no fake reviews/urgency). No P0/P1/P2 findings beyond what's already been corrected in prior passes.

---

## Product Detail Page (PDP)

Already refined this session (image `object-contain`, provenance line with honest fallback, reliable unit-price parsing, "Uses & Benefits" rename, reviews empty-state fix).

- **[P2 — AESTHETIC]** The "Uses & Benefits" and "Description" bodies render the raw `product.description`/`health_benefits` database fields as plain paragraphs, including their literal `- ` bullet-dash prefixes from the source data (confirmed format: `"- Aromatic Profile: ... \n- Origin: ..."`). It renders as readable but slightly raw text rather than a real bulleted list. Would need either a content-format change at the data layer or a lightweight parser — out of scope for a "no code changes to PDP" pass.

**No P0/P1 issues found.**

---

## Recipe page

- **[P2 — AESTHETIC]** Recipe cards use `hover:shadow-xl hover:shadow-ink/10` on hover, a heavier shadow treatment than the fine-border system now used on Shop/ProductCard (`border border-black/10 hover:border-brand-green/40`, no shadow). This page predates that later refinement and hasn't been brought in line with it yet.

**No P0/P1 issues found.**

---

## Contact page

Already refined this session (consolidated panel, quiet icon treatment, left-aligned smaller title). No new findings.

---

## Legal pages (Privacy, Terms, Shipping, Refund)

Already refined this session (narrow width, no floating card, smaller headings). No new findings.

---

## Footer

- **[P1 — TRUST / BRAND]** The footer's about-blurb reads "We bring you the finest products sourced from the best regions, ensuring purity and freshness in every pack." "Sourced from the best regions" is a sourcing claim not backed by any real per-product region data currently in the system (same gap as the homepage Category section finding above). This is pre-existing copy that predates this session's provenance-rule tightening, not something newly introduced. Flagging for a future, dedicated copy-review pass rather than fixing here — the current commissioned pass covers footer *transition* (visual), not footer *copy*.
- **[P1 — AESTHETIC]** The transition from the last homepage section (`bg-cream`) into the footer (`bg-ink`) is an abrupt hard cut with only a `mt-20` margin and no visual bridge — no gradient, no graduated tone step, nothing signals the shift from light to dark. This is squarely the "footer transition" item named for this pass.

---

## Mobile visual hierarchy (Header, site-wide)

- **[P2 — USABILITY]** The mobile nav menu (`Header.tsx` mobile panel) is a flat list: primary nav links, category sub-links, and account actions all share the same visual weight, separated only by a single `border-t` before Login/Sign Up. There's no grouping or hierarchy cue distinguishing "go somewhere" links from "manage your account" actions. Out of scope for this pass (Header isn't in the commissioned "improve" list), flagging for a future pass.

---

## Summary Table

| Area | Finding | Priority | Category |
|---|---|---|---|
| Homepage | Notebook→Category spacing breaks established 128px rhythm | P2 | AESTHETIC |
| Homepage | 4 of 5 sections use identical eyebrow treatment back-to-back | P2 | AESTHETIC |
| Homepage | Inconsistent header pattern across 3 product-rail sections | P2 | USABILITY |
| Homepage | Hero product image hidden below `lg` breakpoint | P1 | CONVERSION / AESTHETIC |
| Homepage | Hero visual feels sparse alone at wide desktop widths | P2 | AESTHETIC |
| Homepage | "Every jar tells the story of where it came from" implies unverified per-jar origin | P1 | TRUST / BRAND |
| Homepage | Unconverted gray tokens vs. established `charcoal` token | P2 | AESTHETIC |
| Shop | No sort control | P2 | USABILITY |
| Product cards | None | — | — |
| PDP | Raw bullet-dash text renders unstyled | P2 | AESTHETIC |
| Recipes | Heavier hover-shadow vs. fine-border system elsewhere | P2 | AESTHETIC |
| Contact | None | — | — |
| Legal pages | None | — | — |
| Footer | "Sourced from the best regions" unverified claim | P1 | TRUST / BRAND |
| Footer | Abrupt cream→ink cut into footer | P1 | AESTHETIC |
| Mobile (Header) | Flat, ungrouped mobile menu | P2 | USABILITY |

**No P0 (launch-blocking) issues found anywhere reviewed.** This reflects the site already having been through several controlled, evidence-based passes this session.

## What This Review Does Not Cover
Cart drawer, checkout flow, auth pages, and all business/order logic were explicitly out of scope and not reviewed here, per the standing rule not to touch that surface.

## Recommended Next Step
Per the accompanying request, the next controlled pass addresses only the homepage items above (rhythm, hero composition, Look Closer/Category polish, footer transition) — implemented separately after this review, without touching Shop/PDP/checkout/auth/business logic.
