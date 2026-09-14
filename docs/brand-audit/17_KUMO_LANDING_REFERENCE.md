# 17. Kumo / Spice-Site Landing Reference — Screenshot-Based (Homepage Only)

Status: **Reference document. No code changed.**
Scope: Homepage only — hero, product/ingredient presentation, section rhythm, motion,
green/cream usage, mobile implications. Explicitly excludes checkout, auth, cart,
payment, Supabase, migrations, order logic, and product-card buying logic.

This replaces the earlier version of doc 17. The previous version was written
without being able to view the actual Dribbble shot (network egress to
`dribbble.com` was blocked). This version is based on three real screenshots
provided directly in chat, described exactly as seen below — it is a pixel-level
comparison this time, not a genre-pattern guess.

---

## 0. Source materials (what was actually looked at)

**Screenshot 1 — "WildCrumb," static hero ("The Difference"):**
A cookie brand landing page. Sky-blue background with painterly clouds, rocky
cliff outcrops at left/right edges, and a strip of yellow wildflowers along the
bottom. A single large chocolate-chip cookie floats center-stage with soft
drop shadow. Four dark rounded-pill labels are placed around the cookie, each
paired with a small dark circular icon badge, pointing out specific product
attributes: "70% Single-Origin Dark," "Organic Grass-fed Butter," "Organic
Maple & Coconut," "Light, Aerated Snap." Navigation is a dark, rounded floating
pill bar, horizontally centered, containing "Shop" (with a small grid icon),
"Cookies," "About Us," "Ingredients." Logo top-left in a rounded hand-lettered
script ("WildCrumb"). Top-right: social icons in a dark pill, then a separate
dark cart-icon button. Huge script/rounded display headline "The Difference"
anchors the bottom of the frame, white, oversized, overlapping the flower strip.

**Screenshot 2 — "WildCrumb," motion hero ("Taste the Sky"):**
Same brand, a different hero state — this one is clearly a **video/animated
hero**, evidenced by a visible video scrubber bar (magenta progress fill),
pause and mute controls bottom-left. Sky and clouds again, cookie floating
center, oversized rounded headline "Taste the Sky." Same floating pill nav
pattern as screenshot 1. This confirms the hero is built as an autoplaying
motion/video sequence with multiple headline "chapters," not a static image.

**Screenshot 3 — "Spices Retail Shop Website" (Dribbble concept, different
designer, not Kumo):**
A cream-background presentation collage showing multiple device mockups of an
Indian-spice e-commerce concept called "Spice's." Visible: a hero panel reading
"Authentic Indian Spices, Reimagined Digitally" over a photo of a decorative
brass thali of assorted whole spices; a shop page with category chips ("Chilli
& Pepper," "Seeds & Herbs," "Wellness Spices," "Spice Blends & Mixes," "Rare &
Exotic") above a product grid (product photo, name, short descriptor, price,
"Add to Basket" button); a "Why Choose Us" row with three icon+text points
("Sourced from Indian farms," "Traditional processing," and a third partially
obscured point); an "About Us" page on a tablet mockup showing rows of labeled
spice jars and a paragraph about "the soul of Indian kitchens." Palette is warm
terracotta/orange/brown on cream, with a serif display headline and a script
accent word ("Digitally" in orange script).

**What was not seen:** scroll behavior beyond these frames, the full page
below the hero on either reference, interaction states (hover/tap) on the
callout labels, or how WildCrumb's nav/hero adapts at mobile width. Nothing
below is presented as fact about content this document didn't actually see.

---

## 1. Current Spicyfied homepage, for comparison (`src/pages/HomePage.tsx`)

- **Hero:** dark `ink`→`#223822` gradient section. A small bordered badge strip
  ("Hand-Selected / Small-Batch / Unadulterated"). Serif headline "Grown in
  purity, refined by hand." Body copy, one saffron CTA button ("Explore the
  Collection"). A single isolated product photo (cinnamon) on the right with a
  soft blurred glow behind it — static, no motion, no callouts. Below the fold
  line, a four-item pillar row (Purity / Elegance / Taste / Richness), each with
  a small icon and one line of copy.
- **"Look closer" section:** cream background, three product cards (Cardamom,
  Cinnamon, Clove), each an isolated product photo plus one tactile caption
  ("Hand-sorted pods, plump enough to snap between two fingers"), clickable to
  the PDP.
- **"Shopkeeper's notebook" section:** cream/white cards, four items (Cinnamon,
  Cardamom, Clove, Pepper), each pairing a photo with a real, checkable
  adulteration test ("Squeeze a pod... fresh snaps open and releases a sharp
  camphor scent").
- **Category and product rail sections:** `CategoryCard` grid, then bestseller /
  everyday-essentials / healthy-snacking `ProductCard` rows.
- **Motion in use today:** `Reveal` (one-shot scroll fade/rise, no loop),
  `SpiceDrift` (slow ambient hero-background drift). No video, no cinematic
  loop, no floating-callout annotation pattern anywhere yet.

---

## 2. What's visually transferable from WildCrumb (screenshots 1–2)

1. **Annotated hero callouts around the product.** The structural idea — small
   labelled tags placed near a floating hero product, each naming one concrete,
   true attribute — is directly usable. Spicyfied already writes exactly this
   kind of true, checkable detail (the shopkeeper's-notebook copy). Today that
   copy lives in a card grid further down the page; WildCrumb's pattern shows
   it could instead sit as 3–4 small tags directly on the hero product itself
   (e.g. "True Ceylon, not Cassia," "Ground within days of hand-rolling" —
   **only if verified true**, not invented for effect).
2. **Restrained idle motion on the hero product.** A cookie that floats/bobs
   very gently, callout tags that stagger in on load — this is a much lighter
   motion budget than a full animation reel, and is consistent with
   Spicyfied's existing "motion with a job" standard (`Reveal`, `SpiceDrift`).
   A slow float or parallax drift on the hero spice photo is a fair, small
   extension of what's already there.
3. **Floating pill-style navigation** is a legitimate, modern layout idea —
   worth *noting*, but it's a bigger structural change to the header than a
   homepage-only pass should include (it would touch the shared `Header`
   component used on every page, not just the homepage). Flagging as
   out-of-scope for this document rather than folding it into either concept.
4. **Oversized display-type section breaks** ("The Difference," "Taste the
   Sky" as huge standalone headline moments) — the *rhythm* idea (one big,
   confident type statement as a section's whole opening beat) is
   transferable; the specific rounded/script typeface and playful tone is not
   (see §3).

## 3. What must NOT be copied from WildCrumb

- **The rounded, hand-lettered script logotype and playful headline voice.**
  This is core to a cookie brand's tone; Spicyfied's identity is the refined
  Fraunces serif already in place. Do not introduce a script/hand-drawn face
  anywhere.
- **The sky/clouds/meadow environmental backdrop, as a literal scene.** Two
  separate problems: (a) it doesn't fit Spicyfied's cream/ink/green system —
  swapping it for a "spice farm at golden hour" equivalent would just trade one
  wrong palette for another; (b) more importantly, placing the product inside
  an idyllic outdoor/farm-like environment visually *implies* a specific origin
  or growing story. Spicyfied has no farm, origin, or sourcing content that has
  been verified for use, and the brand rule against fake provenance applies to
  imagery just as much as to copy. **Any environmental backdrop behind the
  hero product must be abstract/textural (light, shadow, blur, paper, cloth,
  wood-grain), never a literal farm/field/orchard scene**, unless Spicyfied
  later has a real, verified sourcing story to tell.
- **The full autoplay video hero with playback scrubber/pause/mute controls**
  (screenshot 2). This is the "portfolio animation concept instead of a
  working e-commerce site" the brief explicitly warns against. A production
  spice shop's homepage should not require the customer to watch or manage a
  video before reaching the shop. If any motion is added it should be a short,
  silent, non-blocking loop or a scroll-triggered reveal — never a hero that
  behaves like a video player.
- **Colour palette** (sky blue, warm yellow flowers). Brand green stays the
  base; nothing here justifies introducing blue or yellow as structural colour.

## 4. What's visually transferable from the "Spices Retail Shop" reference

Very little that Spicyfied doesn't already do at least as well:

- **Category chip row above a product grid** — Spicyfied already has an
  equivalent (the category section / `CategoryCard` grid). Nothing new to add
  here beyond what's already built.
- **"Why choose us" icon-row with short trust copy** — Spicyfied's existing
  four-item pillar row already does this job, and does it without the
  sourcing-claim risk this reference carries (see §5).

## 5. What must NOT be copied from the "Spices Retail Shop" reference

This screenshot is close to a checklist of the generic-Indian-spice clichés
Spicyfied has deliberately moved away from:

- **"Authentic Indian Spices, Reimagined Digitally"** headline framing and the
  decorative brass-thali-of-spices hero photography. This is the exact generic
  positioning Spicyfied's brand strategy rejects.
- **"Sourced from Indian farms" / "Traditional processing, stone-ground,
  sun-dried"** trust copy — these are precisely the kind of sourcing/process
  claims Spicyfied cannot make without verified, real sourcing data. Do not
  adapt even the phrasing of these lines.
- **Warm terracotta/orange/brown as the dominant palette.** Spicyfied's base
  stays cream/ink/brand-green with saffron/ochre as accents, not the reverse.
- **Script accent word inside a headline** ("Reimagined **Digitally**") —
  stylistically at odds with Spicyfied's current restrained serif system.
- Generic product-card treatment is fine as a *pattern* (photo, name, price,
  primary action) but nothing about this specific reference's execution is
  worth studying further — it's a standard template, not a differentiator.

## 6. Focused notes on the axes requested

- **Hero composition:** Keep the current single-product, isolated-photo
  approach; the WildCrumb lesson is to *annotate* it (true attribute tags) and
  give it a very small amount of idle motion, not to rebuild it around a
  scene or video.
- **Product/ingredient placement:** Product stays literally central, as it is
  today. Any callout tags should point to specific, visible, true details of
  that exact product photo (a crack, a curl, an oil sheen) — same discipline
  the shopkeeper's-notebook copy already uses.
- **Use of green and cream:** Unaffected structurally by either reference —
  neither uses green or cream as its base. This is a case where Spicyfied's
  existing palette should hold entirely unchanged; nothing here argues for
  adjusting it.
- **Motion/interaction ideas:** Idle float/parallax on the hero product,
  staggered reveal of a small number of callout tags. No video, no scroll-
  hijacking, no cursor-particle effects.
- **Spacing:** WildCrumb's hero is sparse — one product, a handful of short
  labels, a huge type moment, lots of negative space. Spicyfied's current hero
  is comparatively denser (badge strip + headline + paragraph + CTA + pillar
  row all in the first screen). The transferable lesson is to let the hero
  breathe more and push secondary content (the pillar row) slightly further
  down, not to add more elements to it.
- **Product theatre:** WildCrumb's single hero product with light/shadow and
  callouts is a good, achievable "theatre" model for one product at a time —
  well matched to Spicyfied's existing one-product-per-hero-slot approach.
- **Flavour/ingredient storytelling:** The callout-tag idea is the main lever
  here, gated entirely on using only real, already-known product facts (see
  §2.1) — this must not become a place where new, invented sensory claims
  appear.
- **Section rhythm:** Borrow the "one big confident type statement opens a
  section" beat for a section transition (this is already close to what
  "Look closer" and "shopkeeper's notebook" do with their eyebrow + headline
  pairing — the opportunity is scale/confidence, not a new pattern).
- **Mobile implications:** Neither reference was seen at mobile width. Floating
  callout tags positioned freely around a product (as in screenshot 1) are a
  desktop-only layout technique — on narrow screens they would need to
  collapse into a simple stacked list below the product image, not be
  scattered and free-floating. Any implementation must be designed
  mobile-first as a fallback list, with the "floating around the product"
  treatment reserved for wider breakpoints only.

---

## 7. Concept A — Safe homepage improvement (current assets only)

**Visual changes:**
Give the existing hero more breathing room (reduce competing elements in the
first screen by nudging the pillar row down slightly), enlarge the hero product
photo, add a very subtle idle float or scroll-parallax to it, and add 1–2 true
attribute tags near the product reusing copy that already exists in the
shopkeeper's-notebook section (e.g. a tag reading "True Ceylon — thin, paper-
rolled bark," reusing the existing, already-approved line). No new photography,
no new copy claims, no new sections.

- **Business purpose:** Increases perceived product quality and specificity at
  the exact moment a visitor forms their first impression, without any new
  content risk.
- **Customer psychology:** Named, specific, true details ("paper-rolled bark")
  read as expertise and reduce skepticism faster than generic superlative copy
  does — the same effect the notebook section already achieves, just moved
  earlier in the page.
- **Files likely touched later:** `src/pages/HomePage.tsx` only (spacing,
  hero image sizing, 1–2 small tag elements, possibly `Reveal`/`SpiceDrift`
  motion tuning). No new components required.
- **Risks:** Low. Mostly layout/spacing tuning of a page already reviewed and
  refined twice this project. Slight risk of the hero feeling cluttered if too
  many tags are added — mitigated by capping at 1–2 tags.
- **Must not change:** Palette, typography system, CTA copy/behaviour, product
  data, any claim not already written and approved elsewhere on the site.

## 8. Concept B — Kumo-inspired homepage direction (data/asset-gated)

**Visual changes:**
A hero built around a larger, more theatrical single-product presentation with
3–4 floating attribute-callout tags (WildCrumb-style), a restrained idle
motion on the product (float or slow parallax, not video), and a soft
non-literal ambient backdrop (light/blur/texture, never a farm or field scene).
Section rhythm elsewhere on the page adopts one or two "big type moment"
transitions between sections, borrowing WildCrumb's confidence without its
tone or palette.

- **Business purpose:** A more distinctive, premium-feeling homepage that
  differentiates Spicyfied from generic spice-shop templates (like screenshot
  3) — supports the existing "private spice merchant" positioning more
  visually, not just in copy.
- **Customer psychology:** Specific, tag-annotated detail plus more generous
  space around the product increases perceived craft and price-justification
  — the same "look closer, this is worth it" effect the current homepage
  already aims for, executed more confidently.
- **Prerequisites — new assets/data required before this can be scoped for
  implementation:**
  1. A short list of additional true, verified per-product attributes suitable
     as short tag copy (2–4 per hero product) — beyond what's already written
     in the notebook section, if more variety is wanted across different
     products used in the hero rotation.
  2. Confirmation of whether the hero should rotate between more than one
     product; today only 4 isolated product photos exist
     (`public/images/spice-scroll/`), which limits how much rotation is
     credible.
  3. A design decision on the abstract backdrop treatment (texture, light,
     paper) that keeps it *non-literal* — this needs a visual pass, not new
     data, but should be resolved before implementation to avoid drifting
     toward a "farm scene" by accident.
  4. A mobile-specific layout for the callout tags (stacked list, see §6)
     designed alongside the desktop version, not bolted on after.
- **Files likely touched later:** `src/pages/HomePage.tsx`, possibly a new
  small presentational component for the callout-tag pattern (e.g.
  `HeroAttributeTag.tsx`) and `src/lib/spiceHeroPhotos.ts` if more hero photos
  are added. Still homepage-only — no shared `Header`, no shop/PDP/cart/
  checkout/auth files.
- **Risks:**
  - Highest risk is scope creep toward the "portfolio animation" the brief
    explicitly rules out — needs a firm rule that motion stays subtle and the
    page remains fully usable/crawlable with motion off.
  - Risk of the ambient backdrop drifting into implied-origin territory if not
    deliberately kept abstract (see §3).
  - More visual complexity in the hero raises the mobile-design burden (see
    §6) — must not ship a desktop-only-considered layout.
  - Thin content today (only 4 hero product photos) limits how ambitious the
    "theatre" can credibly be without feeling repetitive.
- **Must not change:** Brand green as base, cream as ground colour, no darker
  overall site, no farm/origin/sourcing/certification claims (text or
  implied-by-imagery), no fake reviews or urgency, no script/playful
  typography, no video-player hero, no changes anywhere outside the homepage
  file(s) listed above.

---

## 9. Constraints reconfirmed (unchanged by this document)

- Brand green remains the base; the site does not get darker overall.
- No fake provenance, sourcing, certification, or testing claims — in copy or
  in imagery (a literal farm/field backdrop counts as an implied claim).
- No fake reviews. No fake urgency.
- No generic Indian clichés (terracotta-dominant palette, "authentic spices"
  framing, spice-bowl-in-hands photography, script accent words).
- Spicyfied does not become a matcha/Japanese-tea brand, and this does not
  become a portfolio-animation piece instead of a working e-commerce homepage.
- Checkout, auth, cart, payment, Supabase, migrations, order logic, and
  product-card buying logic are untouched by anything in this document.
- **No code has been changed as part of this document.** Both concepts are
  proposals only, pending explicit approval before any implementation pass.
