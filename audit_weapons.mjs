#!/usr/bin/env node
// Sweeps RS3 wiki weapon + tier categories, intersects them to find T75+ weapons
// missing from the dashboard. No batch tier-probe needed — tier comes from membership
// in the tier category directly.
// Outputs: Data/weapon_gap_report.txt
// Run: node audit_weapons.mjs

import { readFileSync, writeFileSync } from 'fs';

const WIKI = 'https://runescape.wiki/api.php';
const H = { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0 (weapon-gap-audit)' } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Load dashboard weapons ────────────────────────────────────────────────────
const html = readFileSync('./Dashboards/rs3-asset-library.html', 'utf8');
const mIdx = html.indexOf('const ITEMS = [');
const bs = html.indexOf('[', mIdx);
let depth = 0, blockEnd = -1;
for (let j = bs; j < html.length; j++) {
  if (html[j]==='[') depth++; else if (html[j]===']') { depth--; if(!depth){blockEnd=j+1;break;} }
}
const ITEMS = (new Function('return ' + html.slice(bs, blockEnd)))();
// Only compare against actual stat-bearing weapons — NOT cosmetic-weapon overrides
const dashWeapons = ITEMS.filter(i => i.cat === 'weapons');
const dashNames = new Set(dashWeapons.map(i => i.name.toLowerCase().replace(/['']/g,"'")));
const dashSlugs = new Set(dashWeapons.map(i => i.slug.toLowerCase()));

console.log(`Dashboard weapons (cat=weapons): ${dashWeapons.length}`);

// ── Fetch wiki category members ───────────────────────────────────────────────
async function getCatMembers(category) {
  const members = [];
  let cmcontinue;
  do {
    const p = new URLSearchParams({ action:'query', list:'categorymembers',
      cmtitle:`Category:${category}`, cmlimit:'500', cmnamespace:'0',
      format:'json', ...(cmcontinue ? {cmcontinue} : {}) });
    const d = await (await fetch(`${WIKI}?${p}`, H)).json();
    members.push(...(d.query?.categorymembers ?? []).map(m => m.title));
    cmcontinue = d.continue?.cmcontinue;
    if (cmcontinue) await sleep(300);
  } while (cmcontinue);
  return members;
}

// ── Phase 1: build weapon-type set ───────────────────────────────────────────
const WEAPON_CATS = [
  'Melee weapons',
  'Ranged weapons',
  'Magic weapons',
  'Necromancy weapons',
];

console.log('\nFetching weapon-type categories...');
const wikiWeapons = new Map(); // title → weapon category
for (const cat of WEAPON_CATS) {
  const members = await getCatMembers(cat);
  console.log(`  ${cat}: ${members.length} items`);
  for (const t of members) {
    if (!wikiWeapons.has(t)) wikiWeapons.set(t, cat);
  }
  await sleep(400);
}
console.log(`Total unique wiki weapons: ${wikiWeapons.size}`);

// ── Phase 2: build tier set from tier categories ──────────────────────────────
// Fetch each T75–T99 tier category; record title→tier mapping.
// An item can be in multiple tier cats (rare), keep the highest.
const TIERS = [75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99];

console.log('\nFetching tier categories...');
const tierOf = new Map(); // title → tier number
for (const tier of TIERS) {
  const members = await getCatMembers(`Tier ${tier} equipment`);
  if (members.length) console.log(`  T${tier}: ${members.length} items`);
  for (const t of members) {
    if (!tierOf.has(t) || tierOf.get(t) < tier) tierOf.set(t, tier);
  }
  await sleep(200);
}
console.log(`Total items with known tier: ${tierOf.size}`);

// ── Phase 3: intersect — weapons with tier >= 75 ──────────────────────────────
// ── Filter out variants, noted items, junk ───────────────────────────────────
const SKIP_RE = /\((noted|broken|inactive|degraded|damaged|uncharged|empty|used|worn|corrupt|temp|shadow\s+dye|blood\s+dye|ice\s+dye|barrows\s+dye|third\s+age\s+dye|augmented)\)/i;
const SKIP_SUFFIX = /\s*\+\s*\d+$|\s*\(e\)$|\s*\(i\)$/i;
const SKIP_EXACT = new Set(['Weapon','Melee weapon','Ranged weapon','Magic weapon','Necromancy weapon']);
const SKIP_PREFIX = /^(Augmented|Lucky)\s/i;
const DYE_VARIANT = /\s*\((Barrows|blood|shadow|ice|Third Age)\)$/i;
const SKIP_PASSIVE = /\s*\(passive\)$/i;
const SKIP_CLASS = /\(class \d+\)/i;
const TIER_VARIANT = /\s*\(tier \d+\)$/i;
const SKIP_GOLIATH = /^Goliath gloves/i;

function shouldSkip(t) {
  if (SKIP_EXACT.has(t)) return true;
  if (t.includes('/')) return true;
  if (SKIP_RE.test(t)) return true;
  if (SKIP_SUFFIX.test(t)) return true;
  if (SKIP_PREFIX.test(t)) return true;
  if (DYE_VARIANT.test(t)) return true;
  if (SKIP_PASSIVE.test(t)) return true;
  if (SKIP_CLASS.test(t)) return true;
  if (TIER_VARIANT.test(t)) return true;
  if (SKIP_GOLIATH.test(t)) return true;
  return false;
}

const MIN_TIER = 75;
const norm = s => s.toLowerCase().replace(/['']/g,"'").trim();

const notable = [];
for (const [title, weaponCat] of wikiWeapons) {
  const tier = tierOf.get(title);
  if (!tier || tier < MIN_TIER) continue;
  if (shouldSkip(title)) continue;
  const n = norm(title);
  const slug = title.replace(/ /g,'_').toLowerCase();
  if (dashNames.has(n) || dashSlugs.has(slug)) continue;
  notable.push({ name: title, cat: weaponCat, tier });
}

notable.sort((a, b) => (a.tier - b.tier) || a.name.localeCompare(b.name));
console.log(`\nMissing T${MIN_TIER}+ weapons: ${notable.length}`);

// Group by tier
const byTier = new Map();
for (const w of notable) {
  if (!byTier.has(w.tier)) byTier.set(w.tier, []);
  byTier.get(w.tier).push(w);
}

console.log('═'.repeat(60));
for (const [tier, weapons] of [...byTier.entries()].sort((a,b)=>a[0]-b[0])) {
  console.log(`\n  T${tier}:`);
  for (const w of weapons) console.log(`    • ${w.name}  [${w.cat}]`);
}

// Save report
const lines = [
  `RS3 Weapons Gap Report — ${new Date().toISOString().slice(0,10)}`,
  `Missing T${MIN_TIER}+ weapons not in dashboard: ${notable.length}`,
  '',
];
for (const [tier, weapons] of [...byTier.entries()].sort((a,b)=>a[0]-b[0])) {
  lines.push(`T${tier}:`);
  for (const w of weapons) lines.push(`  • ${w.name}  [${w.cat}]`);
  lines.push('');
}
writeFileSync('./Data/weapon_gap_report.txt', lines.join('\n'));
console.log('\nSaved → Data/weapon_gap_report.txt');
