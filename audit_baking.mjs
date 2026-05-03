import { readFileSync } from 'fs';
const html = readFileSync(String.raw`C:\Users\chris\OneDrive\Desktop\Simplicity\Dashboards\rs3-asset-library.html`, 'utf-8');

// ── BAKED_WIKI_CACHE (single-line) ──
const wm = html.match(/const BAKED_WIKI_CACHE = (\{[^\n]+\});/);
const wikiCache = JSON.parse(wm[1]);

// ── BAKED_SET_IMAGES (the actual const definition, 3rd occurrence) ──
let siIdx = 0, found = 0;
while ((siIdx = html.indexOf('const BAKED_SET_IMAGES = {', siIdx + 1)) !== -1 && ++found < 3);
const siEnd = html.indexOf('\n};', siIdx) + 3;
const siBlock = html.slice(siIdx, siEnd);
const setKeys = new Set([...siBlock.matchAll(/['"]([^'"]+)['"]\s*:/g)].map(m => m[1]));
console.log(`BAKED_SET_IMAGES found at pos ${siIdx}, keys: ${setKeys.size}`);

// ── All item slugs by category ──
const cats = {};
for (const line of html.split('\n')) {
  const catM  = line.match(/cat:'([^']+)'/);
  const slugM = line.match(/slug:'([^']+)'/) || line.match(/slug:"([^"]+)"/);
  if (!catM || !slugM) continue;
  (cats[catM[1]] ??= new Set()).add(slugM[1]);
}

// ── All setKey refs ──
const setKeyRefs = new Set([...html.matchAll(/setKey:'([^']+)'/g)].map(m => m[1]));

// ── Report ──
console.log(`\n=== BAKED_WIKI_CACHE: ${Object.keys(wikiCache).length} entries ===`);
let totalMissing = 0;
for (const [cat, slugs] of Object.entries(cats)) {
  const missing = [...slugs].filter(s => !wikiCache[s] && !wikiCache[decodeURIComponent(s)]);
  if (missing.length) { console.log(`  MISSING [${cat}]: ${missing.join(', ')}`); totalMissing += missing.length; }
  else console.log(`  OK [${cat}]: ${slugs.size} slugs`);
}
console.log(`  Total unbaked: ${totalMissing}`);

console.log(`\n=== BAKED_SET_IMAGES: ${setKeys.size} entries, ${setKeyRefs.size} setKeys in items ===`);
const missingSetKeys = [...setKeyRefs].filter(k => !setKeys.has(k)).sort();
if (missingSetKeys.length) { console.log(`  MISSING (${missingSetKeys.length}): ${missingSetKeys.join(', ')}`); }
else console.log('  All setKeys baked ✓');
