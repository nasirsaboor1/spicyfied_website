// One-time backfill: generates the resized WebP variants (thumb/medium —
// see src/lib/imageProcessing.ts) for every EXISTING product photo, so the
// current 25-product catalog gets the same performance benefit as photos
// uploaded through the new pipeline going forward.
//
// Requires NO database writes and NO schema change. product_images.image_url
// keeps pointing at the original, exactly as it does today; this script
// only adds new objects to Storage at predictable derived paths
// (deriveVariantPath in this file, kept in sync with
// src/lib/imageProcessing.ts's identical logic — see the comment there).
// The frontend already knows how to use them (ResilientImage falls back to
// the original if a derived variant isn't there yet), so this script is
// pure upside: skip it entirely and the site keeps working exactly as it
// does today, just without the byte savings on un-migrated photos.
//
// SAFETY
// - Defaults to --dry-run: lists what it would do and downloads originals
//   to verify they decode, but uploads nothing. Pass --apply to actually
//   write variants to Storage.
// - Never deletes or overwrites anything. Only ever creates new objects at
//   paths that don't exist yet (upsert: false) — if a variant is somehow
//   already there, it's left alone and counted as "skipped".
// - Resumable by construction: it re-derives what's already in Storage
//   before doing any work, so re-running after an interruption (or after
//   new products are added later) just picks up whatever's still missing.
// - Originals are never touched, only ever downloaded (read) and re-read
//   locally to generate variants — see "avoid deleting originals" in the
//   Wave 2 brief.
//
// REQUIRED PRODUCTION PERMISSIONS (see PHASE4_WAVE2_REPORT.md /
// IMAGE_MIGRATION_PLAN.md for the full explanation):
//   - A Supabase key with Storage read+write on the "Product Image" bucket
//     (the project's anon key cannot write here — uploads currently only
//     work from an authenticated admin session in the browser). The
//     standard fit for an offline script like this is the project's
//     SUPABASE_SERVICE_ROLE_KEY, which bypasses Storage RLS. Set it in the
//     environment before running with --apply; this script refuses to run
//     with --apply without it.
//   - SELECT on product_images (already covered by the existing anon key /
//     public read policy — no elevated DB permission needed).
//   - No INSERT/UPDATE/DELETE on any table, at any point.
//
// USAGE
//   node scripts/backfill-image-variants.mjs                # dry run
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-image-variants.mjs --apply

import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i !== -1 ? parseInt(process.argv[i + 1], 10) : Infinity;
})();

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const WRITE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const READ_KEY = WRITE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !READ_KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env');
  process.exit(1);
}
if (APPLY && !WRITE_KEY) {
  console.error('--apply requires SUPABASE_SERVICE_ROLE_KEY in the environment (the anon key cannot write to Storage). Refusing to run.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, READ_KEY);
const IMAGE_BUCKET = 'Product Image';

// Mirrors src/lib/imageProcessing.ts's IMAGE_TIERS exactly. Kept as a
// separate Node-side copy (like lib/products.ts's deriveVariantUrl) since
// that module is browser-only (Canvas APIs); this script uses `sharp`
// instead, which is Node-only and not shipped to the browser bundle at all
// (a devDependency, used only by this offline script) — so this backfill
// tool adds zero weight to the public site either way.
const TIERS = {
  thumb: { suffix: '--thumb', longestEdge: 800, quality: 78 },
  medium: { suffix: '--medium', longestEdge: 1600, quality: 82 },
};

function deriveVariantPath(originalPath, tierName) {
  const cleaned = originalPath.startsWith('/') ? originalPath.slice(1) : originalPath;
  const dot = cleaned.lastIndexOf('.');
  const base = dot === -1 ? cleaned : cleaned.slice(0, dot);
  return `${base}${TIERS[tierName].suffix}.webp`;
}

async function objectExists(objectPath) {
  const dir = objectPath.includes('/') ? objectPath.slice(0, objectPath.lastIndexOf('/')) : '';
  const name = objectPath.includes('/') ? objectPath.slice(objectPath.lastIndexOf('/') + 1) : objectPath;
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).list(dir, { search: name, limit: 1 });
  if (error) return false;
  return (data || []).some((f) => f.name === name);
}

async function processOne(originalPath, report) {
  const needed = [];
  for (const tierName of Object.keys(TIERS)) {
    const variantPath = deriveVariantPath(originalPath, tierName);
    // Resumability: Storage itself is the source of truth for "already
    // done" — no separate progress file to get out of sync.
    if (await objectExists(variantPath)) {
      report.skipped.push({ originalPath, tier: tierName, reason: 'variant already exists' });
    } else {
      needed.push(tierName);
    }
  }
  if (needed.length === 0) return;

  const { data: downloaded, error: downloadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .download(originalPath.startsWith('/') ? originalPath.slice(1) : originalPath);
  if (downloadError || !downloaded) {
    report.failed.push({ originalPath, stage: 'download', error: downloadError?.message || 'no data returned' });
    return;
  }
  const originalBuffer = Buffer.from(await downloaded.arrayBuffer());

  for (const tierName of needed) {
    const { longestEdge, quality } = TIERS[tierName];
    const variantPath = deriveVariantPath(originalPath, tierName);
    try {
      const resizedBuffer = await sharp(originalBuffer)
        .rotate() // apply EXIF orientation, then strip it — same "normalize orientation" step as the browser pipeline
        .resize({ width: longestEdge, height: longestEdge, fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();

      if (!APPLY) {
        report.wouldGenerate.push({ originalPath, variantPath, bytes: resizedBuffer.length });
        continue;
      }

      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(variantPath, resizedBuffer, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
      if (uploadError) {
        report.failed.push({ originalPath, tier: tierName, stage: 'upload', error: uploadError.message });
      } else {
        report.generated.push({ originalPath, variantPath, bytes: resizedBuffer.length });
      }
    } catch (e) {
      report.failed.push({ originalPath, tier: tierName, stage: 'resize', error: e instanceof Error ? e.message : String(e) });
    }
  }
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (writing to production Storage)' : 'DRY RUN (no writes)'}`);
  if (LIMIT !== Infinity) console.log(`Limiting to first ${LIMIT} images (--limit)`);

  const { data: images, error } = await supabase.from('product_images').select('id, image_url').order('id');
  if (error) {
    console.error('Failed to list product_images:', error.message);
    process.exit(1);
  }

  const uniquePaths = [...new Set((images || []).map((i) => i.image_url).filter(Boolean))].slice(0, LIMIT);
  console.log(`${images.length} product_images rows, ${uniquePaths.length} unique original photos to check.`);

  const report = { generated: [], wouldGenerate: [], skipped: [], failed: [], startedAt: new Date().toISOString() };

  for (const [i, originalPath] of uniquePaths.entries()) {
    process.stdout.write(`[${i + 1}/${uniquePaths.length}] ${originalPath} ... `);
    await processOne(originalPath, report);
    console.log('done');
    // Be a polite citizen against the Storage API rather than firing every
    // request back-to-back.
    await new Promise((r) => setTimeout(r, 150));
  }

  report.finishedAt = new Date().toISOString();
  const reportPath = path.resolve(__dirname, '..', `backfill-report-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n=== Summary ===');
  console.log('Generated:', report.generated.length);
  console.log('Would generate (dry run):', report.wouldGenerate.length);
  console.log('Skipped (already existed):', report.skipped.length);
  console.log('Failed:', report.failed.length);
  if (report.failed.length) {
    console.log('First few failures:', report.failed.slice(0, 5));
  }
  console.log('Full report written to', reportPath);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
