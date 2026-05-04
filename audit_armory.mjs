#!/usr/bin/env node
// Gap audit: cosmetic armour/weapon overrides in dashboard vs RS3 wiki.
// Outputs two reports:
//   Data/armory_gap_report.txt    — flat list of missing items
//   Data/armory_gap_sets.txt      — missing items grouped by set (sorted by piece count)
// Run: node audit_armory.mjs

import { readFileSync, writeFileSync } from 'fs';

const WIKI = 'https://runescape.wiki/api.php';
const H = { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0 (armory-gap-audit)' } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Variant / noise filters ───────────────────────────────────────────────────
const VARIANT_RE = new RegExp([
  /\s*\+\s*\d+$/,
  /\s*\([gtehi]\)$/,
  /\s*\(h[1-5]\)$/,
  /\s*\((charged|uncharged|empty|broken|inactive|degraded|damaged)\)$/i,
  /\s*(equipment|armour|armor|weapons?)\s*$/i,
].map(r => r.source).join('|'));

const SKIP_EXACT = new Set(['Cosmetic override', 'Override']);
const SET_OVERVIEW_RE = /\s+(outfit|bundle|pack|set|collection|package)$/i;

// ── Slot-suffix words (strip from right to derive the set key) ────────────────
const SLOT_WORDS = new Set([
  // Head
  'helm','helmet','hood','cap','hat','coif','tiara','circlet','mask',
  'headdress','visor','crown','headband','turban',
  // Body
  'body','platebody','cuirass','jacket','top','chestplate','hauberk',
  'tunic','shirt','robe','chest','tabard','jerkin','vest','surcoat','brassard',
  // Legs
  'legs','platelegs','greaves','chaps','trousers','bottom','skirt',
  'leggings','plateskirt','tassets','chainskirt','shorts','pants',
  // Feet
  'boots','shoes','footwraps','sandals','sabatons','slippers','pumps',
  // Hands
  'gloves','gauntlets','handwraps','bracers','bracelets','cuffs','vambraces',
  // Cape / back
  'cape','cloak','wings','backpack','mantle','tail','trail',
  // Off-hand / shield
  'shield','buckler',
  // Weapons (bare types)
  'scimitar','sword','bow','staff','wand','crossbow','longsword','dagger',
  'mace','axe','battleaxe','spear','halberd','lance','maul','rapier',
  'whip','torch','blade','katana','naginata','cutlass','javelin','arrows',
  'quiver','hammer','hammers','claws','needles','flail','trident','scythe',
  // Neck / misc
  'necklace','amulet','gorget','collar','pendant','wreath',
  // Generic qualifiers that appear last
  'override','adornment','gaze','arteria','aurora','aten','agony','amare',
]);

function setKeyOf(rawName) {
  // Strip trailing parenthetical: "Aurora Longsword (Wintumber Aurora)" → "Aurora Longsword"
  let name = rawName.replace(/\s*\([^)]+\)\s*$/, '').trim();
  const words = name.split(/\s+/);
  // Strip trailing slot words one at a time
  while (words.length > 1 && SLOT_WORDS.has(words.at(-1).toLowerCase())) {
    words.pop();
  }
  // Also strip a leading "Off-hand" if that's now the last token pair
  if (words.length > 1 && words.at(-1).toLowerCase() === 'off-hand') words.pop();
  return words.join(' ');
}

// ── 1. Extract cosmetic ITEMS from dashboard ──────────────────────────────────

const html = readFileSync('./Dashboards/rs3-asset-library.html', 'utf8');
const markerIdx = html.indexOf('const ITEMS = [');
const bracketStart = html.indexOf('[', markerIdx);
let depth = 0, blockEnd = -1;
for (let j = bracketStart; j < html.length; j++) {
  if (html[j] === '[') depth++;
  else if (html[j] === ']') { depth--; if (depth === 0) { blockEnd = j + 1; break; } }
}
const ITEMS = (new Function(`return ${html.slice(bracketStart, blockEnd)}`))();

const COSMETIC_CATS = new Set(['cosmetic-armor', 'cosmetic-weapon']);
const dashItems = ITEMS.filter(it => COSMETIC_CATS.has(it.cat));
console.log(`Dashboard cosmetic items: ${dashItems.length}  (armor: ${dashItems.filter(i=>i.cat==='cosmetic-armor').length}, weapon: ${dashItems.filter(i=>i.cat==='cosmetic-weapon').length})`);

const normalize = s => s.toLowerCase().replace(/['']/g, '').replace(/\s+/g, ' ').trim();
const dashByName = new Map(dashItems.map(it => [normalize(it.name), it]));
const dashPrefixes = new Set(dashItems.map(it => normalize(it.name).split(' ').slice(0, 2).join(' ')));
const wikiPrefix2 = rawName => normalize(rawName).split(' ').slice(0, 2).join(' ');

// ── 2. Fetch wiki cosmetic overrides (paginated) ──────────────────────────────

async function getCategoryMembers(category) {
  const members = [];
  let cmcontinue;
  do {
    const params = new URLSearchParams({
      action: 'query', list: 'categorymembers',
      cmtitle: `Category:${category}`, cmlimit: '500', cmnamespace: '0', format: 'json',
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    const r = await fetch(`${WIKI}?${params}`, H);
    const d = await r.json();
    members.push(...(d.query?.categorymembers ?? []).map(m => m.title));
    cmcontinue = d.continue?.cmcontinue;
    if (cmcontinue) await sleep(300);
  } while (cmcontinue);
  return members;
}

console.log('\nFetching wiki cosmetic override categories...');
const wikiItems = new Map();

for (const rawName of await getCategoryMembers('Cosmetic overrides')) {
  if (rawName.includes('/')) continue;
  if (SKIP_EXACT.has(rawName)) continue;
  if (VARIANT_RE.test(rawName)) continue;
  if (SET_OVERVIEW_RE.test(rawName)) continue;
  const norm = normalize(rawName);
  if (!wikiItems.has(norm)) wikiItems.set(norm, rawName);
}
console.log(`Wiki cosmetic items (filtered): ${wikiItems.size}`);

// ── 3. Diff ───────────────────────────────────────────────────────────────────

const wikiOnly = [];
for (const [norm, rawName] of wikiItems) {
  if (!dashByName.has(norm) && !dashPrefixes.has(wikiPrefix2(rawName))) {
    wikiOnly.push(rawName);
  }
}

// ── 4. Group missing items by set key ─────────────────────────────────────────

const setMap = new Map(); // setKey → [piece names]
for (const rawName of wikiOnly) {
  const key = setKeyOf(rawName);
  (setMap.get(key) ?? setMap.set(key, []).get(key)).push(rawName);
}

// Sort sets: most pieces first, then alphabetically
const sortedSets = [...setMap.entries()]
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

// ── 5. Console output — sets view ─────────────────────────────────────────────

console.log(`\nMissing items: ${wikiOnly.length}  →  ${sortedSets.length} distinct sets\n`);
console.log(`${'═'.repeat(65)}`);
console.log(` MISSING SETS  (by piece count, largest first)`);
console.log(`${'═'.repeat(65)}`);
for (const [key, pieces] of sortedSets) {
  console.log(`\n  ▸ ${key}  (${pieces.length} piece${pieces.length > 1 ? 's' : ''})`);
  for (const p of pieces.sort()) console.log(`      ${p}`);
}

// ── 6. Save reports ───────────────────────────────────────────────────────────

const flatLines = [
  `RS3 Cosmetic Override Gap Report — ${new Date().toISOString().slice(0, 10)}`,
  `Dashboard: ${dashItems.length}  |  Wiki (filtered): ${wikiItems.size}  |  Missing: ${wikiOnly.length}`,
  '',
  ...wikiOnly.sort().map(n => `  • ${n}`),
];
writeFileSync('./Data/armory_gap_report.txt', flatLines.join('\n') + '\n');

const setLines = [
  `RS3 Missing Cosmetic Sets Report — ${new Date().toISOString().slice(0, 10)}`,
  `${wikiOnly.length} missing items across ${sortedSets.length} sets (sorted by piece count)`,
  '',
];
for (const [key, pieces] of sortedSets) {
  setLines.push(`${'─'.repeat(55)}`);
  setLines.push(`  ${key}  (${pieces.length} pieces)`);
  for (const p of pieces.sort()) setLines.push(`    • ${p}`);
  setLines.push('');
}
writeFileSync('./Data/armory_gap_sets.txt', setLines.join('\n') + '\n');

console.log(`\nReports saved:`);
console.log(`  Data/armory_gap_report.txt  (flat list)`);
console.log(`  Data/armory_gap_sets.txt    (grouped by set)`);
console.log('Done.');
