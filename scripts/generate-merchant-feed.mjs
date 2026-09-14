/**
 * Generates dist/merchant-feed.xml — a Google Merchant Center RSS 2.0 product feed.
 *
 * Required attributes per Google's product data specification:
 *   id, title, description, link, image_link, availability, price, brand, condition,
 *   google_product_category, identifier_exists (no GTIN for private-label food).
 *
 * Run after `vite build` as part of `npm run build`.
 */

import { writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const SITE_URL = process.env.SITE_URL || 'https://spicyfied.in';

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
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;

// Google product taxonomy ID for Seasonings, Herbs & Spices (includes dry fruits
// under the broader Food category). Using the parent "Food Items" (ID 422) as a
// safe catch-all; Merchant Center allows a more specific value per product but
// this single ID covers the entire catalogue without needing per-product mapping.
const GOOGLE_PRODUCT_CATEGORY = '422';

function escapeXml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildItem({ product, primaryImage, lowestPrice, variantCount }) {
  const link = `${SITE_URL}/product/${product.slug}`;
  const availability = variantCount > 0 ? 'in stock' : 'out of stock';
  const priceStr = lowestPrice != null ? `${Number(lowestPrice).toFixed(2)} INR` : null;

  const descriptionRaw = [product.description, product.health_benefits]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);

  const lines = [
    `    <item>`,
    `      <g:id>${escapeXml(product.slug)}</g:id>`,
    `      <g:title>${escapeXml(product.name)}</g:title>`,
    `      <g:description>${escapeXml(descriptionRaw || product.name)}</g:description>`,
    `      <g:link>${escapeXml(link)}</g:link>`,
    primaryImage ? `      <g:image_link>${escapeXml(primaryImage)}</g:image_link>` : null,
    `      <g:availability>${availability}</g:availability>`,
    priceStr ? `      <g:price>${escapeXml(priceStr)}</g:price>` : null,
    `      <g:brand>Spicyfied</g:brand>`,
    `      <g:condition>new</g:condition>`,
    `      <g:google_product_category>${GOOGLE_PRODUCT_CATEGORY}</g:google_product_category>`,
    // Private-label food products rarely have GTINs. Declaring this avoids
    // Merchant Center rejecting items for missing barcode data.
    `      <g:identifier_exists>no</g:identifier_exists>`,
  ]
    .filter(Boolean)
    .join('\n');

  return lines + '\n    </item>';
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.warn('[merchant-feed] Supabase env vars missing — skipping feed generation.');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, slug, description, health_benefits')
    .eq('is_active', true)
    .order('name');

  if (prodErr) {
    console.error('[merchant-feed] Failed to fetch products:', prodErr.message);
    return;
  }

  if (!products?.length) {
    console.warn('[merchant-feed] No active products found — skipping feed generation.');
    return;
  }

  const ids = products.map((p) => p.id);

  const [{ data: variants }, { data: images }] = await Promise.all([
    supabase
      .from('product_variants')
      .select('product_id, price, stock_quantity')
      .in('product_id', ids),
    supabase
      .from('product_images')
      .select('product_id, image_url, sort_order')
      .in('product_id', ids),
  ]);

  const now = new Date().toUTCString();

  const items = products.map((p) => {
    const pVariants = (variants || [])
      .filter((v) => v.product_id === p.id)
      .map((v) => Number(v.price))
      .filter((n) => !isNaN(n));

    const pImages = (images || [])
      .filter((i) => i.product_id === p.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const primaryImage = pImages[0]?.image_url ?? null;
    const lowestPrice = pVariants.length ? Math.min(...pVariants) : null;

    return buildItem({ product: p, primaryImage, lowestPrice, variantCount: pVariants.length });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Spicyfied — Premium Indian Spices, Masalas &amp; Dry Fruits</title>
    <link>${SITE_URL}</link>
    <description>Authentic Indian spices, whole masalas, ground masalas and premium dry fruits sourced from trusted farms.</description>
    <lastBuildDate>${now}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>
`;

  await writeFile(path.join(DIST, 'merchant-feed.xml'), xml, 'utf8');
  console.log(`[merchant-feed] Wrote dist/merchant-feed.xml with ${items.length} products.`);
}

main().catch((err) => {
  console.error('[merchant-feed]', err);
  process.exit(1);
});
