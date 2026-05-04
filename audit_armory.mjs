#!/usr/bin/env node
// Gap audit: compares dashboard functional items against RS3 wiki armour/weapon categories.
// Run: node audit_armory.mjs

import { readFileSync } from 'fs';

const WIKI = 'https://runescape.wiki/api.php';
const H = { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0 (armory-gap-audit)' } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 1. Extract functional ITEMS from dashboard ────────────────────────────────

const html = readFileSync('./Dashboards/rs3-asset-library.html', 'utf8');

const startMarker = 'const ITEMS = [';
const markerIdx = html.indexOf(startMarker);
const bracketStart = html.indexOf('[', markerIdx);

// Walk brackets to find the matching close
let depth = 0, blockEnd = -1;
for (let j = bracketStart; j < html.length; j++) {
  if (html[j] === '[') depth++;
  else if (html[j] === ']') { depth--; if (depth === 0) { blockEnd = j + 1; break; } }
}

const ITEMS = (new Function(`return ${html.slice(bracketStart, blockEnd)}`))();

const FUNCTIONAL_CATS = new Set([
  'melee-armor', 'range-armor', 'mage-armor',
  'necro-armor', 'hybrid-armor', 'weapons',
]);

const dashItems = ITEMS.filter(it => FUNCTIONAL_CATS.has(it.cat) && !it.isCosmetic);
console.log(`Dashboard functional items: ${dashItems.length}`);

// Normalize names for fuzzy matching
const normalize = s => s
  .toLowerCase()
  .replace(/['']/g, '')   // strip apostrophes
  .replace(/\s+/g, ' ')
  .trim();

const dashByName = new Map(dashItems.map(it => [normalize(it.name), it]));

// ── 2. Fetch wiki category members (with pagination) ─────────────────────────

async function getCategoryMembers(category) {
  const members = [];
  let cmcontinue;
  do {
    const params = new URLSearchParams({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmlimit: '500',
      cmnamespace: '0',
      format: 'json',
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

const CATEGORIES = [
  // Armour
  { wiki: 'Melee armour',       dashCat: 'melee-armor' },
  { wiki: 'Ranged armour',      dashCat: 'range-armor' },
  { wiki: 'Magic armour',       dashCat: 'mage-armor' },
  { wiki: 'Necromancy armour',  dashCat: 'necro-armor' },
  { wiki: 'Hybrid armour',      dashCat: 'hybrid-armor' },
  // Weapons
  { wiki: 'Melee weapons',      dashCat: 'weapons' },
  { wiki: 'Ranged weapons',     dashCat: 'weapons' },
  { wiki: 'Magic weapons',      dashCat: 'weapons' },
  { wiki: 'Necromancy weapons', dashCat: 'weapons' },
];

console.log('\nFetching wiki categories...');
const wikiItems = new Map(); // normalized name → { rawName, wikiCat, dashCat }

for (const { wiki, dashCat } of CATEGORIES) {
  process.stdout.write(`  ${wiki}... `);
  const members = await getCategoryMembers(wiki);
  console.log(`${members.length}`);
  for (const rawName of members) {
    // Skip disambiguation pages, sub-pages, and redirects (contain '/')
    if (rawName.includes('/')) continue;
    const norm = normalize(rawName);
    if (!wikiItems.has(norm)) {
      wikiItems.set(norm, { rawName, wikiCat: wiki, dashCat });
    }
  }
  await sleep(200);
}

console.log(`\nWiki items (deduplicated): ${wikiItems.size}`);

// ── 3. Diff ───────────────────────────────────────────────────────────────────

// Items in the wiki that aren't in the dashboard (grouped by wiki category)
const wikiOnly = new Map(); // wikiCat → [rawName]
for (const [norm, { rawName, wikiCat }] of wikiItems) {
  if (!dashByName.has(norm)) {
    (wikiOnly.get(wikiCat) ?? wikiOnly.set(wikiCat, []).get(wikiCat)).push(rawName);
  }
}

// Dashboard items not matched in any wiki category
const dashOnly = dashItems.filter(it => !wikiItems.has(normalize(it.name)));

// ── 4. Report ─────────────────────────────────────────────────────────────────

const total = [...wikiOnly.values()].reduce((s, a) => s + a.length, 0);
console.log(`\n${'═'.repeat(65)}`);
console.log(` WIKI ARMOUR → NOT IN DASHBOARD  (${total} items)`);
console.log(`${'═'.repeat(65)}`);

for (const { wiki } of CATEGORIES) {
  const names = wikiOnly.get(wiki);
  if (!names?.length) continue;
  console.log(`\n  ── ${wiki} (${names.length}) ──`);
  for (const n of names.sort()) console.log(`    • ${n}`);
}

console.log(`\n${'═'.repeat(65)}`);
console.log(` DASHBOARD → NOT IN WIKI CATEGORY  (${dashOnly.length} items)`);
console.log(`${'═'.repeat(65)}`);
const byDashCat = {};
for (const it of dashOnly) {
  (byDashCat[it.cat] ??= []).push(it);
}
for (const [cat, items] of Object.entries(byDashCat).sort()) {
  console.log(`\n  ── ${cat} ──`);
  for (const it of items.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))) {
    console.log(`    • T${it.tier}  ${it.name}`);
  }
}

console.log('\nDone.');
