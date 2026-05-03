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

// Extract all dyed cosmetic-weapon slugs (cat:'cosmetic-weapon' with 'dyed' in tags)
const dyedSlugs = [];
for (const line of content.split('\n')) {
  if (!line.includes("cat:'cosmetic-weapon'")) continue;
  if (!line.includes("'dyed'")) continue;
  const m = line.match(/slug:'([^']*)'/);
  if (m) dyedSlugs.push(m[1]);
}
console.log(`Dyed weapon slugs found: ${dyedSlugs.length}`);

const missing = dyedSlugs.filter(s => !cache[s]);
console.log(`Not yet cached: ${missing.length}`);
if (!missing.length) { console.log('Nothing to fetch.'); process.exit(0); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const newEntries = {};
const totalBatches = Math.ceil(missing.length / BATCH);

for (let i = 0; i < missing.length; i += BATCH) {
  const batch = missing.slice(i, i + BATCH);
  const batchNum = Math.floor(i / BATCH) + 1;

  // Build title→slug map (slug uses underscores; wiki titles use spaces)
  const titleToSlug = {};
  for (const slug of batch) {
    const title = slug.replace(/_/g, ' ');
    titleToSlug[title] = slug;
  }

  const params = new URLSearchParams({
    action: 'query',
    prop: 'pageimages',
    pithumbsize: '200',
    redirects: '1',
    titles: batch.map(s => s.replace(/_/g, ' ')).join('|'),
    format: 'json',
    origin: '*',
  });

  try {
    const res = await fetch(`${WIKI_API}?${params}`, {
      headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Apply normalizations and redirects to title→slug map
    for (const n of data.query?.normalized ?? []) {
      const origSlug = n.from.replace(/ /g, '_');
      if (batch.includes(origSlug)) titleToSlug[n.to] = origSlug;
    }
    for (const r of data.query?.redirects ?? []) {
      if (titleToSlug[r.from]) titleToSlug[r.to] = titleToSlug[r.from];
    }

    const pages = data.query?.pages ?? {};
    let hits = 0;
    for (const page of Object.values(pages)) {
      if ('missing' in page) { console.log('  MISS:', page.title); continue; }
      const slug = titleToSlug[page.title] ?? page.title.replace(/ /g, '_');
      const thumb = page.thumbnail?.source ?? '';
      if (thumb) {
        newEntries[slug] = { t: thumb };
        hits++;
        console.log('  HIT:', slug);
      } else {
        console.log('  NO THUMB:', page.title);
      }
    }
    console.log(`Batch ${batchNum}/${totalBatches}: ${hits}/${batch.length} hits`);
  } catch (e) {
    console.warn(`Batch ${batchNum}/${totalBatches} FAILED: ${e.message}`);
    await sleep(3000);
    continue;
  }

  if (i + BATCH < missing.length) await sleep(DELAY);
}

console.log(`\nAPI hits: ${Object.keys(newEntries).length}/${missing.length}`);

// Fallback: for still-missing items use base weapon's cached thumbnail
// e.g. Zaros_godsword_(Blood_dye) → look up Zaros_godsword in cache
let fallbacks = 0;
for (const slug of missing) {
  if (newEntries[slug]) continue;
  const baseSlug = slug.replace(/_\([^)]+\)$/, '');
  const baseEntry = cache[baseSlug] ?? newEntries[baseSlug];
  if (baseEntry?.t) { newEntries[slug] = { t: baseEntry.t }; fallbacks++; }
}
console.log(`Fallback (base weapon thumb): ${fallbacks}`);

if (!Object.keys(newEntries).length) { console.log('No new entries — cache unchanged.'); process.exit(0); }
Object.assign(cache, newEntries);
const newContent = content.replace(/const BAKED_WIKI_CACHE = \{[^\n]+\};/, `const BAKED_WIKI_CACHE = ${JSON.stringify(cache)};`);
if (newContent === content) { console.error('Replacement failed'); process.exit(1); }
writeFileSync(path, newContent, 'utf-8');
console.log(`Done. Cache now: ${Object.keys(cache).length} entries`);
