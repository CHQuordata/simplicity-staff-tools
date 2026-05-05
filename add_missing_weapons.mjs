#!/usr/bin/env node
// Adds confirmed missing T75+ weapons to the dashboard.
// Fetches wiki thumbnails, inserts into ITEMS + BAKED_WIKI_CACHE.
// Run: node add_missing_weapons.mjs

import { readFileSync, writeFileSync } from 'fs';

const WIKI = 'https://runescape.wiki/api.php';
const H = { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0 (weapon-add)' } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Standard accuracy per tier (RS3 wiki standard values)
const TIER_ACC = {
  75:1666, 76:1708, 77:1764, 78:1806, 79:1862,
  80:1972, 81:2014, 82:2066, 83:2108, 84:2154,
  85:2208, 86:2264, 87:2318, 88:2364, 89:2412,
  90:2458, 91:2518, 92:2578, 93:2638, 94:2744,
  95:2849, 96:2908, 97:2962, 98:3019, 99:3075,
};

// Standard damage by tier + slot (fastest-speed mh/oh; average-speed 2h)
const TIER_DMG = {
  75: { mh:848, oh:424, '2h':1144 },
  78: { mh:902, oh:451, '2h':1234 },
  80: { mh:1014, oh:507, '2h':1467 },
  82: { mh:1068, oh:534, '2h':1537 },
  83: { mh:1090, oh:545, '2h':1560 },
  85: { mh:960,  oh:480, '2h':1469 },
  87: { mh:1175, oh:587, '2h':1573 },
  88: { mh:1195, oh:597, '2h':1586 },
  90: { mh:1102, oh:551, '2h':1622 },
  92: { mh:1228, oh:614, '2h':1786 },
  95: { mh:1502, oh:751, '2h':1924 },
};

function s(tier, slot) {
  const a = TIER_ACC[tier] || 2000;
  const d = TIER_DMG[tier] || TIER_DMG[90];
  const dmg = slot === 'shield' ? d.oh : (slot === '2h' ? d['2h'] : d.mh);
  return { accuracy: a, damage: dmg };
}

// ── Curated weapon list ───────────────────────────────────────────────────────
// id, name, tier, style ('melee'|'range'|'mage'|'necro'), slot, era, tags, slug
// Slot: 'weapon' = mainhand, 'shield' = offhand, '2h' = two-handed
const WEAPONS_TO_ADD = [
  // ── T75 ──────────────────────────────────────────────────────────────────
  { id:'abyssal-wand', name:'Abyssal wand', tier:75, style:'mage', slot:'weapon', era:'eoc',
    tags:['abyssal','wand','magic','dual-wield'], slug:'Abyssal_wand',
    stats:{ accuracy:1666, damage:848, speed:'fastest' } },
  { id:'zamorakian-spear', name:'Zamorakian spear', tier:75, style:'melee', slot:'weapon', era:'eoc',
    tags:['zamorak','spear','god-wars','stab'], slug:'Zamorakian_spear',
    stats:{ accuracy:1666, damage:960, speed:'average' } },
  { id:'saradomin-sword', name:'Saradomin sword', tier:75, style:'melee', slot:'weapon', era:'eoc',
    tags:['saradomin','sword','god-wars','slash'], slug:'Saradomin_sword',
    stats:{ accuracy:1666, damage:960, speed:'average' } },
  { id:'polypore-staff', name:'Polypore staff', tier:75, style:'mage', slot:'2h', era:'eoc',
    tags:['polypore','staff','magic','nature'], slug:'Polypore_staff',
    stats:{ accuracy:1666, damage:1144, speed:'average' } },
  { id:'korasi-sword', name:"Korasi's sword", tier:75, style:'melee', slot:'weapon', era:'eoc',
    tags:['korasi','sword','void','special','quest'], slug:"Korasi's_sword",
    stats:{ accuracy:1666, damage:960, speed:'average' } },
  // ── T80 ──────────────────────────────────────────────────────────────────
  { id:'chaotic-rapier', name:'Chaotic rapier', tier:80, style:'melee', slot:'weapon', era:'eoc',
    tags:['chaotic','dungeoneering','stab','dual-wield'], slug:'Chaotic_rapier',
    stats:{ accuracy:1972, damage:1014, speed:'fastest' } },
  { id:'oh-chaotic-rapier', name:'Off-hand chaotic rapier', tier:80, style:'melee', slot:'shield', era:'eoc',
    tags:['chaotic','dungeoneering','stab','dual-wield','offhand'], slug:'Off-hand_chaotic_rapier',
    stats:{ accuracy:1972, damage:507, speed:'fastest' } },
  { id:'chaotic-longsword', name:'Chaotic longsword', tier:80, style:'melee', slot:'weapon', era:'eoc',
    tags:['chaotic','dungeoneering','slash','dual-wield'], slug:'Chaotic_longsword',
    stats:{ accuracy:1972, damage:1014, speed:'fastest' } },
  { id:'oh-chaotic-longsword', name:'Off-hand chaotic longsword', tier:80, style:'melee', slot:'shield', era:'eoc',
    tags:['chaotic','dungeoneering','slash','dual-wield','offhand'], slug:'Off-hand_chaotic_longsword',
    stats:{ accuracy:1972, damage:507, speed:'fastest' } },
  { id:'chaotic-maul', name:'Chaotic maul', tier:80, style:'melee', slot:'2h', era:'eoc',
    tags:['chaotic','dungeoneering','crush','2h'], slug:'Chaotic_maul',
    stats:{ accuracy:1972, damage:1467, speed:'slow' } },
  { id:'chaotic-spear', name:'Chaotic spear', tier:80, style:'melee', slot:'2h', era:'eoc',
    tags:['chaotic','dungeoneering','stab','2h'], slug:'Chaotic_spear',
    stats:{ accuracy:1972, damage:1467, speed:'average' } },
  { id:'chaotic-cbow', name:'Chaotic crossbow', tier:80, style:'range', slot:'weapon', era:'eoc',
    tags:['chaotic','dungeoneering','crossbow','dual-wield','range'], slug:'Chaotic_crossbow',
    stats:{ accuracy:1972, damage:1014, speed:'fastest' } },
  { id:'oh-chaotic-cbow', name:'Off-hand chaotic crossbow', tier:80, style:'range', slot:'shield', era:'eoc',
    tags:['chaotic','dungeoneering','crossbow','dual-wield','range','offhand'], slug:'Off-hand_chaotic_crossbow',
    stats:{ accuracy:1972, damage:507, speed:'fastest' } },
  { id:'chaotic-staff', name:'Chaotic staff', tier:80, style:'mage', slot:'2h', era:'eoc',
    tags:['chaotic','dungeoneering','staff','2h'], slug:'Chaotic_staff',
    stats:{ accuracy:1972, damage:1467, speed:'average' } },
  { id:'virtus-wand', name:'Virtus wand', tier:80, style:'mage', slot:'weapon', era:'eoc',
    tags:['virtus','nex','wand','dual-wield','mage'], slug:'Virtus_wand',
    stats:{ accuracy:1972, damage:1014, speed:'fastest' } },
  { id:'virtus-book', name:'Virtus book', tier:80, style:'mage', slot:'shield', era:'eoc',
    tags:['virtus','nex','offhand','mage','dual-wield'], slug:'Virtus_book',
    stats:{ accuracy:1972, damage:507, speed:'fastest' } },
  { id:'zaryte-bow', name:'Zaryte bow', tier:80, style:'range', slot:'2h', era:'eoc',
    tags:['zaryte','nex','bow','2h','range'], slug:'Zaryte_bow',
    stats:{ accuracy:1972, damage:1467, speed:'average' } },
  // ── T85 GWD2 ─────────────────────────────────────────────────────────────
  { id:'blade-nymora', name:'Blade of Nymora', tier:85, style:'melee', slot:'weapon', era:'modern',
    tags:['nymora','twin-furies','gwd2','twinblade','dual-wield','purple'], slug:'Blade_of_Nymora',
    stats:{ accuracy:2208, damage:960, speed:'fastest' } },
  { id:'blade-avaryss', name:'Blade of Avaryss', tier:85, style:'melee', slot:'shield', era:'modern',
    tags:['avaryss','twin-furies','gwd2','twinblade','dual-wield','offhand','purple'], slug:'Blade_of_Avaryss',
    stats:{ accuracy:2208, damage:480, speed:'fastest' } },
  { id:'lava-whip', name:'Lava whip', tier:85, style:'melee', slot:'weapon', era:'modern',
    tags:['lava','vindicta','gwd2','whip','fire'], slug:'Lava_whip',
    stats:{ accuracy:2208, damage:960, speed:'average' } },
  { id:'ripper-claw', name:'Ripper claw', tier:85, style:'melee', slot:'weapon', era:'modern',
    tags:['ripper','gregorovic','gwd1','claw','dual-wield'], slug:'Ripper_claw',
    stats:{ accuracy:2208, damage:960, speed:'fastest' } },
  { id:'oh-ripper-claw', name:'Off-hand ripper claw', tier:85, style:'melee', slot:'shield', era:'modern',
    tags:['ripper','gregorovic','gwd1','claw','dual-wield','offhand'], slug:'Off-hand_ripper_claw',
    stats:{ accuracy:2208, damage:480, speed:'fastest' } },
  { id:'dragon-rider-lance', name:'Dragon Rider lance', tier:85, style:'melee', slot:'2h', era:'modern',
    tags:['dragon-rider','lance','elite-dungeon','2h'], slug:'Dragon_Rider_lance',
    stats:{ accuracy:2208, damage:1469, speed:'slow' } },
  { id:'shadow-glaive', name:'Shadow glaive', tier:85, style:'range', slot:'weapon', era:'modern',
    tags:['shadow','gregorovic','gwd1','glaive','dual-wield','ranged'], slug:'Shadow_glaive',
    stats:{ accuracy:2208, damage:960, speed:'fastest' } },
  { id:'oh-shadow-glaive', name:'Off-hand shadow glaive', tier:85, style:'range', slot:'shield', era:'modern',
    tags:['shadow','gregorovic','gwd1','glaive','dual-wield','ranged','offhand'], slug:'Off-hand_shadow_glaive',
    stats:{ accuracy:2208, damage:480, speed:'fastest' } },
  { id:'wyvern-cbow', name:'Wyvern crossbow', tier:85, style:'range', slot:'2h', era:'modern',
    tags:['wyvern','vindicta','gwd2','crossbow','2h','ranged'], slug:'Wyvern_crossbow',
    stats:{ accuracy:2208, damage:1469, speed:'average' } },
  { id:'strykebow', name:'Strykebow', tier:85, style:'range', slot:'2h', era:'modern',
    tags:['stryke','helwyr','gwd1','bow','2h','ranged'], slug:'Strykebow',
    stats:{ accuracy:2208, damage:1469, speed:'average' } },
  { id:'wand-cywir', name:'Wand of the Cywir elders', tier:85, style:'mage', slot:'weapon', era:'modern',
    tags:['cywir','helwyr','gwd1','wand','dual-wield','mage'], slug:'Wand_of_the_Cywir_elders',
    stats:{ accuracy:2208, damage:960, speed:'fastest' } },
  { id:'orb-cywir', name:'Orb of the Cywir elders', tier:85, style:'mage', slot:'shield', era:'modern',
    tags:['cywir','helwyr','gwd1','orb','dual-wield','mage','offhand'], slug:'Orb_of_the_Cywir_elders',
    stats:{ accuracy:2208, damage:480, speed:'fastest' } },
  { id:'staff-darkness', name:'Staff of darkness', tier:85, style:'mage', slot:'2h', era:'modern',
    tags:['darkness','staff','elite-dungeon','2h','mage'], slug:'Staff_of_darkness',
    stats:{ accuracy:2208, damage:1469, speed:'average' } },
  { id:'camel-staff', name:'Camel staff', tier:85, style:'mage', slot:'2h', era:'modern',
    tags:['camel','menaphos','staff','2h','mage'], slug:'Camel_staff',
    stats:{ accuracy:2208, damage:1469, speed:'average' } },
  { id:'tetsu-katana', name:'Tetsu katana', tier:85, style:'melee', slot:'weapon', era:'modern',
    tags:['tetsu','port','katana','dual-wield','melee'], slug:'Tetsu_katana',
    stats:{ accuracy:2208, damage:1144, speed:'average' } },
  { id:'tetsu-wakizashi', name:'Tetsu wakizashi', tier:85, style:'melee', slot:'shield', era:'modern',
    tags:['tetsu','port','wakizashi','dual-wield','melee','offhand'], slug:'Tetsu_wakizashi',
    stats:{ accuracy:2208, damage:572, speed:'average' } },
  { id:'seasinger-kiba', name:'Seasinger kiba', tier:85, style:'mage', slot:'weapon', era:'modern',
    tags:['seasinger','port','kiba','dual-wield','mage'], slug:'Seasinger_kiba',
    stats:{ accuracy:2208, damage:960, speed:'fastest' } },
  { id:'seasinger-makigai', name:'Seasinger makigai', tier:85, style:'mage', slot:'shield', era:'modern',
    tags:['seasinger','port','makigai','dual-wield','mage','offhand'], slug:'Seasinger_makigai',
    stats:{ accuracy:2208, damage:480, speed:'fastest' } },
  { id:'death-lotus-dart', name:'Death Lotus dart', tier:85, style:'range', slot:'weapon', era:'modern',
    tags:['death-lotus','port','dart','dual-wield','ranged'], slug:'Death_Lotus_dart',
    stats:{ accuracy:2208, damage:960, speed:'fastest' } },
  { id:'oh-death-lotus-dart', name:'Off-hand Death Lotus dart', tier:85, style:'range', slot:'shield', era:'modern',
    tags:['death-lotus','port','dart','dual-wield','ranged','offhand'], slug:'Off-hand_Death_Lotus_dart',
    stats:{ accuracy:2208, damage:480, speed:'fastest' } },
  // ── T87 Elite Dungeon 3 ───────────────────────────────────────────────────
  { id:'annihilation', name:'Annihilation', tier:87, style:'melee', slot:'2h', era:'modern',
    tags:['annihilation','ed3','elite-dungeon','2h','melee','dragon'], slug:'Annihilation',
    stats:{ accuracy:2318, damage:1573, speed:'slow' } },
  { id:'decimation', name:'Decimation', tier:87, style:'range', slot:'2h', era:'modern',
    tags:['decimation','ed3','elite-dungeon','2h','ranged','dragon'], slug:'Decimation',
    stats:{ accuracy:2318, damage:1573, speed:'slow' } },
  { id:'obliteration', name:'Obliteration', tier:87, style:'mage', slot:'2h', era:'modern',
    tags:['obliteration','ed3','elite-dungeon','2h','mage','dragon'], slug:'Obliteration',
    stats:{ accuracy:2318, damage:1573, speed:'slow' } },
  // ── T90 gaps ──────────────────────────────────────────────────────────────
  { id:'drygore-longsword', name:'Drygore longsword', tier:90, style:'melee', slot:'weapon', era:'modern',
    tags:['drygore','kalphite','teal','slash','dual-wield','dye-base'], slug:'Drygore_longsword',
    stats:{ accuracy:2458, damage:1102, speed:'fastest' } },
  { id:'oh-drygore-longsword', name:'Off-hand drygore longsword', tier:90, style:'melee', slot:'shield', era:'modern',
    tags:['drygore','kalphite','teal','slash','dual-wield','offhand','dye-base'], slug:'Off-hand_drygore_longsword',
    stats:{ accuracy:2458, damage:551, speed:'fastest' } },
  { id:'drygore-mace', name:'Drygore mace', tier:90, style:'melee', slot:'weapon', era:'modern',
    tags:['drygore','kalphite','teal','crush','dual-wield','dye-base'], slug:'Drygore_mace',
    stats:{ accuracy:2458, damage:1102, speed:'fastest' } },
  { id:'oh-drygore-mace', name:'Off-hand drygore mace', tier:90, style:'melee', slot:'shield', era:'modern',
    tags:['drygore','kalphite','teal','crush','dual-wield','offhand','dye-base'], slug:'Off-hand_drygore_mace',
    stats:{ accuracy:2458, damage:551, speed:'fastest' } },
  { id:'kalphite-defender', name:'Kalphite defender', tier:90, style:'melee', slot:'weapon', era:'modern',
    tags:['kalphite','kk','defender','melee'], slug:'Kalphite_defender',
    stats:{ accuracy:2458, damage:1102, speed:'fastest' } },
  { id:'kalphite-rebounder', name:'Kalphite rebounder', tier:90, style:'mage', slot:'shield', era:'modern',
    tags:['kalphite','kk','rebounder','mage','offhand'], slug:'Kalphite_rebounder',
    stats:{ accuracy:2458, damage:551, speed:'fastest' } },
  { id:'kalphite-repriser', name:'Kalphite repriser', tier:90, style:'range', slot:'shield', era:'modern',
    tags:['kalphite','kk','repriser','ranged','offhand'], slug:'Kalphite_repriser',
    stats:{ accuracy:2458, damage:551, speed:'fastest' } },
  // ── T92 gaps ──────────────────────────────────────────────────────────────
  { id:'abyssal-scourge', name:'Abyssal scourge', tier:92, style:'melee', slot:'weapon', era:'elite',
    tags:['abyssal','scourge','lords','whip','melee','dark'], slug:'Abyssal_scourge',
    stats:{ accuracy:2578, damage:1228, speed:'fastest' } },
  { id:'blightbound-cbow', name:'Blightbound crossbow', tier:92, style:'range', slot:'weapon', era:'elite',
    tags:['blightbound','crossbow','ed3','dual-wield','ranged','dye-base'], slug:'Blightbound_crossbow',
    stats:{ accuracy:2578, damage:1228, speed:'fastest' } },
  { id:'oh-blightbound-cbow', name:'Off-hand Blightbound crossbow', tier:92, style:'range', slot:'shield', era:'elite',
    tags:['blightbound','crossbow','ed3','dual-wield','ranged','offhand','dye-base'], slug:'Off-hand_Blightbound_crossbow',
    stats:{ accuracy:2578, damage:614, speed:'fastest' } },
  { id:'praesul-wand', name:'Wand of the praesul', tier:92, style:'mage', slot:'weapon', era:'elite',
    tags:['praesul','nex','wand','dual-wield','mage','dye-base'], slug:'Wand_of_the_praesul',
    stats:{ accuracy:2578, damage:1228, speed:'fastest' } },
  { id:'imperium-core', name:'Imperium core', tier:92, style:'mage', slot:'shield', era:'elite',
    tags:['imperium','nex','orb','dual-wield','mage','offhand','dye-base'], slug:'Imperium_core',
    stats:{ accuracy:2578, damage:614, speed:'fastest' } },
  { id:'staff-sliske', name:'Staff of Sliske', tier:92, style:'mage', slot:'2h', era:'elite',
    tags:['sliske','staff','ed3','2h','mage','dye-base'], slug:'Staff_of_Sliske',
    stats:{ accuracy:2578, damage:1786, speed:'average' } },
  // ── T95 gaps ──────────────────────────────────────────────────────────────
  { id:'dark-shard-leng', name:'Dark Shard of Leng', tier:95, style:'melee', slot:'weapon', era:'elite',
    tags:['leng','arch-glacor','dual-wield','melee','dual-wield'], slug:'Dark_Shard_of_Leng',
    stats:{ accuracy:2849, damage:1502, speed:'fastest' } },
  { id:'dark-sliver-leng', name:'Dark Sliver of Leng', tier:95, style:'melee', slot:'shield', era:'elite',
    tags:['leng','arch-glacor','dual-wield','melee','offhand'], slug:'Dark_Sliver_of_Leng',
    stats:{ accuracy:2849, damage:751, speed:'fastest' } },
  { id:'corruption-wand', name:'Corruption Wand', tier:95, style:'mage', slot:'weapon', era:'elite',
    tags:['corruption','rasial','wand','necromancy','mage','dual-wield'], slug:'Corruption_Wand',
    stats:{ accuracy:2849, damage:1502, speed:'fastest' } },
  { id:'corruption-orb', name:'Corruption Orb', tier:95, style:'mage', slot:'shield', era:'elite',
    tags:['corruption','rasial','orb','necromancy','mage','offhand'], slug:'Corruption_Orb',
    stats:{ accuracy:2849, damage:751, speed:'fastest' } },
  { id:'devourers-guard', name:"Devourer's Guard", tier:95, style:'necro', slot:'weapon', era:'elite',
    tags:['devourer','rasial','necromancy','dual-wield'], slug:"Devourer's_Guard",
    stats:{ accuracy:2849, damage:1502, speed:'fastest' } },
];

// ── Load HTML ─────────────────────────────────────────────────────────────────
const HTML_PATH = './Dashboards/rs3-asset-library.html';
let html = readFileSync(HTML_PATH, 'utf8');
const origLen = html.length;

// ── Parse BAKED_WIKI_CACHE ────────────────────────────────────────────────────
const cacheMatch = html.match(/const BAKED_WIKI_CACHE = (\{[^\n]+\});/);
if (!cacheMatch) { console.error('BAKED_WIKI_CACHE not found'); process.exit(1); }
const cache = JSON.parse(cacheMatch[1]);
const existingCacheSlugs = new Set(Object.keys(cache).map(k => k.toLowerCase()));

// ── Parse existing ITEMS to build slug/id collision set ───────────────────────
const mIdx = html.indexOf('const ITEMS = [');
const bs = html.indexOf('[', mIdx);
let depth = 0, itemsEnd = -1;
for (let j = bs; j < html.length; j++) {
  if (html[j]==='[') depth++; else if (html[j]===']') { depth--; if(!depth){itemsEnd=j;break;} }
}
const existingItems = (new Function('return ' + html.slice(bs, itemsEnd + 1)))();
const existingIds  = new Set(existingItems.map(i => i.id));
const existingSlugs = new Set(existingItems.map(i => (i.slug||'').toLowerCase()));

// Check for already-present items
const toAdd = WEAPONS_TO_ADD.filter(w => {
  if (existingIds.has(w.id)) { console.log(`SKIP (id exists): ${w.name}`); return false; }
  if (existingSlugs.has(w.slug.toLowerCase())) { console.log(`SKIP (slug exists): ${w.name}`); return false; }
  return true;
});
console.log(`Weapons to probe: ${toAdd.length}`);

// ── Probe wiki thumbnails ─────────────────────────────────────────────────────
async function getThumb(slug) {
  const p = new URLSearchParams({ action:'query', prop:'pageimages', piprop:'thumbnail',
    pithumbsize:'200', titles: slug.replace(/_/g,' '), format:'json', redirects:'1' });
  const d = await (await fetch(`${WIKI}?${p}`, H)).json();
  const pg = Object.values(d.query?.pages ?? {})[0];
  return pg?.thumbnail?.source ?? null;
}

console.log('\nProbing thumbnails...');
const thumbs = {};
for (let i = 0; i < toAdd.length; i++) {
  const w = toAdd[i];
  const thumb = await getThumb(w.slug);
  thumbs[w.slug] = thumb;
  const icon = thumb ? '✓' : '✗';
  console.log(`  ${icon} ${w.name}`);
  await sleep(150);
}

// ── Filter: only add weapons with confirmed images ────────────────────────────
const confirmed = toAdd.filter(w => thumbs[w.slug]);
const noImage   = toAdd.filter(w => !thumbs[w.slug]);
console.log(`\nConfirmed images: ${confirmed.length}/${toAdd.length}`);
if (noImage.length) {
  console.log('No image (skipped):');
  for (const w of noImage) console.log(`  • ${w.name}`);
}

if (!confirmed.length) { console.log('Nothing to add.'); process.exit(0); }

// ── Build ITEMS source lines ──────────────────────────────────────────────────
function slugToKey(slug) {
  return slug.replace(/ /g,'_');
}
function serializeItem(w) {
  const tagsStr = '[' + w.tags.map(t => `'${t}'`).join(',') + ']';
  const statsStr = `{accuracy:${w.stats.accuracy},damage:${w.stats.damage},speed:'${w.stats.speed}'}`;
  return `  {id:'${w.id}',name:${JSON.stringify(w.name)},cat:'weapons',slot:'${w.slot}',tier:${w.tier},style:'${w.style}',era:'${w.era}',tags:${tagsStr},slug:${JSON.stringify(slugToKey(w.slug))},stats:${statsStr}},`;
}

// ── Find insertion point: after the last cat:'weapons' line ───────────────────
// Locate the ITEMS block in the source to scope our search
const itemsBlockSrc = html.slice(bs, itemsEnd + 1);
const lines = itemsBlockSrc.split('\n');

// Find the last line index that contains cat:'weapons'
let lastWeaponLineIdx = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes("cat:'weapons'") || lines[i].includes('cat:"weapons"')) {
    lastWeaponLineIdx = i;
    break;
  }
}
if (lastWeaponLineIdx === -1) { console.error('Could not find last weapon line'); process.exit(1); }
console.log(`\nInserting ${confirmed.length} weapons after line ${lastWeaponLineIdx} of ITEMS block`);

// Group weapons to insert by style for readability
const byStyle = { melee:[], range:[], mage:[], necro:[] };
for (const w of confirmed) {
  (byStyle[w.style] || byStyle.melee).push(w);
}

const newLines = [];
// Add comment + entries
const styleLabels = { melee:'Melee', range:'Ranged', mage:'Magic', necro:'Necromancy' };
for (const [style, weapons] of Object.entries(byStyle)) {
  if (!weapons.length) continue;
  newLines.push(`  // ── Added ${styleLabels[style]} weapons ─────────────────────────────────────`);
  for (const w of weapons) newLines.push(serializeItem(w));
}

lines.splice(lastWeaponLineIdx + 1, 0, ...newLines);

const newItemsBlockSrc = lines.join('\n');
html = html.slice(0, bs) + newItemsBlockSrc + html.slice(itemsEnd + 1);
console.log(`Spliced ${newLines.length} lines into ITEMS block`);

// ── Update BAKED_WIKI_CACHE ───────────────────────────────────────────────────
let cacheAdded = 0;
for (const w of confirmed) {
  const key = slugToKey(w.slug);
  if (!cache[key]) {
    cache[key] = { t: thumbs[w.slug], s: {} };
    cacheAdded++;
  }
}
console.log(`Cache entries added: ${cacheAdded}`);
html = html.replace(/const BAKED_WIKI_CACHE = \{[^\n]+\};/,
  'const BAKED_WIKI_CACHE = ' + JSON.stringify(cache) + ';');

// ── Safety checks ──────────────────────────────────────────────────────────────
if (html.length > origLen + 50000) {
  console.error(`ABORT — file grew by ${html.length - origLen} bytes (max 50000)`);
  process.exit(1);
}
const scriptSrc = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
try { new Function(scriptSrc); } catch(e) { console.error('SYNTAX ERROR:', e.message); process.exit(1); }
console.log('✓ Syntax check passed');

writeFileSync(HTML_PATH, html);
console.log(`\nDone — added ${confirmed.length} weapons to dashboard → ${HTML_PATH}`);
console.log(`File size: ${origLen} → ${html.length} (+${html.length - origLen} bytes)`);
