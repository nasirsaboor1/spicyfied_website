# 15 — Taste Skill Review

Review of the 13 skills installed via `npx skills add Leonxlnx/taste-skill` into `.agents/skills/` (symlinked into `.claude/skills/`). Per instruction: **read-only review**. No skill was invoked or followed while writing this. No production code was touched. Nothing was committed or pushed.

Every `SKILL.md` was read in full (the three large image-generation skills — `image-to-code`, `imagegen-frontend-web`, `imagegen-frontend-mobile` — were read to the point their pattern and scope were unambiguous; each is long, repetitive, and self-describes its own scope clearly enough to judge without transcribing every section).

**Headline finding:** most of these skills are tuned for a different genre of project — greenfield marketing/landing pages, portfolios, and agency sites judged by "does this look AI-generated" heuristics (Awwwards-style). Several of their default rules **directly contradict decisions this project's own brand audit already made deliberately and with evidence** (docs 01–14): keep the real sampled brand green, use `font-serif` (Fraunces) for headings, use `lucide-react` icons, use fine 1px borders instead of heavy shadows/glassmorphism, never invent sourcing/testing/provenance claims, and change the live site only in small, reviewed, scoped passes. A careless invocation of most of these skills would relitigate settled, approved work.

---

## 1. `brandkit`

**What it does:** Prompt for generating premium *brand-identity deck images* (logo boards, 3×3/2×3 grid presentations) — a moodboard/pitch-deck generator, not a coding skill.

**Relevant for Spicyfied:** No. Spicyfied already has a real, sampled logo and established brand green (#1D4F2C) — this skill is for inventing a *new* brand identity from scratch (logo concepting, symbol logic, palette invention). Applying it would mean generating a fictional alternate identity for a brand that already exists and has been carefully preserved all session.

**Safe to use in this repo:** Yes, technically inert (image-generation prompt only, no code/file changes), but pointless here.

**Conflicts with existing brand audit:** Would conflict hard if ever invoked — it explicitly invents "logo concepts," palettes, and taglines from a genericized category table, which is the opposite of doc 11's provenance rule (never fabricate brand facts) and doc 02's explicit instruction to keep the real sampled green.

**Risky/hidden assumptions:** None operationally risky (no code execution), but its whole premise (invent a brand) is wrong for a project with a real, established identity.

**Verdict: Ignore.**

---

## 2. `design-taste-frontend` (v2, current default) and `design-taste-frontend-v1`

**What they do:** A very large (1207-line v2, 226-line v1) "anti-AI-slop" frontend engineering ruleset for building landing pages, portfolios, and marketing-site redesigns with React/Next.js/Tailwind v4/Motion/GSAP. Sets numeric "dials" (`DESIGN_VARIANCE`, `MOTION_INTENSITY`, `VISUAL_DENSITY`), a long banned-pattern list (no `Inter`, no em-dash, no 3-equal-cards, no centered hero past a variance threshold), and a 60+ item pre-flight checklist.

**Relevant for Spicyfied:** Partially, and only for the parts that are genre-agnostic hygiene (empty/loading/error states, WCAG contrast checks, no dead `#` links, mobile-collapse discipline). The bulk of it targets landing/portfolio pages; Spicyfied is a transactional e-commerce site with real cart/checkout/order flows this skill's own Section 13 ("Out of Scope") doesn't clearly cover but its philosophy clearly wasn't built for.

**Safe to use in this repo:** Not as a whole. Its defaults are aggressive: baseline `DESIGN_VARIANCE 8` pushes toward asymmetric, non-centered, high-motion layouts by default — precisely the direction this session's audit moved *away* from (doc 12's Visual Stabilisation Pass, the "calm, restrained" direction).

**Conflicts with existing brand audit — concrete, not hypothetical:**
- **Serif ban:** "Serif is very discouraged as the default... `Fraunces`... specifically BANNED as defaults." Spicyfied's approved system uses `font-serif` (Fraunces per Tailwind config) deliberately for headings across Home/Shop/PDP. This skill would flag/replace it.
- **Icon library:** Discourages `lucide-react`, "acceptable only when... the project already depends on it." Spicyfied uses `lucide-react` in every component touched this session. The override technically covers this, but a careless pass could still suggest a swap — a large, disruptive, unnecessary change explicitly against the "small controlled pass" rule the user set this session.
- **Premium-consumer palette ban:** Explicitly bans "warm beige/cream + brass/clay/oxblood/ochre + espresso" as a default for premium-consumer/artisan briefs and demands palette *rotation* project-to-project. Spicyfied's cream/saffron/ochre/brand-green system is adjacent to exactly what this rule steers away from — applying it could push toward abandoning the real, approved, sampled identity for an unrelated "Cold Luxury" or "Terracotta + Slate" palette.
- **Motion mandates:** GSAP scroll-hijack/sticky-stack/horizontal-pan patterns are exactly the pattern doc 14 *removed* from the homepage ("Look Closer" section) after confirming it rendered nearly blank in practice. This skill would push back toward that.
- Section 11 (Redesign Protocol — audit first, preserve IA, don't rename nav/routes/form fields silently) is the one section genuinely well-aligned with how this project has been run.

**Risky/hidden assumptions:** Assumes Next.js/RSC, Tailwind v4, Motion/GSAP/Three.js, and official design-system packages (shadcn, Radix, Fluent, Carbon) — none of which fit this Vite + Tailwind (v3-era config) + lucide-react codebase. Blindly following install commands (`npx shadcn@latest init`, Next.js `next/font`) would be actively wrong here.

**Verdict: Reference only, cite selectively.** Its empty/loading/error-state and accessibility-contrast checklist items are genuinely useful hygiene to spot-check later. Its visual-direction defaults (typography, color, motion, layout) should **not** be applied — they contradict approved, evidence-based decisions. v1 is an earlier, less-refined version of the same philosophy with the same conflicts.

---

## 3. `full-output-enforcement`

**What it does:** A generic behavioral instruction (not design-specific) banning truncated/placeholder output (`// ... rest of code`, "I'll leave that as an exercise") and mandating complete, unabridged deliverables.

**Relevant for Spicyfied:** Marginally. This session has already been delivering complete file edits with no placeholders throughout, so it's redundant with existing practice.

**Safe to use in this repo:** Yes — it has no visual/behavioral opinions about the site itself, purely an output-completeness discipline.

**Conflicts with existing brand audit:** None.

**Risky/hidden assumptions:** None of concern.

**Verdict: Keep for reference only** — harmless, but not needed given established practice.

---

## 4. `gpt-taste`

**What it does:** "Elite UX/UI & Advanced GSAP Motion Engineer" — mandates simulated Python-driven randomization for layout choice, strict AIDA (Attention/Interest/Desire/Action) page structure, mandatory GSAP ScrollTrigger pinning/stacking/scrubbing, inline-image typography, massive `py-32`–`py-48` section spacing.

**Relevant for Spicyfied:** No. Built for Awwwards-style marketing pages with heavy scroll choreography.

**Safe to use in this repo:** No — mandatory heavy motion/GSAP on every page directly contradicts doc 14's finding (scroll-hijacked sections render broken) and the "calm, premium, restrained" direction approved for Shop/PDP this session.

**Conflicts with existing brand audit:** Direct. "Static interfaces are strictly forbidden" and mandatory GSAP scroll-pinning is exactly what was removed from the homepage.

**Risky/hidden assumptions:** Assumes GSAP/`@gsap/react` are desired dependencies; none are currently used deliberately in this codebase (Framer Motion/`motion/react` is, in the pre-existing `SpiceReveal.tsx`, which itself was the file replaced for reliability reasons).

**Verdict: Ignore.**

---

## 5. `high-end-visual-design`

**What it does:** "$150k agency" visual system — bans "generic 1px solid gray borders," bans "standard thick-stroked Lucide" icons, mandates glass "double-bezel" nested card architecture, floating glass-pill navs, magnetic button physics, mandatory `py-24`+ spacing everywhere.

**Relevant for Spicyfied:** No.

**Safe to use in this repo:** No. This is the single most directly conflicting skill of the thirteen.

**Conflicts with existing brand audit:** Severe and specific. It bans exactly the visual language this session spent multiple passes establishing as the fix: "Banned Borders & Shadows: Generic 1px solid gray borders" — Shop/ProductCard/PDP were deliberately moved *to* `border border-black/10` fine borders (away from heavy shadows) this session, on your explicit instruction ("use fine borders, not heavy shadows"). It also bans lucide-react outright ("Banned Icons: Standard thick-stroked Lucide"), which the whole codebase uses.

**Risky/hidden assumptions:** Assumes constant, everywhere motion and glassmorphism; neither fits a trust-first grocery/spice storefront.

**Verdict: Ignore.**

---

## 6. `image-to-code`

**What it does:** A Codex-specific workflow: for any visually important task, generate fresh AI reference images per page section *first*, deeply analyze them, then implement code to match. Explicitly for "hero sections, landing pages, marketing sites, startup sites, product pages, portfolio websites" built from scratch or heavily redesigned.

**Relevant for Spicyfied:** No. Spicyfied's product images are real photography of real inventory; this skill's core loop (invent a design image, then code to match it) has no meaningful application to refining an existing page against real product data and real constraints — worse, it risks pulling toward inventing imagery/copy not grounded in Spicyfied's real content, which is the opposite of the provenance rule.

**Safe to use in this repo:** Yes, technically (it's a workflow instruction, not code), but functionally a non-fit.

**Conflicts with existing brand audit:** Indirect but real — an "invent the image first" workflow is structurally opposed to "never invent sourcing/imagery/claims not backed by real data" (doc 11).

**Risky/hidden assumptions:** Assumes an image-generation tool is available and that greenfield visual invention is the goal.

**Verdict: Ignore.**

---

## 7. `imagegen-frontend-web`

**What it does:** Pure image-generation direction skill (no code) for landing-page comps — mandates one image per page section, discourages the "left-text/right-image" hero default, varies composition per section.

**Relevant for Spicyfied:** No — same greenfield-marketing-page premise as `image-to-code`, image-generation only.

**Safe to use in this repo:** Yes, inert with respect to code (doesn't touch files), but purposeless here.

**Conflicts with existing brand audit:** Same indirect conflict as #6 — invents visual concepts rather than working from real product photography.

**Verdict: Ignore.**

---

## 8. `imagegen-frontend-mobile`

**What it does:** Image-generation only, for native mobile app (iOS/Android) screen concepts. Its own text explicitly states: "This skill is not for: websites, landing pages... image-to-code, frontend implementation, code generation."

**Relevant for Spicyfied:** No — Spicyfied is a responsive website, not a native app. The skill disqualifies itself by its own scope statement.

**Safe to use in this repo:** Yes (inert), but has zero applicability.

**Conflicts with existing brand audit:** None (out of scope by its own definition).

**Verdict: Ignore.**

---

## 9. `industrial-brutalist-ui`

**What it does:** Military-terminal/Swiss-blueprint aesthetic — CRT scanlines, ASCII framing (`[ DELIVERY SYSTEMS ]`), zero border-radius, hazard-red accents, monospace-dominant typography. For "declassified blueprint"-feeling dashboards/portfolios.

**Relevant for Spicyfied:** No, not remotely — the opposite visual register from a warm, trust-first food brand.

**Safe to use in this repo:** Technically inert until invoked, but there is no scenario where invoking it would be appropriate for this project.

**Conflicts with existing brand audit:** Total aesthetic conflict (this is by design — nobody would apply it here by accident, but it's now sitting in the repo regardless).

**Verdict: Ignore.**

---

## 10. `minimalist-ui`

**What it does:** Warm-monochrome "document-style" editorial minimalism — bans `lucide-react`, bans "primary colored backgrounds for large elements or sections (e.g., no bright blue, green, or red hero sections)," pale-pastel accent-only color system.

**Relevant for Spicyfied:** No.

**Safe to use in this repo:** No — its "no green hero sections" rule directly targets the exact pattern (dark ink/brand-green header, footer, and hero) that was explicitly *approved* and preserved through the green-reduction pass this session ("keep dark green only for header/footer/hero moments... use cream/ivory elsewhere"). Applying this skill would mean removing the brand green from the header/hero — a direct reversal of approved work.

**Conflicts with existing brand audit:** Direct, specific, and material.

**Verdict: Ignore.**

---

## 11. `redesign-existing-projects`

**What it does:** An audit-first checklist for improving an *existing* codebase without breaking functionality — the closest in spirit to how this session has actually operated. Covers typography/color/layout/interactivity/content/component/code-quality/accessibility gaps, then a "Fix Priority" list, then explicit rules: "Work with the existing tech stack... Do not break existing functionality... Keep changes reviewable and focused. Small, targeted improvements over big rewrites."

**Relevant for Spicyfied:** Partially, and it's the most philosophically compatible of the thirteen — its process discipline (audit before touching, small reviewable diffs, don't migrate stacks) matches this project's actual working method closely.

**Safe to use in this repo:** Conditionally. Its *process* rules are safe and good practice. Its *content* recommendations carry the same family of conflicts as `design-taste-frontend` (bans "Lucide or Feather icons exclusively," pushes "font swap" and "color palette cleanup" as the top two fix priorities — both would relitigate already-approved, evidence-based brand decisions if followed literally).

**Conflicts with existing brand audit:** Its icon/font/color "fix priority" defaults conflict the same way as #2 above. Its structural/accessibility checklist items (missing alt text, no 404 page, no skip-link, dead `#` links, missing meta tags, hardcoded pixel widths) do **not** conflict — they're genuine, evidence-based, verifiable gaps independent of visual taste, and several (custom 404, skip-link, meta tags) haven't been explicitly checked yet in this project's audit.

**Risky/hidden assumptions:** None beyond the visual-taste defaults already flagged.

**Verdict: Keep for reference — specifically the technical/accessibility checklist (missing alt text, 404 page, skip-link, dead links, meta tags), not the typography/color/icon "fixes."** Do not apply its font/color/icon recommendations to Spicyfied.

---

## 12. `stitch-design-taste`

**What it does:** Generates `DESIGN.md` files for Google Stitch (an external Google Labs tool at labs.google/stitch) — a distilled repeat of the same "anti-slop" ruleset (max 1 accent, ban `Inter`, serif banned in dashboards, etc.), packaged for a tool this environment doesn't have access to.

**Relevant for Spicyfied:** No — requires external tooling (Google Stitch) not available here, and its content repeats the same conflicts as `design-taste-frontend`.

**Safe to use in this repo:** Moot — cannot be used without Google Stitch access.

**Conflicts with existing brand audit:** Same as `design-taste-frontend` (serif/palette/icon defaults), inherited wholesale.

**Verdict: Ignore.**

---

## Summary Table

| Skill | Relevant | Safe | Conflicts with audit | Recommendation |
|---|---|---|---|---|
| brandkit | No | Yes (inert) | Would, if used | Ignore |
| design-taste-frontend | Partial | No (as a whole) | Yes — serif, icons, palette, motion | Reference only (process section) |
| design-taste-frontend-v1 | Partial | No | Same as v2 | Reference only |
| full-output-enforcement | Marginal | Yes | None | Reference only |
| gpt-taste | No | No | Yes — mandatory scroll-hijack motion | Ignore |
| high-end-visual-design | No | No | Yes — bans fine borders & lucide-react | Ignore |
| image-to-code | No | Yes (inert) | Indirect — invents imagery | Ignore |
| imagegen-frontend-web | No | Yes (inert) | Indirect | Ignore |
| imagegen-frontend-mobile | No | Yes (inert) | None (self-excludes) | Ignore |
| industrial-brutalist-ui | No | Yes (inert) | Total aesthetic mismatch | Ignore |
| minimalist-ui | No | No | Yes — bans green hero/header | Ignore |
| redesign-existing-projects | Partial | Conditionally | Icon/font/color defaults only | Reference (checklist items only) |
| stitch-design-taste | No | Moot (needs external tool) | Same as design-taste-frontend | Ignore |

## Overall Recommendation

Do not invoke any of these 13 skills on Spicyfied as-is. Two (`redesign-existing-projects`, `design-taste-frontend`) contain isolated, genuinely useful checklist items — missing alt text, missing meta tags, no custom 404 page, no skip-to-content link, dead `#` links, WCAG contrast — worth pulling out **manually, one item at a time, as their own reviewed pass**, the same way every other change has been made this session. None of the visual-direction content (typography, color palette, icon library, motion mandates) in any of the 13 should be applied: every one of them either doesn't fit an e-commerce site with real transactional flows, or actively contradicts a specific, evidence-based decision this project's brand audit already made and you already approved.
