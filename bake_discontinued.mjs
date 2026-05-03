import { readFileSync, writeFileSync } from 'fs';

const path = String.raw`C:\Users\chris\OneDrive\Desktop\Simplicity\Dashboards\rs3-asset-library.html`;
const WIKI_API = 'https://runescape.wiki/api.php';
const BATCH = 25; // halved — each slug now sends 2 file queries (png + gif)
const DELAY = 1500;

const content = readFileSync(path, 'utf-8');

// Extract BAKED_WIKI_CACHE
const cacheMatch = content.match(/const BAKED_WIKI_CACHE = (\{[^\n]+\});/);
if (!cacheMatch) { console.error('BAKED_WIKI_CACHE not found'); process.exit(1); }
const existingCache = JSON.parse(cacheMatch[1]);
console.log(`Existing cache: ${Object.keys(existingCache).length} entries`);

// Get all discontinued weapon slugs (those starting with 'dis-' id prefix)
const discSlugs = [];
for (const line of content.split('\n')) {
  if (!line.includes("id:'dis-")) continue;
  const m = line.match(/slug:(?:'([^']*)'|"([^"]*)")/);
  if (m) discSlugs.push(m[1] ?? m[2]);
}
console.log(`Discontinued weapon slugs: ${discSlugs.length}`);

// Re-process ALL disc slugs to upgrade thumbnails and find GIFs
// (overwrites existing entries with improved data)
const toProcess = discSlugs;
console.log(`Processing all ${toProcess.length} for upgraded thumbs + GIF scan`);

// Build slug → base image name (strips override/re-colour suffixes)
function slugToBaseName(slug) {
  return slug
    .replace(/_\(override\)/gi, '')
    .replace(/_\(re-colour\)/gi, '')
    .trim();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const newEntries = {};
const totalBatches = Math.ceil(toProcess.length / BATCH);

for (let i = 0; i < toProcess.length; i += BATCH) {
  const batch = toProcess.slice(i, i + BATCH);
  const batchNum = Math.floor(i / BATCH) + 1;

  // Build file title → {slug, type} map for both .png and .gif
  const fileToMeta = {};
  const fileTitles = [];

  for (const slug of batch) {
    const base = slugToBaseName(slug);
    const pngFile = 'File:' + base + '_equipped.png';
    const gifFile = 'File:' + base + '_equipped.gif';

    for (const f of [pngFile, gifFile]) {
      const type = f.endsWith('.gif') ? 'gif' : 'png';
      fileToMeta[f] = { slug, type };
      fileToMeta[f.replace(/_/g, ' ')] = { slug, type }; // API returns spaces
      fileTitles.push(f);
    }
  }

  const params = new URLSearchParams({
    action:     'query',
    prop:       'imageinfo',
    iiprop:     'url',
    iiurlwidth: '200',         // larger thumbnail for better quality
    titles:     fileTitles.join('|'),
    format:     'json',
    origin:     '*',
  });

  try {
    const res = await fetch(`${WIKI_API}?${params}`, {
      headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const pages = data.query?.pages ?? {};
    let pngHits = 0, gifHits = 0;

    for (const page of Object.values(pages)) {
      if ('missing' in page) continue;
      const meta = fileToMeta[page.title];
      if (!meta) continue;
      const { slug, type } = meta;

      const thumbUrl = page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url ?? '';
      if (!thumbUrl) continue;

      if (!newEntries[slug]) newEntries[slug] = {};

      if (type === 'png') {
        newEntries[slug].t = thumbUrl;
        pngHits++;
      } else {
        // Store gif as filename (without File: prefix) — matches how pets store gifs
        const gifName = slugToBaseName(slug) + '_equipped';
        if (!newEntries[slug].g) newEntries[slug].g = [];
        if (!newEntries[slug].g.includes(gifName)) newEntries[slug].g.push(gifName);
        gifHits++;
      }
    }

    console.log(`  Batch ${batchNum}/${totalBatches}: ${pngHits} png, ${gifHits} gif hits`);
  } catch (e) {
    console.warn(`  Batch ${batchNum}/${totalBatches} FAILED: ${e.message}`);
    await sleep(3000);
    continue;
  }

  if (i + BATCH < toProcess.length) await sleep(DELAY);
}

console.log(`\nFetched ${Object.keys(newEntries).length} total entries`);
const gifCount = Object.values(newEntries).filter(e => e.g?.length).length;
console.log(`  ${gifCount} have GIF animations`);

Object.assign(existingCache, newEntries);
const cacheJson = JSON.stringify(existingCache);
const newContent = content.replace(/const BAKED_WIKI_CACHE = \{[^\n]+\};/, `const BAKED_WIKI_CACHE = ${cacheJson};`);
if (newContent === content && Object.keys(newEntries).length > 0) { console.error('Replacement failed'); process.exit(1); }
writeFileSync(path, newContent, 'utf-8');
console.log(`Done! BAKED_WIKI_CACHE now has ${Object.keys(existingCache).length} entries.`);
