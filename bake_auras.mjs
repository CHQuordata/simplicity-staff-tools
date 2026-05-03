import { readFileSync, writeFileSync } from 'fs';

const path = String.raw`C:\Users\chris\OneDrive\Desktop\Simplicity\Dashboards\rs3-asset-library.html`;
const WIKI_API = 'https://runescape.wiki/api.php';
const BATCH = 50;
const DELAY = 1200;

const content = readFileSync(path, 'utf-8');
const cacheMatch = content.match(/const BAKED_WIKI_CACHE = (\{[^\n]+\});/);
if (!cacheMatch) { console.error('BAKED_WIKI_CACHE not found'); process.exit(1); }
const cache = JSON.parse(cacheMatch[1]);
console.log(`Existing cache: ${Object.keys(cache).length} entries`);

// Extract all aura slugs
const auraSlugs = [];
for (const line of content.split('\n')) {
  if (!line.includes("cat:'auras'")) continue;
  const m = line.match(/slug:'([^']*)'/);
  if (m) auraSlugs.push(m[1]);
}
console.log(`Aura slugs found: ${auraSlugs.length}`);

const needsFetch = auraSlugs.filter(s => !cache[s]?.gu);
console.log(`Needing GIF fetch: ${needsFetch.length}`);
if (!needsFetch.length) { console.log('All auras already have GIFs baked.'); process.exit(0); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Two naming patterns per aura (priority 1 wins over priority 2):
//   1. "Name.gif"        — strip " aura" from the display name (e.g. Vampyrism.gif)
//   2. "Name effect.gif" — some auras use this suffix (e.g. Aegis effect.gif)
const requestMap = {}; // "File:Title.gif" -> { slug, priority }
for (const slug of needsFetch) {
  const base = slug.replace(/_aura$/i, '').replace(/_/g, ' ');
  requestMap[`File:${base}.gif`]        = { slug, priority: 1 };
  requestMap[`File:${base} effect.gif`] = { slug, priority: 2 };
}

const allTitles = Object.keys(requestMap);
const gifResults = {}; // slug -> { url, priority }

for (let i = 0; i < allTitles.length; i += BATCH) {
  const batch = allTitles.slice(i, i + BATCH);
  const batchNum = Math.floor(i / BATCH) + 1;
  const totalBatches = Math.ceil(allTitles.length / BATCH);

  const titleLookup = {};
  for (const t of batch) titleLookup[t] = requestMap[t];

  const params = new URLSearchParams({
    action: 'query',
    prop: 'imageinfo',
    iiprop: 'url',
    titles: batch.join('|'),
    format: 'json',
    origin: '*',
  });

  try {
    const res = await fetch(`${WIKI_API}?${params}`, {
      headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Apply wiki title normalizations so we can still match back to requestMap
    for (const n of data.query?.normalized ?? []) {
      if (titleLookup[n.from]) titleLookup[n.to] = titleLookup[n.from];
    }

    const pages = data.query?.pages ?? {};
    let hits = 0;
    for (const page of Object.values(pages)) {
      if ('missing' in page) continue;
      const url = page.imageinfo?.[0]?.url;
      if (!url) continue;
      const info = titleLookup[page.title];
      if (!info) continue;
      const { slug, priority } = info;
      if (!gifResults[slug] || priority < gifResults[slug].priority) {
        gifResults[slug] = { url, priority };
        hits++;
        console.log(`  GIF (p${priority}): ${slug} -> ${page.title}`);
      }
    }
    console.log(`Batch ${batchNum}/${totalBatches}: ${hits} new hits`);
  } catch (e) {
    console.warn(`Batch ${batchNum}/${totalBatches} FAILED: ${e.message}`);
    await sleep(3000);
    continue;
  }

  if (i + BATCH < allTitles.length) await sleep(DELAY);
}

const found = Object.keys(gifResults).length;
console.log(`\nGIFs found: ${found}/${needsFetch.length}`);
for (const slug of needsFetch) {
  if (!gifResults[slug]) console.log(`  NO GIF (skipped): ${slug}`);
}

if (!found) { console.log('No GIFs found — cache unchanged.'); process.exit(0); }

// Merge into cache — preserve existing t/s fields, add gu
for (const [slug, { url }] of Object.entries(gifResults)) {
  cache[slug] = { ...(cache[slug] || {}), gu: url };
}

const newContent = content.replace(
  /const BAKED_WIKI_CACHE = \{[^\n]+\};/,
  `const BAKED_WIKI_CACHE = ${JSON.stringify(cache)};`
);
if (newContent === content) { console.error('Replacement failed'); process.exit(1); }
writeFileSync(path, newContent, 'utf-8');
console.log(`Done. Cache now: ${Object.keys(cache).length} entries`);
