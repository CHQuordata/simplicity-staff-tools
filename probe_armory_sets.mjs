#!/usr/bin/env node
// Phase 1: Probe wiki images for all 6+ piece missing cosmetic sets.
// Outputs Data/armory_probe_results.json
// Run: node probe_armory_sets.mjs

import { readFileSync, writeFileSync } from 'fs';

const WIKI = 'https://runescape.wiki/api.php';
const H = { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0 (armory-probe)' } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Slot detection ────────────────────────────────────────────────────────────
const SLOT_WORD_MAP = {
  helm:'helm', helmet:'helm', hood:'helm', cap:'helm', hat:'helm',
  coif:'helm', tiara:'helm', circlet:'helm', mask:'helm',
  headdress:'helm', visor:'helm', crown:'helm', headband:'helm', turban:'helm',
  body:'body', platebody:'body', cuirass:'body', jacket:'body', top:'body',
  chestplate:'body', hauberk:'body', tunic:'body', shirt:'body', tabard:'body',
  jerkin:'body', vest:'body', surcoat:'body', brassard:'body',
  legs:'legs', platelegs:'legs', greaves:'legs', chaps:'legs', trousers:'legs',
  bottom:'legs', skirt:'legs', leggings:'legs', plateskirt:'legs', shorts:'legs',
  pants:'legs', tassets:'legs', chainskirt:'legs',
  boots:'boots', shoes:'boots', footwraps:'boots', sandals:'boots',
  sabatons:'boots', slippers:'boots', pumps:'boots',
  gloves:'gloves', gauntlets:'gloves', handwraps:'gloves', bracers:'gloves',
  bracelets:'gloves', cuffs:'gloves', vambraces:'gloves',
  cape:'cape', cloak:'cape', wings:'cape', mantle:'cape', trail:'cape',
  necklace:'amulet', amulet:'amulet', gorget:'amulet', collar:'amulet',
  pendant:'amulet', wreath:'amulet',
  shield:'shield', buckler:'shield',
  scimitar:'weapon', sword:'weapon', bow:'weapon', staff:'weapon', wand:'weapon',
  crossbow:'weapon', longsword:'weapon', dagger:'weapon', mace:'weapon',
  axe:'weapon', battleaxe:'weapon', spear:'weapon', halberd:'weapon',
  lance:'weapon', maul:'weapon', rapier:'weapon', whip:'weapon', torch:'weapon',
  blade:'weapon', katana:'weapon', naginata:'weapon', cutlass:'weapon',
  javelin:'weapon', hammer:'weapon', hammers:'weapon', flail:'weapon',
  trident:'weapon', scythe:'weapon', needles:'weapon',
  arrows:'ammo', quiver:'ammo',
};

const WEAPON_SLOTS = new Set(['weapon','ammo']);
const ARMOR_SLOTS  = new Set(['helm','body','legs','boots','gloves','cape','amulet','shield']);

function detectSlot(pieceName) {
  const clean = pieceName.toLowerCase().replace(/\s*\([^)]+\)\s*$/, '').trim();
  const words = clean.split(/\s+/);
  const last  = words.at(-1);
  return SLOT_WORD_MAP[last] ?? 'helm';
}

function makeId(name) {
  return name.toLowerCase()
    .replace(/['']/g, '').replace(/\s*\([^)]+\)\s*/g, m => '-' + m.replace(/[()]/g,'').trim().replace(/\s+/g,'-'))
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function makeSetKey(setName) {
  return 'cos-' + setName.toLowerCase()
    .replace(/['']/g, '').replace(/\s*\([^)]+\)\s*/g, m => '-' + m.replace(/[()]/g,'').trim().replace(/\s+/g,'-'))
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function makeTags(setName) {
  return [...new Set(
    setName.toLowerCase().replace(/[''()]/g,'').replace(/[^a-z0-9\s]/g,' ')
      .split(/\s+/).filter(w => w.length > 2)
  )];
}

// ── Parse sets from gap report ────────────────────────────────────────────────
const txt  = readFileSync('./Data/armory_gap_sets.txt', 'utf8');
const rawSets = [];
let cur = null;
for (const line of txt.split('\n')) {
  const m = line.match(/^\s{2}(.+?)\s+\((\d+) pieces?\)/);
  if (m) { cur = { name: m[1], count: +m[2], pieces: [] }; rawSets.push(cur); }
  else if (cur && line.match(/^\s+•/)) cur.pieces.push(line.replace(/^\s+•\s+/, ''));
}

const targetSets = rawSets.filter(s => s.count >= 6).map(s => {
  const piecesWithSlots = s.pieces.map(name => ({
    name,
    slot: detectSlot(name),
    id: makeId(name),
    slug: name.replace(/ /g, '_'),
    isOffhand: /off-hand/i.test(name),
  }));
  const slots     = new Set(piecesWithSlots.map(p => p.slot));
  const hasArmor  = piecesWithSlots.some(p => ARMOR_SLOTS.has(p.slot));
  const hasWeapon = piecesWithSlots.some(p => WEAPON_SLOTS.has(p.slot));
  return {
    name: s.name,
    count: s.count,
    setKey: makeSetKey(s.name),
    tags: makeTags(s.name),
    piecesWithSlots,
    hasArmor, hasWeapon,
    isCompleteOutfit: slots.has('helm') && slots.has('body') && slots.has('legs'),
    isWeaponSet: !hasArmor && hasWeapon,
  };
});

console.log(`Sets to process: ${targetSets.length}`);

// ── Wiki probing ──────────────────────────────────────────────────────────────
async function batchPageImages(titles) {
  const p = new URLSearchParams({ action:'query', prop:'pageimages', pithumbsize:'400',
    titles: titles.join('|'), format:'json', origin:'*' });
  const d = await (await fetch(`${WIKI}?${p}`, H)).json();
  const result = {}, norm = {};
  for (const n of d.query?.normalized??[]) norm[n.to] = n.from;
  for (const pg of Object.values(d.query?.pages??{})) {
    const orig = norm[pg.title] ?? pg.title;
    if (pg.thumbnail) result[orig] = pg.thumbnail.source;
  }
  return result;
}

async function batchImageInfo(fileNames) {
  const p = new URLSearchParams({ action:'query', prop:'imageinfo', iiprop:'url',
    titles: fileNames.join('|'), format:'json', origin:'*' });
  const d = await (await fetch(`${WIKI}?${p}`, H)).json();
  const result = {}, norm = {};
  for (const n of d.query?.normalized??[]) norm[n.to] = n.from;
  for (const pg of Object.values(d.query?.pages??{})) {
    if ('missing' in pg) continue;
    const url = pg.imageinfo?.[0]?.url; if (!url) continue;
    result[norm[pg.title] ?? pg.title] = url;
  }
  return result;
}

async function runBatches(items, fn, size = 50) {
  const out = {};
  for (let i = 0; i < items.length; i += size) {
    Object.assign(out, await fn(items.slice(i, i + size)));
    if (i + size < items.length) await sleep(300);
  }
  return out;
}

// ── Step 1: Check which piece pages actually exist ────────────────────────────
async function batchPageExists(titles) {
  const p = new URLSearchParams({ action:'query', prop:'info', titles: titles.join('|'),
    format:'json', origin:'*' });
  const d = await (await fetch(`${WIKI}?${p}`, H)).json();
  const result = new Set();
  for (const pg of Object.values(d.query?.pages??{})) {
    if (!('missing' in pg)) result.add(pg.title);
  }
  return result;
}

const allPieceNames = [...new Set(targetSets.flatMap(s => s.piecesWithSlots.map(p=>p.name)))];
console.log(`\nChecking ${allPieceNames.length} piece pages exist...`);
const existingPages = new Set();
for (let i = 0; i < allPieceNames.length; i += 50) {
  const batch = await batchPageExists(allPieceNames.slice(i, i+50));
  for (const t of batch) existingPages.add(t);
  if (i + 50 < allPieceNames.length) await sleep(300);
}
console.log(`Pages exist: ${existingPages.size}`);

// ── Step 2: Probe icon images (pageimages + direct file fallback) ─────────────
console.log(`\nProbing piece icons...`);
const pieceImages = await runBatches(allPieceNames, batchPageImages);

// For pieces without a pageimage, try direct File: probes
const noImage = allPieceNames.filter(n => existingPages.has(n) && !pieceImages[n]);
const fileProbes = noImage.flatMap(n => [
  `File:${n} chathead.png`, `File:${n} detail.png`,
  `File:${n}.png`,          `File:${n} icon.png`,
]);
const fileResults = await runBatches(fileProbes, batchImageInfo);
for (const n of noImage) {
  const hit = [`File:${n} chathead.png`,`File:${n} detail.png`,`File:${n}.png`,`File:${n} icon.png`]
    .find(f => fileResults[f]);
  if (hit) pieceImages[n] = fileResults[hit];
}
console.log(`Icons found: ${Object.keys(pieceImages).length}`);

// Probe set equipped images (multiple candidate filenames per set)
const equippedProbes = targetSets.flatMap(s => [
  `File:${s.name} outfit equipped (male).png`,
  `File:${s.name} equipped (male).png`,
  `File:${s.name} armour equipped (male).png`,
  `File:${s.name} outfit equipped.png`,
  `File:${s.name} equipped.png`,
]);
console.log(`\nProbing ${equippedProbes.length} equipped image candidates...`);
const equippedImages = await runBatches(equippedProbes, batchImageInfo);
const equippedFound = Object.keys(equippedImages).length;
console.log(`Equipped images found: ${equippedFound}`);

// Annotate sets
for (const s of targetSets) {
  for (const p of s.piecesWithSlots) {
    p.imageUrl = pieceImages[p.name] ?? null;
    p.hasImage = !!p.imageUrl;
  }
  s.confirmedPieces = s.piecesWithSlots.filter(p => p.hasImage);

  // Find equipped image
  const candidates = [
    `File:${s.name} outfit equipped (male).png`,
    `File:${s.name} equipped (male).png`,
    `File:${s.name} armour equipped (male).png`,
    `File:${s.name} outfit equipped.png`,
    `File:${s.name} equipped.png`,
  ];
  const hit = candidates.find(c => equippedImages[c]);
  s.equippedFile = hit ?? null;   // e.g. "File:Aurora outfit equipped (male).png"
  s.equippedUrl  = hit ? equippedImages[hit] : null;
}

const results = {
  probeDate: new Date().toISOString().slice(0, 10),
  stats: {
    totalSets: targetSets.length,
    completeOutfits: targetSets.filter(s => s.isCompleteOutfit).length,
    weaponSets: targetSets.filter(s => s.isWeaponSet).length,
    setsWithEquipped: targetSets.filter(s => s.equippedFile).length,
    totalPieces: targetSets.reduce((n, s) => n + s.piecesWithSlots.length, 0),
    confirmedPieces: targetSets.reduce((n, s) => n + s.confirmedPieces.length, 0),
  },
  sets: targetSets,
};

writeFileSync('./Data/armory_probe_results.json', JSON.stringify(results, null, 2));
console.log('\nStats:', JSON.stringify(results.stats, null, 2));
console.log('\nSaved → Data/armory_probe_results.json');
