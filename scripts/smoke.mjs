import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');

const checks = [
  {
    file: 'index.html',
    mustInclude: ['<title>', 'spicyfied', '<div id="root">'],
  },
  {
    file: 'shop/index.html',
    mustInclude: ['Shop Spices', 'canonical'],
  },
  {
    file: 'sitemap.xml',
    mustInclude: ['<urlset', 'spicyfied.in'],
    optional: true,
  },
  {
    file: 'robots.txt',
    mustInclude: ['Sitemap:', 'spicyfied.in'],
  },
  {
    file: '_redirects',
    mustInclude: ['/product-page/*', '301'],
  },
  {
    file: 'merchant-feed.xml',
    mustInclude: ['<rss', 'xmlns:g="http://base.google.com/ns/1.0"', 'Spicyfied', '<g:id>'],
    optional: true,
  },
];

let failures = 0;

for (const check of checks) {
  const full = path.join(DIST, check.file);
  if (!existsSync(full)) {
    if (check.optional) {
      console.warn(`[skip] ${check.file} missing (optional)`);
      continue;
    }
    console.error(`[fail] ${check.file} missing`);
    failures++;
    continue;
  }
  const body = await readFile(full, 'utf8');
  const missing = check.mustInclude.filter((token) => !body.toLowerCase().includes(token.toLowerCase()));
  if (missing.length) {
    console.error(`[fail] ${check.file} missing tokens: ${missing.join(', ')}`);
    failures++;
  } else {
    console.log(`[ok]   ${check.file}`);
  }
}

if (failures) {
  console.error(`\nSmoke test failed: ${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nSmoke test passed.');
