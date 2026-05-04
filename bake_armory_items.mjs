#!/usr/bin/env node
// Bakes icon URLs for new armory cosmetic items into BAKED_WIKI_CACHE.
// Uses image URLs already confirmed in Data/armory_probe_results.json.
// Run: node bake_armory_items.mjs

import { readFileSync, writeFileSync } from 'fs';

const HTML_PATH   = './Dashboards/rs3-asset-library.html';
const PROBE_PATH  = './Data/armory_probe_results.json';
const WIKI        = 'https://runescape.wiki/api.php';
const H           = { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0 (bake-armory)' } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const html  = readFileSync(HTML_PATH, 'utf8');
const probe = JSON.parse(readFileSync(PROBE_PATH, 'utf8'));

// ── 1. Extract current BAKED_WIKI_CACHE ───────────────────────────────────────
const cacheMatch = html.match(/const BAKED_WIKI_CACHE = (\{[^\n]+\});/);
if (!cacheMatch) { console.error('BAKED_WIKI_CACHE not found'); process.exit(1); }
const cache = JSON.parse(cacheMatch[1]);
console.log(`Existing BAKED_WIKI_CACHE entries: ${Object.keys(cache).length}`);

// ── 2. Find new items and their slugs (from ITEMS array) ─────────────────────
const mIdx = html.indexOf('const ITEMS = [');
const bs   = html.indexOf('[', mIdx);
let depth  = 0, blockEnd = -1;
for (let j = bs; j < html.length; j++) {
  if (html[j] === '[') depth++;
  else if (html[j] === ']') { depth--; if (depth === 0) { blockEnd = j + 1; break; } }
}
const ITEMS = (new Function(`return ${html.slice(bs, blockEnd)}`))();
const newCosm = ITEMS.filter(i =>
  (i.cat === 'cosmetic-armor' || i.cat === 'cosmetic-weapon') &&
  i.setKey?.startsWith('cos-') &&
  !cache[i.slug]
);
console.log(`New armory items missing from cache: ${newCosm.length}`);

// ── 3. Build slug → imageUrl map from probe results ───────────────────────────
// The probe already confirmed image URLs for each piece by name
const probeByName = new Map();
for (const s of probe.sets) {
  for (const p of s.piecesWithSlots) {
    if (p.hasImage && p.imageUrl) probeByName.set(p.slug, p.imageUrl);
  }
}

// Separate items into directly available and still-needing-probe
const directBake  = {};
const needsProbe  = [];

for (const item of newCosm) {
  if (probeByName.has(item.slug)) {
    directBake[item.slug] = probeByName.get(item.slug);
  } else {
    needsProbe.push(item.slug);
  }
}

console.log(`Direct from probe: ${Object.keys(directBake).length}`);
console.log(`Still need probing: ${needsProbe.length}`);

// ── 4. Probe remaining slugs via pageimages ───────────────────────────────────
const probed = {};
if (needsProbe.length) {
  const titles = needsProbe.map(s => s.replace(/_/g, ' '));
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const p = new URLSearchParams({ action:'query', prop:'pageimages', pithumbsize:'200',
      titles: batch.join('|'), format:'json', origin:'*' });
    const d = await (await fetch(`${WIKI}?${p}`, H)).json();
    for (const pg of Object.values(d.query?.pages ?? {})) {
      if (pg.thumbnail) {
        const slug = pg.title.replace(/ /g, '_');
        probed[slug] = pg.thumbnail.source;
      }
    }
    if (i + 50 < titles.length) await sleep(300);
  }
  console.log(`Probed and found: ${Object.keys(probed).length}`);
}

// ── 5. Merge and apply to BAKED_WIKI_CACHE ───────────────────────────────────
const newEntries = { ...directBake, ...probed };
const added = Object.keys(newEntries).filter(k => !cache[k]);

if (added.length === 0) {
  console.log('No new entries to bake. Done.');
  process.exit(0);
}

for (const [slug, url] of Object.entries(newEntries)) {
  cache[slug] = { url, ts: Date.now() };
}

const newCacheStr = 'const BAKED_WIKI_CACHE = ' + JSON.stringify(cache) + ';';
const newHtml = html.replace(/const BAKED_WIKI_CACHE = \{[^\n]+\};/, newCacheStr);

if (newHtml === html) { console.error('BAKED_WIKI_CACHE replacement made no change'); process.exit(1); }

// Syntax check
const scriptSrc = newHtml.slice(newHtml.indexOf('<script>') + 8, newHtml.indexOf('</script>'));
try { new Function(scriptSrc); } catch (e) { console.error('SYNTAX ERROR:', e.message); process.exit(1); }

writeFileSync(HTML_PATH, newHtml);
console.log(`\nBaked ${added.length} new entries into BAKED_WIKI_CACHE.`);
console.log(`File size: ${html.length} → ${newHtml.length} (+${newHtml.length - html.length} bytes)`);
console.log('Done.');
