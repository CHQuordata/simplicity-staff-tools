import { readFileSync, writeFileSync } from 'fs';

const path = String.raw`C:\Users\chris\OneDrive\Desktop\Simplicity\Dashboards\rs3-asset-library.html`;
const WIKI_API = 'https://runescape.wiki/api.php';

const content = readFileSync(path, 'utf-8');
const cacheMatch = content.match(/const BAKED_WIKI_CACHE = (\{[^\n]+\});/);
const cache = JSON.parse(cacheMatch[1]);

const cosmeticSlugs = [];
for (const line of content.split('\n')) {
  if (!line.includes("cat:'cosmetic-weapon'")) continue;
  if (line.includes("id:'dis-")) continue;
  const m = line.match(/slug:(?:'([^']*)'|"([^"]*)")/);
  if (m) cosmeticSlugs.push(m[1] ?? m[2]);
}

const missing = cosmeticSlugs.filter(s => !cache[s]);
console.log(`Non-dis cosmetic weapons: ${cosmeticSlugs.length}, missing: ${missing.length}`);

function slugToBaseName(slug) {
  return slug.replace(/_\(override\)/gi, '').replace(/_\(re-colour\)/gi, '').trim();
}

const fileToSlug = {};
const fileTitles = [];
for (const slug of missing) {
  const base = slugToBaseName(slug);
  const pngFile = 'File:' + base + '_equipped.png';
  fileToSlug[pngFile] = slug;
  fileToSlug[pngFile.replace(/_/g, ' ')] = slug;
  fileTitles.push(pngFile);
}

const params = new URLSearchParams({
  action: 'query', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '200',
  titles: fileTitles.join('|'), format: 'json', origin: '*',
});

const res = await fetch(WIKI_API + '?' + params, { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0' } });
const data = await res.json();
const pages = data.query?.pages ?? {};

let hits = 0;
const newEntries = {};
for (const page of Object.values(pages)) {
  if ('missing' in page) { console.log('  MISS:', page.title); continue; }
  const slug = fileToSlug[page.title];
  if (!slug) { console.log('  NO SLUG FOR:', page.title); continue; }
  const thumbUrl = page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url ?? '';
  if (thumbUrl) { newEntries[slug] = { t: thumbUrl }; hits++; console.log('  HIT:', slug); }
}

console.log(`\nHits: ${hits}/${missing.length}`);
Object.assign(cache, newEntries);
const newContent = content.replace(/const BAKED_WIKI_CACHE = \{[^\n]+\};/, `const BAKED_WIKI_CACHE = ${JSON.stringify(cache)};`);
writeFileSync(path, newContent, 'utf-8');
console.log(`Done. Cache now: ${Object.keys(cache).length} entries`);
