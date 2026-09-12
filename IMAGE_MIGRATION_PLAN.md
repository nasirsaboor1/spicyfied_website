# Image Migration Plan

Companion to `PHASE4_WAVE2_REPORT.md`. Covers the new image architecture, the future upload pipeline, and the one-time backfill for the existing catalog. **The backfill has not been run against production** — this document ends with exactly what it needs and what running it would do.

---

## Why: the problem this replaces

Wave 1/Phase 3 measured product photos at native camera resolution — 3024×4032px, 0.8–1.1MB each — served into a product card that renders at a few hundred pixels wide. Every future photo uploaded through the existing admin flow (`ProductFormModal.tsx` → `uploadProductImage()`) would recreate the exact same problem: a raw `<input type="file">` with no resize, no compression, no validation, uploaded byte-for-byte to Storage. Fixing today's 41 photos without fixing the upload path would just mean re-measuring the same complaint again the next time someone adds a product.

## Architecture chosen: filename-convention variants, zero schema change

Every product photo now has up to three objects in the same `Product Image` Storage bucket:

```
Cinnamon (1)-min.JPG              <- original, exactly as uploaded (unchanged)
Cinnamon (1)-min--thumb.webp      <- 800px longest edge, WebP, quality 78
Cinnamon (1)-min--medium.webp     <- 1600px longest edge, WebP, quality 82
```

`product_images.image_url` keeps storing only the original path, exactly as it does today — **no column added, no migration, no backfill of the database itself.** The two derived paths are computed from that one stored path by a pure string function (`deriveVariantPath` in both `src/lib/imageProcessing.ts` and `src/lib/products.ts`), so every existing `product_images` row already "has" correct-by-construction thumb/medium URLs the moment the corresponding Storage objects exist — nothing about the 41 existing rows needs to change for this to work.

The frontend (`ResilientImage`, `src/components/ResilientImage.tsx`) requests the derived variant first and falls back to the original automatically on a load error. This is what makes the whole thing safe to ship ahead of the backfill: **a photo that has no thumb/medium yet just serves its original, exactly like today** — there is no state where an image disappears or 404s to the visitor.

### Why not Supabase's built-in image transformation

Checked directly against the live project rather than assumed: a transform URL request (`/storage/v1/render/image/public/...?width=300&height=300`) returned `403 FeatureNotEnabled`. This project's current Supabase plan doesn't have it — not a config problem to fix, a plan tier the brief didn't ask to change. Ruled out on that basis, not on preference.

### Why not a Supabase Edge Function

Would work, but for a 25-product catalog it's a server-side dependency (a Deno function, an image library bundled for it, a new thing to deploy/monitor) to do exactly what a browser `<canvas>` already does for free, in the one browser that ever uploads a product photo (the admin's, in `ProductFormModal`). Chosen against, per the brief's own "don't introduce a large infrastructure dependency for a 25-product store unless clearly justified" — this wasn't justified here.

### Tier sizes: measured, not guessed

Real rendered `<img>` widths, measured live against the production build at several viewport widths (`getBoundingClientRect()`, not assumed from Tailwind class names):

| Context | Measured CSS width | × 2 (retina) | Tier | Longest edge chosen |
|---|---|---|---|---|
| Product card (shop/home grid) | 291–392px | 582–784px | **thumb** | 800px |
| Product-detail thumbnail strip | 76px | 152px | *(thumb, shared)* | 800px |
| Product-detail main gallery image | 654–734px | 1308–1468px | **medium** | 1600px |

A third **large** tier (for a future zoom/lightbox) was deliberately **not** generated — there is no zoom feature in the app today to consume it (confirmed by reading `ProductDetailPage.tsx`; no lightbox/zoom code exists), and generating an unused tier speculatively is exactly the "arbitrarily choose dimensions" the brief said not to do. The tier config (`IMAGE_TIERS` in `imageProcessing.ts`) is a plain object — adding a `large: { longestEdge: 2400, ... }` entry later, if a zoom feature ships, is a one-line change to both the upload pipeline and this backfill script, not a redesign.

**Original retained, never deleted, never served to the public site.** Kept as the fallback target and as a reprocessing source (if tier sizes or the target format ever change) — Storage cost for ~41 spare originals on a 25-product catalog is negligible, and there's no product requirement that justifies the risk of deleting the only non-regenerable copy of an owner's photo.

---

## Future upload pipeline (already shipped in this wave, code-only)

`src/lib/imageProcessing.ts` + `uploadProductImage()` in `src/lib/adminProducts.ts`:

1. **Validate** — MIME type (`image/jpeg`/`png`/`webp` only) and size (25MB cap) checked before anything is read.
2. **Normalize orientation** — `createImageBitmap(file, { imageOrientation: 'from-image' })` applies EXIF orientation at decode time; every downstream draw is already right-side-up. No EXIF-parsing library needed.
3. **Generate variants** — each tier drawn onto a sized `<canvas>` and exported as WebP at a tier-specific quality.
4. **Strip metadata** — a fresh canvas draw inherently carries no EXIF/GPS/ICC data from the source file; free side effect of step 3, no separate step needed.
5. **Deterministic, non-colliding filenames** — `${Date.now()}-${crypto.randomUUID().slice(0,8)}-${sanitizedOriginalName}`, so two admins uploading photos in the same millisecond still can't collide.
6. **Handle failures cleanly** — the original upload is the row of record: if it fails, nothing is uploaded and nothing is inserted (no orphan). Variant generation/upload is best-effort *after* the original succeeds: if a variant fails, the photo is still fully usable (falls back to the original everywhere) and the admin sees a non-blocking warning naming which variant failed, rather than the whole upload failing or a silent gap.
7. **No orphans left behind** — nothing is ever uploaded before the thing it depends on exists; there's no multi-step sequence that can be interrupted mid-way and leave a half-referenced object (the DB row is written last, after Storage uploads, and only references the original, which is guaranteed to exist by that point).

---

## The backfill script — `scripts/backfill-image-variants.mjs`

One-time tool for the 41 photos already in Storage that predate this pipeline.

**What it does:**
1. Reads every `product_images` row (SELECT only — no other table touched).
2. For each unique original path, checks whether its thumb/medium objects already exist in Storage (`storage.list()`).
3. Downloads the original, generates both tiers with `sharp` (Node-side equivalent of the browser Canvas pipeline — a devDependency used only by this script, confirmed with `grep` that it never reaches `src/` or the built browser bundle), uploads them to the derived paths.
4. Writes a JSON report (generated / skipped / failed, with reasons) at the end.

**Resumable by construction** — no separate progress file to get out of sync: re-running it just re-checks Storage and skips whatever's already there. **Never deletes anything** — the script contains no `.remove()`/delete call at all, on Storage or any table.

**Tested, not executed against production.** Ran in `--dry-run` (the default — `--apply` is required to write anything) against the real, live product_images table and real Storage objects, using the project's existing read-only anon key:

```
41 product_images rows, 41 unique original photos to check.
[... all 41 processed ...]
=== Summary ===
Generated: 0
Would generate (dry run): 82
Skipped (already existed): 0
Failed: 0
```

Real output byte sizes from that dry run (`sharp` actually decoded and resized every one of the 41 live originals — these are not estimates):

| Tier | Average size | Total (41 photos) |
|---|---|---|
| thumb (800px) | ~68 KB | ~2.7 MB |
| medium (1600px) | ~227 KB | ~9.1 MB |
| **Both tiers, all 41 photos** | | **~11.8 MB total** |

For comparison, the originals alone (Phase A measurement) run 0.8–2.9MB *each* — several individual originals already exceed the combined thumb+medium output for the *entire* 41-photo catalog.

## Exact production permissions required to run `--apply`

- **Storage read+write on the `Product Image` bucket.** The project's anon key (what the public site and this dry run both use) can read the bucket but — confirmed by how the existing upload path works — cannot write to it outside an authenticated admin session. The standard fit for an offline script like this is the project's **`SUPABASE_SERVICE_ROLE_KEY`**, which the script requires to be set before `--apply` is accepted (it refuses to run without it).
- **SELECT on `product_images`.** Already covered by the same anon-key access the dry run just used.
- **Nothing else.** No INSERT/UPDATE/DELETE on any table, at any point — the whole point of the filename-convention design is that this migration doesn't touch the database.

## Rollback

Delete the `--thumb.webp`/`--medium.webp` objects from Storage. `product_images.image_url` was never touched, so the site immediately falls back to originals everywhere via `ResilientImage` — no code change needed to revert.

## Ready to run?

**READY FOR PRODUCTION IMAGE MIGRATION: YES**, once a `SUPABASE_SERVICE_ROLE_KEY` is provided. The script is written, dry-run-verified against the real catalog with zero failures, and cannot mutate or delete anything by construction (no delete call exists in it). Not run this session because that key wasn't available and — separately — the brief's safety gate reserves the decision to apply it for explicit approval.
