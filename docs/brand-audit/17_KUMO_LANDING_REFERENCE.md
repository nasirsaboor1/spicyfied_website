# 17. Kumo Landing Reference — Design-Principle Extraction (Homepage, Concept Only)

Status: **Reference document. No code changed.**
Scope: Homepage hero, "Look closer" section, and a possible new flavour/use discovery section only.

**Non-pixel-level reference:** the source Dribbble shot could not be opened
(network egress to `dribbble.com` is blocked in this environment — see §0). This
document extracts and applies the design *principles* you specified; it is not a
visual audit of the actual shot.

---

## 0. Access disclosure (read this first)

This session's network egress is restricted to an allowlist, and `dribbble.com` is
blocked by the environment's egress proxy — both `WebFetch` and a direct `curl` to
the shot URL were attempted and both were rejected at the proxy level
(`EGRESS_BLOCKED` / `CONNECT tunnel failed, 403`). I could not load or view the
actual shot:

> https://dribbble.com/shots/26971799-Kumo-Interactive-Matcha-Tea-Landing-Page-UI-UX

Everything below is therefore **not** a pixel-level review of that specific shot. It
is built from two things instead:

1. The six transferable principles you already named in your request (sensory
   presentation, product-as-hero, ingredient/flavour cues, flavour-explaining
   interaction, attention-guiding motion, desirability-before-selling) — I've
   treated these as the brief and worked out what each one would concretely mean
   for Spicyfied.
2. General, well-documented conventions of this specific genre of landing page
   (premium matcha/tea/coffee DTC sites on Dribbble commonly use: a large
   soft-lit hero product shot with a warm ambient glow behind it; small
   ingredient/flavour-note chips or icons orbiting or flanking the hero product;
   a scroll- or hover-triggered reveal of ingredients "settling" around or into
   the product; tabbed or swipeable flavour/variant switching with the hero image
   and copy changing to match; and motion that is triggered by scroll position or
   cursor proximity rather than looping on its own). These are genre patterns,
   not confirmed details of shot #26971799.

If exact fidelity to this specific Kumo shot matters, the next step would be for
you to paste a screenshot or describe what you see — I'll redo this document
against the real thing rather than the genre pattern. I'm flagging this plainly
rather than presenting genre-pattern guesses as if I'd inspected the actual shot.

---

## 1. What to take from Kumo-style references (principle by principle)

### 1. Sensory product presentation
**Take:** The product itself is lit and shot like something you'd want to put in
your mouth — warm, close, textural. Copy and layout support that sense rather than
compete with it (short lines, generous white space, no dense paragraph blocks near
the hero image).
**Spicyfied already has the ingredients for this**: `HomePage.tsx`'s hero already
uses a single isolated product photo (`SPICE_HERO_PHOTOS.cinnamon`) with a soft
ambient glow behind it (`bg-saffron-light/10 blur-3xl`). The "Look closer" section
already does isolated product photography with tactile captions ("Hand-sorted
pods, plump enough to snap between two fingers"). The sensory language is present
in copy; what Kumo-style references usually add on top is scale and quantity of
imagery — one photo per section, larger, with more breathing room, rather than a
photo shrunk to fit next to text.

### 2. Product as the central hero object
**Take:** The product is the largest, most detailed thing on the screen — not a
lifestyle scene, not a model, not a plate. Layout is built around it.
**Current state:** The Spicyfied hero is already product-forward (a single spice
photo on a dark ground, no lifestyle photography, no people). This principle is
mostly already applied; the opportunity is to make the product photo larger and
more central at wider breakpoints, and to remove any remaining competing visual
weight (the pillar row currently sits directly under the hero at full width —
Kumo-style references would either tuck that under a fold-scroll cue or shrink
its visual weight relative to the product).

### 3. Ingredients/flavour/use cues around the product
**Take:** Small labelled details placed near the product — texture, aroma notes,
a callout line pointing to a specific feature (a crack in a pod, an oil sheen on
a clove) — do more to sell "this is real and specific" than paragraph copy does.
**Constraint check:** This must stay honest. Spicyfied does not have sourcing,
farm, or batch-testing data to attach to these callouts (flagged again in
14/16 and reconfirmed below). What Spicyfied *does* have is exactly this kind of
observable, verifiable detail already written into the "shopkeeper's notebook"
section — "Ceylon is thin and rolls into multiple paper layers," "fresh snaps
open and releases a sharp camphor scent." These are already Kumo-appropriate
callouts; they're just laid out as a card grid lower on the page rather than as
inline annotations on the hero product itself.

### 4. Interaction that helps customers understand flavour
**Take:** In Kumo-genre references this is usually a hover/tap-driven micro-state
— pointing at or selecting an ingredient changes a small panel of flavour notes,
or switching a variant tab swaps the hero photo and a short flavour description.
**Constraint check — real data required.** Spicyfied's `Product` type
(`src/types/index.ts`) has `name`, `description`, `health_benefits`, `category` —
no flavour-note field, no "pairs well with," no heat/intensity scale, no aroma
descriptor list. Any flavour-switcher interaction needs this content to exist and
be true before it can be built. This is the single biggest gap between "what
Kumo-style pages do" and "what Spicyfied can honestly do today."

### 5. Motion that guides attention, not decorative animation
**Take:** Reveal-on-scroll for one section at a time, a subtle parallax on the
hero product as the page scrolls, a hover state that responds to the user's
cursor — motion with a job, not ambient looping animation.
**Current state:** Spicyfied already uses this restrained model. `Reveal.tsx` is
a one-shot scroll-triggered fade/rise, already used throughout `HomePage.tsx`
("Look closer," "shopkeeper's notebook"). `SpiceDrift.tsx` provides a slow ambient
hero-background motion, not attention-grabbing foreground animation. Doc 15's
review of the Taste Skill's GSAP scroll-hijack skill explicitly rejected
that heavier motion model for this exact reason. Nothing here needs to change in
kind — it needs, at most, more targeted use (e.g. a subtle parallax offset on the
hero product image as the user scrolls past the hero, using the existing `Reveal`
pattern's timing conventions, not a new animation system).

### 6. A landing page that makes food feel desirable before selling
**Take:** The hero's job is appetite, not conversion. The CTA is there but it's
not the loudest thing on screen; the product photography and the sensory copy are.
**Current state:** This is broadly true of the current homepage already (headline
"Grown in purity, refined by hand," CTA styled as a secondary-weight saffron
button, not a giant green block). The opportunity is mostly about visual scale and
spacing tightening described below, not a new philosophy.

---

## 2. What NOT to copy

- **Colour palette.** Matcha-reference greens, soft pastels, or any palette drift
  away from Spicyfied's established `brand-green` / `ink` / `cream` / `saffron`
  /`ochre` system. Brand green stays the base; nothing gets darker overall (per
  your explicit constraint — the current hero already sits on a dark `ink`
  background deliberately for contrast, and that should not be pushed darker or
  wider).
- **Typography.** Whatever display face or scale Kumo-style shots use. Spicyfied
  keeps its existing `font-serif` (Fraunces) headings and current type scale,
  per doc 15's finding that this Taste-Skill-genre convention (often a
  different serif or a heavier display face) directly conflicts with Spicyfied's
  established identity.
- **Matcha/tea product identity.** No matcha bowls, whisks, foam textures, or tea
  ceremony visual language. Spicyfied sells whole spices, dry fruits, and seeds —
  the sensory cues need to be specific to that category (bark, pods, oil sheen,
  crack/snap texture), not borrowed tea imagery.
- **Layout structure 1:1.** Do not clone Kumo's specific grid, section order, or
  component shapes. Only the six underlying principles transfer, not the
  composition itself.
- **Animation style directly.** No cursor-following particle fields, no
  scroll-hijacked pinned sequences, no looping decorative motion — all already
  ruled out for this project (doc 14, doc 15).
- **Any new claim.** No sourcing/farm/origin story, no "tested," "certified,"
  "lab-verified," or similar language, no fake reviews, no countdown/urgency
  devices, no "limited batch" language unless it is literally true and already
  approved copy. This applies even if a Kumo-style reference commonly uses this
  kind of copy for pacing/rhythm — the rhythm can be borrowed, the specific claims
  cannot.

---

## 3. How this could improve the homepage hero

Concrete, non-code proposals, scoped to what's honestly achievable:

- **Increase the product photo's visual dominance.** Grow the hero product image
  at `lg:` and `xl:` breakpoints beyond the current `lg:max-w-xs` cap, and let it
  slightly overlap the section boundary (bleed past the dark hero into the cream
  section below) rather than sitting fully contained inside the dark panel. This
  is layout/spacing only — no new asset required.
- **Add one texture-specific sensory line near the product**, reusing content
  that already exists in the "shopkeeper's notebook" copy (e.g. "paper-thin
  Ceylon layers" for cinnamon) as a small caption near the hero image, instead of
  only introducing it lower on the page. This repositions existing honest copy;
  it does not invent new claims.
- **Subtle scroll parallax on the hero product image** (product drifts slightly
  slower than the page as the user scrolls past the hero), using the existing
  `Reveal`/`SpiceDrift` motion vocabulary rather than a new library.
- **Tuck the four-pillar strip below a soft scroll cue** rather than having it
  compete with the hero at full visual weight immediately — let the hero product
  and headline hold the first screen, and treat the pillar row as the "you've
  scrolled, here's why us" beat.

## 4. How this could improve the "Look closer" section

- **Larger photos, fewer distractions.** The section is already principle-aligned
  (isolated product photography + tactile captions). The main lever is scale:
  let each of the three cards show a bigger, more detailed product photo (crop in
  tighter on texture) rather than a photo that has to share space with padding on
  all sides inside a bounded card frame.
- **A hover-reveal micro-detail**, using content already written in the
  "shopkeeper's notebook" tests below on the same page — e.g. hovering the
  cardamom card could surface "snaps open, sharp camphor scent" as a small
  overlay, rather than requiring the user to scroll further to find that same
  fact in the notebook section. This is a content-reuse and interaction change,
  not new data.
- **Do not** turn this into a flavour-pairing or recipe-matching feature here —
  that needs real data (see §6) and belongs in a dedicated new section instead.

## 5. How this could inspire a flavour/use discovery section

A genuinely new section — distinct from "Look closer" and the "shopkeeper's
notebook" — that answers "what do I actually use this for?" This is the part of
the Kumo-genre pattern most likely to require real work before it can ship:

- **Concept:** a compact per-product panel — select or hover a spice, see 2-4
  short, true "use" cues (e.g. "goes into: garam masala, mulled drinks, rice
  pudding" for cardamom) with small supporting imagery.
- **This needs real content that does not currently exist in the schema.**
  `Product.description` and `Product.health_benefits` are the only text fields
  today; neither is structured as flavour notes or use pairings. This section
  cannot honestly ship until that content is written and verified per product —
  fabricating plausible-sounding use pairings would violate the "no fake claims"
  constraint just as much as a fake certification would.
- **The existing Recipes page/imagery (48 dish photos in
  `public/images/recipes/`) is a possible honest data source** if recipes are
  already tagged with which spices they use — worth checking whether that mapping
  exists before writing new copy from scratch.

## 6. Which ideas need real product data / assets (do not build yet)

- Any flavour-note or "pairs with" interaction (§1.4, §5) — no such field exists
  on `Product` today.
- Any per-product "use case" panel beyond what's already true in existing
  description/health_benefits copy.
- Any expansion of hero/"Look closer" photography to products beyond the four
  images that currently exist (`hero-cardamom.webp`, `hero-cinnamon.webp`,
  `hero-clove.webp`, `pepper.jpg` in `public/images/spice-scroll/`) — a
  flavour-discovery section covering the full catalogue would need matching
  isolated product photography for every featured product, which does not
  exist yet.
- A tabbed/swipeable "variant switcher" hero (change hero photo + copy per
  product) — technically buildable with 4 products today, but thin with only
  four assets; more convincing once more product photography exists.

## 7. Which ideas can be implemented with current assets only

- Hero product image made larger/more dominant, with a subtle scroll parallax.
- A texture-specific sensory caption near the hero, reusing existing notebook
  copy.
- "Look closer" cards enlarged, with a hover-reveal of an already-written tactile
  detail from the shopkeeper's notebook section.
- Tucking the pillar strip under a scroll cue instead of full-weight immediately
  under the hero.
- All of the above use `cardamom`, `cinnamon`, `clove` (the three products
  already in "Look closer") plus `pepper` (already used in the notebook section)
  — no new photography, no new copy claims, no schema changes.

---

## 8. Concept A — Minimal safe refinement (existing assets only)

**What it is:** Apply the layout/motion lessons from §3–4 without adding any new
data, fields, or content. Everything in this concept uses copy and images that
already exist in the codebase today.

- Hero: enlarge the product photo at `lg`/`xl`, let it bleed slightly past the
  dark hero panel into the cream section below, add a subtle scroll parallax
  using the existing `Reveal`-style motion approach, add one short sensory
  caption drawn from existing notebook copy.
- Pillar strip: move it to read as a secondary "why us" beat under a soft scroll
  cue rather than competing with the hero at full weight.
- "Look closer": enlarge the three product photos, add a hover-reveal of one
  already-written tactile detail per card (reusing shopkeeper's-notebook lines
  rather than duplicating the whole notebook section's job).
- No new sections, no new products required, no schema or Supabase changes.
- **Risk: low.** Everything here is a spacing/scale/motion refinement of
  content that already exists and has already been approved in prior passes.

## 9. Concept B — Kumo-inspired interactive hero/flavour section (data-gated)

**What it is:** The more ambitious version — only viable once the data gap in
§6 is closed.

- A new "Discover by flavour" or "What goes with what" section: select a spice,
  see its real flavour notes and 2–4 true use cases, with supporting imagery.
  Possibly a tabbed hero variant switcher if enough hero-quality product photos
  exist by then.
- **Prerequisite before this concept can be scoped for implementation:**
  1. Flavour-note and use-case copy written and fact-checked per product (new
     content, not existing data — cannot be invented to fill the gap).
  2. Confirmation of whether Recipes-to-spice tagging already exists as reusable
     data, or whether that mapping needs to be created.
  3. Isolated product photography for every product this section would feature
     (today: only 4 exist).
- Until those three exist, Concept B is not implementable honestly — it would
  either need fabricated claims (explicitly against your constraints) or ship
  with only 3-4 products represented, which undercuts the "discovery" premise
  the section exists for.
- **Recommendation:** Treat Concept B as a future pass gated on a content/asset
  audit, not a design task. The design pattern itself (select-to-reveal panel,
  tabbed variant switch) is straightforward to build once the content exists;
  the blocker is entirely content, not layout or motion.

---

## 10. Constraints reconfirmed (unchanged by this document)

- Brand green remains the base; the site does not get darker overall.
- No fake origin, farm, batch, testing, certification, or purity claims.
- No fake reviews. No fake urgency.
- No generic Indian clichés.
- Checkout, auth, payment, shop, PDP, cart, Supabase functions, migrations, and
  order logic are untouched by anything in this document.
- **No code has been changed as part of this document.** Both concepts above are
  proposals only, pending your review and explicit approval before any
  implementation pass.
