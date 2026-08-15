import { readFile, writeFile, mkdir, readFile as readFileFs } from 'node:fs/promises';
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

const STATIC_ROUTES = [
  {
    path: '/',
    title: 'Premium Indian Spices, Masalas & Dry Fruits Online | Spicyfied',
    description:
      'Shop authentic Indian spices, whole and ground masalas, and premium dry fruits at Spicyfied. Farm-fresh quality, fast delivery across India.',
    h1: 'Premium Indian Spices, Masalas & Dry Fruits',
    copy:
      'Discover a curated range of authentic Indian spices, whole masalas, ground masalas and premium dry fruits — sourced directly from trusted farms and delivered fresh to your doorstep.',
  },
  {
    path: '/shop',
    title: 'Shop Spices, Masalas & Dry Fruits | Spicyfied',
    description:
      'Browse our full range of premium Indian spices, whole masalas, ground masalas and healthy dry fruits. Best prices and fast delivery.',
    h1: 'Shop Spices, Masalas & Dry Fruits',
    copy:
      'Browse every product in our catalogue — from everyday kitchen essentials to rare whole spices and premium dry fruits hand-picked for quality.',
  },
  {
    path: '/contact',
    title: 'Contact Us | Spicyfied',
    description: 'Get in touch with Spicyfied for product queries, bulk orders or customer support.',
    h1: 'Contact Spicyfied',
    copy: 'Have a question about our spices, dry fruits or orders? Our team is here to help.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Spicyfied',
    description: 'Read how Spicyfied collects, uses and protects your personal information.',
    h1: 'Privacy Policy',
    copy: 'Learn how your data is collected, stored and used when you shop with Spicyfied.',
  },
  {
    path: '/terms',
    title: 'Terms & Conditions | Spicyfied',
    description: 'The terms and conditions governing the use of the Spicyfied online store.',
    h1: 'Terms & Conditions',
    copy: 'These terms apply to all purchases and interactions with Spicyfied.',
  },
  {
    path: '/shipping',
    title: 'Shipping & Delivery Policy | Spicyfied',
    description: 'Information about shipping timelines, delivery charges and serviceable locations at Spicyfied.',
    h1: 'Shipping & Delivery',
    copy: 'Details on how we pack, ship and deliver your spices and dry fruits across India.',
  },
  {
    path: '/refund',
    title: 'Refund & Cancellation Policy | Spicyfied',
    description: 'Spicyfied refund and cancellation policy for online orders.',
    h1: 'Refund & Cancellation',
    copy: 'Learn about our refund window, eligibility and cancellation process.',
  },
];

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildSeoBlock({ title, description, canonical, image, type = 'website', jsonLd }) {
  const img = image || `${SITE_URL}/spicyfied_logo.jpeg`;
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${img}" />`,
  ];
  if (jsonLd) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`);
  }
  return tags.join('\n    ');
}

function injectHead(template, seoBlock) {
  const cleaned = template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:title"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:description"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:image"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:url"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:type"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:title"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:description"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:image"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:card"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');

  return cleaned.replace(/<\/head>/i, `    ${seoBlock}\n  </head>`);
}

function injectBody(template, h1, copy) {
  const snippet = `<div id="prerender-seo" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;"><h1>${escapeHtml(
    h1,
  )}</h1><p>${escapeHtml(copy)}</p></div>`;
  return template.replace(/<div id="root">\s*<\/div>/, `<div id="root"></div>\n    ${snippet}`);
}

async function writeHtml(routePath, html) {
  const outDir = routePath === '/' ? DIST : path.join(DIST, routePath.replace(/^\//, ''));
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  const file = path.join(outDir, 'index.html');
  await writeFile(file, html, 'utf8');
  console.log(`prerendered ${routePath} -> ${path.relative(DIST, file)}`);
}

async function main() {
  const templatePath = path.join(DIST, 'index.html');
  if (!existsSync(templatePath)) {
    console.error('dist/index.html not found. Run vite build first.');
    process.exit(1);
  }
  const template = await readFile(templatePath, 'utf8');

  for (const route of STATIC_ROUTES) {
    const canonical = `${SITE_URL}${route.path === '/' ? '/' : route.path}`;
    const seo = buildSeoBlock({
      title: route.title,
      description: route.description,
      canonical,
    });
    let html = injectHead(template, seo);
    html = injectBody(html, route.h1, route.copy);
    await writeHtml(route.path, html);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.warn('Supabase env vars missing; skipping product prerender.');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, slug, description, health_benefits, category, rating_average, rating_count')
    .eq('is_active', true);

  if (prodErr) {
    console.error('Failed to fetch products:', prodErr.message);
    return;
  }

  const ids = (products || []).map((p) => p.id);
  const { data: variants } = ids.length
    ? await supabase.from('product_variants').select('product_id, price').in('product_id', ids)
    : { data: [] };
  const { data: images } = ids.length
    ? await supabase.from('product_images').select('product_id, image_url, sort_order').in('product_id', ids)
    : { data: [] };

  for (const p of products || []) {
    const pVariants = (variants || []).filter((v) => v.product_id === p.id).map((v) => Number(v.price));
    const pImages = (images || [])
      .filter((i) => i.product_id === p.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const primaryImage = pImages[0]?.image_url;
    const low = pVariants.length ? Math.min(...pVariants) : undefined;
    const high = pVariants.length ? Math.max(...pVariants) : undefined;

    const title = `Buy ${p.name} Online | Spicyfied`;
    const description = (p.description || `Shop premium ${p.name} at Spicyfied. Farm-fresh quality, fast delivery across India.`).slice(0, 300);
    const canonical = `${SITE_URL}/product/${p.slug}`;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.description || undefined,
      image: pImages.map((i) => i.image_url),
      category: p.category || undefined,
      brand: { '@type': 'Brand', name: 'Spicyfied' },
      aggregateRating:
        p.rating_count && Number(p.rating_count) > 0
          ? {
              '@type': 'AggregateRating',
              ratingValue: Number(p.rating_average || 0),
              reviewCount: Number(p.rating_count),
            }
          : undefined,
      offers: pVariants.length
        ? {
            '@type': 'AggregateOffer',
            priceCurrency: 'INR',
            lowPrice: low,
            highPrice: high,
            offerCount: pVariants.length,
            availability: 'https://schema.org/InStock',
            url: canonical,
          }
        : undefined,
    };

    const seo = buildSeoBlock({
      title,
      description,
      canonical,
      image: primaryImage,
      type: 'product',
      jsonLd,
    });

    let html = injectHead(template, seo);
    html = injectBody(
      html,
      p.name,
      `${p.description || ''} ${p.health_benefits || ''}`.trim() || `Premium ${p.name} at Spicyfied.`,
    );

    await writeHtml(`/product/${p.slug}`, html);
  }

  console.log(`Prerendered ${products?.length || 0} product pages.`);

  try {
    const sitemapUrl = `${SUPABASE_URL}/functions/v1/sitemap`;
    const res = await fetch(sitemapUrl, { headers: { Authorization: `Bearer ${SUPABASE_ANON}`, apikey: SUPABASE_ANON } });
    if (res.ok) {
      const xml = await res.text();
      await writeFile(path.join(DIST, 'sitemap.xml'), xml, 'utf8');
      console.log('Wrote dist/sitemap.xml from edge function.');
    } else {
      console.warn(`Sitemap fetch failed: ${res.status}`);
    }
  } catch (e) {
    console.warn('Sitemap fetch error:', e.message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
