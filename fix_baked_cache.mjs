#!/usr/bin/env node
// Fixes two bugs introduced by bake_armory_items.mjs:
//   1. 137 BAKED_WIKI_CACHE entries used { url, ts } format instead of { t: url, s: {} }
//   2. cos-aurora, cos-hiker, cos-templar are missing from BAKED_SET_IMAGES
// Run: node fix_baked_cache.mjs

import { readFileSync, writeFileSync } from 'fs';

const HTML_PATH = './Dashboards/rs3-asset-library.html';
const WIKI = 'https://runescape.wiki/api.php';
const H = { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0 (fix-baked-cache)' } };

let html = readFileSync(HTML_PATH, 'utf8');

// ── 1. Fix BAKED_WIKI_CACHE format ────────────────────────────────────────────
const cacheMatch = html.match(/const BAKED_WIKI_CACHE = (\{[^\n]+\});/);
if (!cacheMatch) { console.error('BAKED_WIKI_CACHE not found'); process.exit(1); }
const cache = JSON.parse(cacheMatch[1]);

let fixed = 0;
for (const [slug, val] of Object.entries(cache)) {
  if (val.url !== undefined) {
    // Wrong format: { url: '...', ts: ... } → { t: '...', s: {} }
    cache[slug] = { t: val.url, s: {} };
    fixed++;
  }
}
console.log(`Fixed ${fixed} BAKED_WIKI_CACHE entries (url → t)`);

const newCacheStr = 'const BAKED_WIKI_CACHE = ' + JSON.stringify(cache) + ';';
html = html.replace(/const BAKED_WIKI_CACHE = \{[^\n]+\};/, newCacheStr);

// ── 2. Resolve 3 lookbook equipped image URLs ─────────────────────────────────
const toResolve = {
  'cos-aurora':  'File:Aurora equipped (male).png',
  'cos-hiker':   'File:Hiker equipped (male).png',
  'cos-templar': 'File:Templar equipped (male).png',
};

console.log('\nResolving 3 equipped image URLs...');
const resolvedUrls = {};
for (const [setKey, fileTitle] of Object.entries(toResolve)) {
  try {
    const params = new URLSearchParams({
      action: 'query', prop: 'imageinfo', iiprop: 'url',
      titles: fileTitle, format: 'json', origin: '*', redirects: '1',
    });
    const r = await fetch(`${WIKI}?${params}`, H);
    const d = await r.json();
    const page = Object.values(d.query?.pages ?? {})[0];
    const url = page?.imageinfo?.[0]?.url;
    if (url) {
      resolvedUrls[setKey] = url;
      console.log(`  ✓ ${setKey}: ${url.slice(0, 80)}...`);
    } else {
      console.log(`  ✗ ${setKey}: no URL found for ${fileTitle}`);
    }
  } catch (e) {
    console.log(`  ✗ ${setKey}: fetch error — ${e.message}`);
  }
}

// ── 3. Splice resolved URLs into BAKED_SET_IMAGES ─────────────────────────────
if (Object.keys(resolvedUrls).length > 0) {
  const marker = 'const BAKED_SET_IMAGES = {';
  const mIdx = html.indexOf(marker);
  if (mIdx === -1) { console.error('BAKED_SET_IMAGES not found'); process.exit(1); }
  const bStart = html.indexOf('{', mIdx);

  // Find closing }; using bracket depth
  let depth = 0, blockEnd = -1;
  for (let j = bStart; j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (depth === 0) { blockEnd = j; break; } }
  }

  const insertion = '\n  // ── New wiki armory lookbook equipped images ──\n'
    + Object.entries(resolvedUrls)
        .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
        .join('\n')
    + '\n';

  html = html.slice(0, blockEnd) + insertion + html.slice(blockEnd);
  console.log(`\nAdded ${Object.keys(resolvedUrls).length} entries to BAKED_SET_IMAGES`);
} else {
  console.log('\nNo URLs resolved — skipping BAKED_SET_IMAGES update');
}

// ── 4. Syntax check ───────────────────────────────────────────────────────────
const scriptSrc = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
try { new Function(scriptSrc); } catch (e) {
  console.error('SYNTAX ERROR:', e.message); process.exit(1);
}

writeFileSync(HTML_PATH, html);
console.log('\nDone. File written successfully.');
