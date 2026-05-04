#!/usr/bin/env node
// Gap audit: cosmetic armour/weapon overrides in dashboard vs RS3 wiki.
// Run: node audit_armory.mjs

import { readFileSync, writeFileSync } from 'fs';

const WIKI = 'https://runescape.wiki/api.php';
const H = { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0 (armory-gap-audit)' } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Variant patterns that represent augmented/trim/state noise ────────────────
// These are NOT distinct override items — skip them on the wiki side.
const VARIANT_RE = new RegExp(
  [
    /\s*\+\s*\d+$/,                          // +1, +2 … (augmented tiers)
    /\s*\([gtehi]\)$/,                        // (g) (t) (e) gold/trim/enchanted
    /\s*\(h[1-5]\)$/,                         // (h1)–(h5) heraldic
    /\s*\((charged|uncharged|empty|broken|inactive|degraded|damaged)\)$/i,
    /\s*(equipment|armour|armor|weapons?)\s*$/i, // meta hub-pages
  ].map(r => r.source).join('|')
);

// Names of meta/disambiguation pages to skip outright
const SKIP_EXACT = new Set(['Cosmetic override', 'Override']);

// Set-overview suffixes — these are bundle pages, not individual overrides
const SET_OVERVIEW_RE = /\s+(outfit|bundle|pack|set|collection|package)$/i;

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

const normalize = s => s
  .toLowerCase()
  .replace(/['']/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const dashByName = new Map(dashItems.map(it => [normalize(it.name), it]));

// ── 2. Fetch wiki cosmetic override category (paginated) ──────────────────────

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

console.log('\nFetching wiki cosmetic override categories...');

const WIKI_CATS = [
  { wiki: 'Cosmetic overrides', label: 'Cosmetic overrides' },
];

const wikiItems = new Map(); // normalized → { rawName, wikiCat }

for (const { wiki, label } of WIKI_CATS) {
  process.stdout.write(`  ${label}... `);
  const members = await getCategoryMembers(wiki);
  let kept = 0;
  for (const rawName of members) {
    if (rawName.includes('/')) continue;                // sub-pages
    if (SKIP_EXACT.has(rawName)) continue;              // meta pages
    if (VARIANT_RE.test(rawName)) continue;             // augment/trim noise
    if (SET_OVERVIEW_RE.test(rawName)) continue;        // bundle/set overview pages
    const norm = normalize(rawName);
    if (!wikiItems.has(norm)) {
      wikiItems.set(norm, { rawName, wikiCat: label });
      kept++;
    }
  }
  console.log(`${members.length} raw → ${kept} after filtering`);
  await sleep(200);
}

console.log(`Wiki cosmetic items (filtered): ${wikiItems.size}`);

// ── 3. Diff ───────────────────────────────────────────────────────────────────

// Build a set of "root prefixes" from dashboard names (first 2 words).
// This handles cases where the wiki uses "Aetherium Helm" but the dashboard
// stores it as "Aetherium helmet" / "Aetherium platebody" / etc.
const dashPrefixes = new Set(
  dashItems.map(it => normalize(it.name).split(' ').slice(0, 2).join(' '))
);

const wikiPrefix = rawName =>
  normalize(rawName).split(' ').slice(0, 2).join(' ');

// Wiki overrides not in dashboard — neither exact name nor 2-word prefix match
const wikiOnly = [];
for (const [norm, entry] of wikiItems) {
  if (!dashByName.has(norm) && !dashPrefixes.has(wikiPrefix(entry.rawName))) {
    wikiOnly.push(entry);
  }
}

// Dashboard cosmetics not matched in wiki (exact only — informational)
const dashOnly = dashItems.filter(it => !wikiItems.has(normalize(it.name)));

// ── 4. Report ─────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(65)}`);
console.log(` WIKI COSMETIC OVERRIDES → NOT IN DASHBOARD  (${wikiOnly.length})`);
console.log(`${'═'.repeat(65)}`);
for (const { rawName, wikiCat } of wikiOnly.sort((a, b) => a.rawName.localeCompare(b.rawName))) {
  console.log(`  • ${rawName}`);
}

console.log(`\n${'═'.repeat(65)}`);
console.log(` DASHBOARD COSMETICS → NOT IN WIKI CATEGORY  (${dashOnly.length})`);
console.log(`${'═'.repeat(65)}`);
const byDashCat = {};
for (const it of dashOnly) (byDashCat[it.cat] ??= []).push(it);
for (const [cat, items] of Object.entries(byDashCat).sort()) {
  console.log(`\n  ── ${cat} ──`);
  for (const it of items.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`    • ${it.name}`);
  }
}

// ── 5. Save report file ───────────────────────────────────────────────────────

const lines = [
  `RS3 Cosmetic Override Gap Report — ${new Date().toISOString().slice(0, 10)}`,
  `Dashboard cosmetic items : ${dashItems.length}`,
  `Wiki cosmetic items (filtered) : ${wikiItems.size}`,
  '',
  `${'═'.repeat(65)}`,
  ` WIKI → NOT IN DASHBOARD  (${wikiOnly.length})`,
  `${'═'.repeat(65)}`,
  ...wikiOnly.sort((a, b) => a.rawName.localeCompare(b.rawName)).map(e => `  • ${e.rawName}`),
  '',
  `${'═'.repeat(65)}`,
  ` DASHBOARD → NOT IN WIKI  (${dashOnly.length})`,
  `${'═'.repeat(65)}`,
  ...dashOnly.sort((a, b) => a.name.localeCompare(b.name)).map(it => `  [${it.cat}]  ${it.name}`),
];

const outPath = './Data/armory_gap_report.txt';
writeFileSync(outPath, lines.join('\n') + '\n');
console.log(`\nReport saved → ${outPath}`);
console.log('Done.');
