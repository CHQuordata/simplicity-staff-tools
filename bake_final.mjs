import { readFileSync, writeFileSync } from 'fs';
const path = String.raw`C:\Users\chris\OneDrive\Desktop\Simplicity\Dashboards\rs3-asset-library.html`;
const html = readFileSync(path, 'utf-8');

const WIKI = 'https://runescape.wiki/api.php';

// ── 1. Direct bake (URL already confirmed) ──
const directBake = {
  'Off-hand_Ascension_crossbow': 'https://runescape.wiki/images/Off-hand_ascension_crossbow_equipped.png?65749',
};

// ── 2. Probe wiki for remaining items ──
const probeMap = {
  'Off-hand_Eldritch_crossbow': [
    'File:Off-hand eldritch crossbow equipped.png',
    'File:Off-hand Eldritch crossbow equipped.png',
    'File:Off-hand eldritch crossbow detail.png',
    'File:Off-hand Eldritch crossbow detail.png',
    'File:Off-hand eldritch crossbow.png',
  ],
  'Shadowroot': [
    'File:Shadowroot.png',
    'File:Shadowroot chathead.png',
    'File:Shadowroot (pet).png',
    'File:Shadowroot pet chathead.png',
  ],
  'Baby_krakkling': [
    'File:Baby krakkling.png',
    'File:Baby krakkling chathead.png',
    'File:Baby Krakkling.png',
    'File:Krakkling.png',
  ],
};

// ── 3. Probe for highwayman-purple set preview ──
const hwTitles = [
  "File:Deadly Highwayman's Outfit (Purple) equipped (male).png",
  "File:Deadly Highwayman's outfit (Purple) equipped.png",
  "File:Deadly Highwayman outfit purple equipped.png",
  "File:Deadly Highwayman (purple) equipped.png",
  "File:Highwayman outfit (purple) equipped (male).png",
];

const allTitles = [...Object.values(probeMap).flat(), ...hwTitles];
const titleToSlug = {};
for (const [slug, titles] of Object.entries(probeMap)) for (const t of titles) titleToSlug[t] = slug;
for (const t of hwTitles) titleToSlug[t] = 'highwayman-purple-set';

const params = new URLSearchParams({ action:'query', prop:'imageinfo', iiprop:'url', titles: allTitles.join('|'), format:'json', origin:'*' });
const res = await fetch(`${WIKI}?${params}`, { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0' } });
const data = await res.json();

const normMap = {};
for (const n of data.query?.normalized ?? []) normMap[n.to] = n.from;

const wikiFound = {};
for (const page of Object.values(data.query?.pages ?? {})) {
  if ('missing' in page) continue;
  const url = page.imageinfo?.[0]?.url;
  if (!url) continue;
  const orig = normMap[page.title] ?? page.title;
  const slug = titleToSlug[orig] ?? titleToSlug[page.title];
  if (slug && !wikiFound[slug]) { wikiFound[slug] = url; console.log(`FOUND ${slug}: ${url}`); }
}

for (const slug of [...Object.keys(probeMap), 'highwayman-purple-set']) {
  if (!wikiFound[slug]) console.log(`DEAD  ${slug}`);
}

// ── 4. Bake BAKED_WIKI_CACHE ──
const wm = html.match(/const BAKED_WIKI_CACHE = (\{[^\n]+\});/);
const cache = JSON.parse(wm[1]);

for (const [slug, url] of Object.entries(directBake)) { cache[slug] = { t: url }; console.log(`BAKED direct ${slug}`); }
for (const [slug, url] of Object.entries(wikiFound)) {
  if (slug === 'highwayman-purple-set') continue;
  cache[slug] = { t: url };
  console.log(`BAKED wiki ${slug}`);
}

let newHtml = html.replace(/const BAKED_WIKI_CACHE = \{[^\n]+\};/, `const BAKED_WIKI_CACHE = ${JSON.stringify(cache)};`);

// ── 5. Bake BAKED_SET_IMAGES for highwayman-purple if found ──
const hwSetUrl = wikiFound['highwayman-purple-set'];
if (hwSetUrl) {
  // Find 3rd occurrence of BAKED_SET_IMAGES
  let siIdx = 0, found = 0;
  while ((siIdx = newHtml.indexOf('const BAKED_SET_IMAGES = {', siIdx + 1)) !== -1 && ++found < 3);
  const siEnd = newHtml.indexOf('\n};', siIdx) + 3;
  let siBlock = newHtml.slice(siIdx, siEnd);
  siBlock = siBlock.replace('"highwayman-blue":', `"highwayman-purple": "${hwSetUrl}",\n  "highwayman-blue":`);
  newHtml = newHtml.slice(0, siIdx) + siBlock + newHtml.slice(siEnd);
  console.log(`Added highwayman-purple to BAKED_SET_IMAGES: ${hwSetUrl}`);
} else {
  console.log('highwayman-purple set image not found on wiki — setKey left without preview');
}

// ── Size guard ──
const delta = newHtml.length - html.length;
console.log(`Delta: ${delta} bytes`);
if (newHtml.length > html.length + 5000 || newHtml.length < html.length - 500) {
  console.error('Size sanity check failed'); process.exit(1);
}

writeFileSync(path, newHtml, 'utf-8');
console.log(`Done. Cache: ${Object.keys(cache).length} entries`);
