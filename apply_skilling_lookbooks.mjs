#!/usr/bin/env node
// Adds skilling outfits to the lookbook:
//   - Assigns setKey to each item in ITEMS
//   - Adds SET_META, SET_EQUIPPED_IMAGES, BAKED_SET_IMAGES, LOOKBOOKS entries
// Criteria: outfit must have helm+body+legs at minimum
// Run: node apply_skilling_lookbooks.mjs

import { readFileSync, writeFileSync } from 'fs';

const HTML_PATH = './Dashboards/rs3-asset-library.html';
const WIKI = 'https://runescape.wiki/api.php';
const H = { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0 (skilling-lookbooks)' } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Outfit definitions ────────────────────────────────────────────────────────
// setKey, display name, item IDs, wiki name for equipped image probing, tags
const OUTFITS = [
  { key: 'skill-arch',        name: "Archaeologist's",  wikiName: "Archaeologist's outfit", tags: ['archaeology','skilling','xp'],
    ids: ['arch-hat','arch-jacket','arch-trousers','arch-boots'] },
  { key: 'skill-artisan',     name: "Artisan's",        wikiName: "Artisan's outfit",       tags: ['crafting','skilling','xp'],
    ids: ['artisan-helm','artisan-body','artisan-legs','artisan-gloves'] },
  { key: 'skill-ibis',        name: 'Black ibis',       wikiName: 'Black ibis outfit',      tags: ['thieving','skilling','xp'],
    ids: ['ibis-hat','ibis-body','ibis-legs','ibis-boots'] },
  { key: 'skill-blacksmith',  name: "Blacksmith's",     wikiName: "Blacksmith's outfit",    tags: ['smithing','skilling','xp'],
    ids: ['blacksmith-helmet','blacksmith-top','blacksmith-legs','blacksmith-gloves'] },
  { key: 'skill-botanist',    name: "Botanist's",       wikiName: "Botanist's outfit",      tags: ['farming','skilling','xp'],
    ids: ['botanist-hat','botanist-top','botanist-legs','botanist-gloves'] },
  { key: 'skill-constructor', name: "Constructor's",    wikiName: "Constructor's outfit",   tags: ['construction','skilling','xp'],
    ids: ['cons-hat','cons-top','cons-legs','cons-boots'] },
  { key: 'skill-diviner',     name: "Diviner's",        wikiName: "Diviner's outfit",       tags: ['divination','skilling','xp'],
    ids: ['diviner-headwear','diviner-top','diviner-bottoms','diviner-booties'] },
  { key: 'skill-farmer',      name: "Farmer's",         wikiName: "Farmer's outfit",        tags: ['farming','skilling','xp'],
    ids: ['farmer-hat','farmer-top','farmer-legs','farmer-boots'] },
  { key: 'skill-fishing',     name: 'Fishing',          wikiName: 'Fishing outfit',         tags: ['fishing','skilling','xp'],
    ids: ['fishing-hat','fishing-jacket','fishing-waders','fishing-boots'] },
  { key: 'skill-mining',      name: 'Golden mining',    wikiName: 'Golden mining suit',     tags: ['mining','skilling','xp'],
    ids: ['mining-helm','mining-top','mining-legs','mining-boots'] },
  { key: 'skill-lumber',      name: 'Lumberjack',       wikiName: 'Lumberjack outfit',      tags: ['woodcutting','skilling','xp'],
    ids: ['lumber-hat','lumber-top','lumber-legs','lumber-boots'] },
  { key: 'skill-runecrafter', name: 'Master runecrafter', wikiName: 'Master runecrafter robes', tags: ['runecrafting','skilling','xp'],
    ids: ['rc-hat','rc-robe','rc-skirt','rc-gloves'] },
  { key: 'skill-pyro',        name: 'Pyromancer',       wikiName: 'Pyromancer outfit',      tags: ['firemaking','skilling','xp'],
    ids: ['pyro-hood','pyro-top','pyro-legs','pyro-boots'] },
  { key: 'skill-ritual',      name: "Ritualist's",      wikiName: "Ritualist's outfit",     tags: ['necromancy','skilling','xp'],
    ids: ['ritual-hat','ritual-top','ritual-legs','ritual-boots'] },
  { key: 'skill-shark',       name: 'Shark',            wikiName: 'Shark outfit',           tags: ['fishing','skilling','xp'],
    ids: ['shark-hat','shark-top','shark-legs','shark-boots'] },
  { key: 'skill-chef',        name: "Sous chef's",      wikiName: "Sous chef's outfit",     tags: ['cooking','skilling','xp'],
    ids: ['chef-hat','chef-top','chef-legs','chef-boots'] },
];

// ── Probe equipped images ─────────────────────────────────────────────────────
async function resolveFileUrl(title) {
  const p = new URLSearchParams({ action:'query', prop:'imageinfo', iiprop:'url',
    titles: title, format:'json', origin:'*', redirects:'1' });
  const d = await (await fetch(`${WIKI}?${p}`, H)).json();
  const page = Object.values(d.query?.pages ?? {})[0];
  return page?.imageinfo?.[0]?.url ?? null;
}

console.log('Probing equipped images for', OUTFITS.length, 'outfits...');
for (const outfit of OUTFITS) {
  const candidates = [
    `File:${outfit.wikiName} equipped (male).png`,
    `File:${outfit.wikiName} equipped.png`,
    `File:${outfit.name} outfit equipped (male).png`,
    `File:${outfit.name} outfit equipped.png`,
    `File:${outfit.name} equipped (male).png`,
    `File:${outfit.name} equipped.png`,
  ];
  outfit.equippedFile = null;
  outfit.equippedUrl  = null;
  for (const c of candidates) {
    const url = await resolveFileUrl(c);
    if (url) { outfit.equippedFile = c; outfit.equippedUrl = url; break; }
  }
  console.log(`  ${outfit.key}: ${outfit.equippedFile ?? 'NOT FOUND'}`);
  await sleep(200);
}

const withImage = OUTFITS.filter(o => o.equippedUrl);
console.log(`\nEquipped images found: ${withImage.length}/${OUTFITS.length}`);

// ── Apply all changes ─────────────────────────────────────────────────────────
let html = readFileSync(HTML_PATH, 'utf8');

// ── 1. Update setKey on existing ITEMS ───────────────────────────────────────
// Build id→outfit map
const idToOutfit = new Map();
for (const outfit of OUTFITS) {
  for (const id of outfit.ids) idToOutfit.set(id, outfit);
}

// Items are on single lines ending with },
// We find the line by id, then insert ,setKey:... before the final },
let itemsUpdated = 0;
const lines = html.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Quick check: must contain 'id:' to be an item line
  if (!line.includes('id:')) continue;

  for (const [id, outfit] of idToOutfit) {
    const idPat = `id:'${id}'`;
    const idPatDbl = `id:"${id}"`;
    if (!line.includes(idPat) && !line.includes(idPatDbl)) continue;
    if (line.includes('setKey:')) continue; // already set

    // Insert ,setKey:... before the final },  (item close + comma)
    // Line ends like: ...,stats:{},cosmDesc:"..."},
    // We want: ...,stats:{},cosmDesc:"...",setKey:"skill-xxx"},
    const trailMatch = line.match(/^(.*?)(\},?\s*)$/);
    if (!trailMatch) continue;
    lines[i] = `${trailMatch[1]},setKey:${JSON.stringify(outfit.key)}${trailMatch[2]}`;
    itemsUpdated++;
    break;
  }
}
html = lines.join('\n');
console.log(`\nUpdated setKey on ${itemsUpdated} items`);

// ── 2. SET_META entries ───────────────────────────────────────────────────────
{
  const marker = 'const SET_META = {';
  const mIdx   = html.indexOf(marker);
  const bStart = html.indexOf('{', mIdx);
  let d = 0, end = -1;
  for (let j = bStart; j < html.length; j++) {
    if (html[j]==='{') d++; else if (html[j]==='}') { d--; if(!d){end=j;break;} }
  }
  const existing = html.slice(bStart, end);
  const toAdd = OUTFITS.filter(o => !existing.includes(JSON.stringify(o.key)));
  if (toAdd.length) {
    const insertion = '\n  // ── Skilling outfits ──\n'
      + toAdd.map(o => `  ${JSON.stringify(o.key)}:      [${JSON.stringify(o.name)},   0,   '🛠️'],`).join('\n') + '\n';
    html = html.slice(0, end) + insertion + html.slice(end);
    console.log(`Added ${toAdd.length} SET_META entries`);
  }
}

// ── 3. SET_EQUIPPED_IMAGES entries ────────────────────────────────────────────
{
  const marker = 'const SET_EQUIPPED_IMAGES = {';
  const mIdx   = html.indexOf(marker);
  const bStart = html.indexOf('{', mIdx);
  let d = 0, end = -1;
  for (let j = bStart; j < html.length; j++) {
    if (html[j]==='{') d++; else if (html[j]==='}') { d--; if(!d){end=j;break;} }
  }
  const existing = html.slice(bStart, end);
  const toAdd = OUTFITS.filter(o => o.equippedFile && !existing.includes(JSON.stringify(o.key)));
  if (toAdd.length) {
    const insertion = '\n  // ── Skilling outfits ──\n'
      + toAdd.map(o => `  ${JSON.stringify(o.key)}:     ${JSON.stringify(o.equippedFile)},`).join('\n') + '\n';
    html = html.slice(0, end) + insertion + html.slice(end);
    console.log(`Added ${toAdd.length} SET_EQUIPPED_IMAGES entries`);
  }
}

// ── 4. BAKED_SET_IMAGES entries (in actual JS constant, not template literal) ─
{
  // Use the line-start marker to find the actual const (not the one in template literal)
  const constantLine = 'const BAKED_SET_IMAGES = {';
  // Find the one that starts at column 0 (i.e. preceded by newline or start of string)
  let searchFrom = 0;
  let bsIdx = -1;
  while (true) {
    const idx = html.indexOf(constantLine, searchFrom);
    if (idx === -1) break;
    // Check it starts at beginning of a line
    if (idx === 0 || html[idx-1] === '\n') { bsIdx = idx; break; }
    searchFrom = idx + 1;
  }
  if (bsIdx === -1) { console.error('BAKED_SET_IMAGES constant not found'); process.exit(1); }

  const bStart = html.indexOf('{', bsIdx);
  let d = 0, end = -1;
  for (let j = bStart; j < html.length; j++) {
    if (html[j]==='{') d++; else if (html[j]==='}') { d--; if(!d){end=j;break;} }
  }
  const existing = html.slice(bStart, end);
  const toAdd = OUTFITS.filter(o => o.equippedUrl && !existing.includes(JSON.stringify(o.key)));
  if (toAdd.length) {
    const insertion = '\n  // ── Skilling outfits ──\n'
      + toAdd.map(o => `  ${JSON.stringify(o.key)}: ${JSON.stringify(o.equippedUrl)},`).join('\n') + '\n';
    html = html.slice(0, end) + insertion + html.slice(end);
    console.log(`Added ${toAdd.length} BAKED_SET_IMAGES entries`);
  }
}

// ── 5. LOOKBOOKS entries ──────────────────────────────────────────────────────
{
  // Parse existing ITEMS to get slot→id maps per outfit
  const mIdx2 = html.indexOf('const ITEMS = [');
  const bs2   = html.indexOf('[', mIdx2);
  let d2 = 0, be2 = -1;
  for (let j = bs2; j < html.length; j++) {
    if (html[j]==='[') d2++; else if (html[j]===']') { d2--; if(!d2){be2=j+1;break;} }
  }
  const ITEMS = (new Function('return ' + html.slice(bs2, be2)))();
  const byId = new Map(ITEMS.map(i => [i.id, i]));

  const lIdx = html.indexOf('const LOOKBOOKS = [');
  const lb   = html.indexOf('[', lIdx);
  let ld = 0, le = -1;
  for (let j = lb; j < html.length; j++) {
    if (html[j]==='[') ld++; else if (html[j]===']') { ld--; if(!ld){le=j;break;} }
  }

  // Check existing lookbooks
  const lbSrc = html.slice(lb, le);

  const IDENT_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  const newLookbooks = [];

  for (const outfit of OUTFITS.filter(o => o.equippedUrl)) {
    if (lbSrc.includes(JSON.stringify(outfit.key))) continue; // already there

    // Build pieces map
    const pieces = {};
    for (const id of outfit.ids) {
      const item = byId.get(id);
      if (!item) continue;
      const slot = item.slot;
      if (slot === '2h' || slot === 'weapon') pieces['2h'] = id;
      else pieces[slot] = id;
    }

    // Verify helm+body+legs
    if (!pieces.helm || !pieces.body || !pieces.legs) {
      console.log(`  Skipping ${outfit.key} — missing helm/body/legs`);
      continue;
    }

    const pStr = Object.entries(pieces)
      .map(([k,v]) => `${IDENT_RE.test(k) ? k : JSON.stringify(k)}:${JSON.stringify(v)}`)
      .join(', ');

    newLookbooks.push(
      `  { name: ${JSON.stringify(outfit.name)}, theme:["skilling"], previewSetKey:${JSON.stringify(outfit.key)},\n` +
      `    pieces:{ ${pStr} } },`
    );
  }

  if (newLookbooks.length) {
    const before = html.slice(0, le).trimEnd();
    const needsComma = before.endsWith('}');
    const insertion = (needsComma ? ',\n' : '\n')
      + '  // ── Skilling outfit lookbooks ──\n'
      + newLookbooks.join('\n') + '\n';
    html = html.slice(0, le) + insertion + html.slice(le);
    console.log(`Added ${newLookbooks.length} LOOKBOOKS entries`);
  }
}

// ── Syntax check ──────────────────────────────────────────────────────────────
const scriptSrc = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
try { new Function(scriptSrc); } catch(e) { console.error('SYNTAX ERROR:', e.message); process.exit(1); }
console.log('✓ Syntax check passed');

writeFileSync(HTML_PATH, html);
console.log('Done →', HTML_PATH);
