#!/usr/bin/env node
// Phase 1: Sort cosmetic-weapon ITEMS A-Z, fix modal getLargeThumb, re-probe
// sprite-only weapons for equipped images.
// Run: node fix_weapon_overrides.mjs

import { readFileSync, writeFileSync } from 'fs';

const HTML_PATH = './Dashboards/rs3-asset-library.html';
const WIKI = 'https://runescape.wiki/api.php';
const H = { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0 (weapon-audit)' } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

let html = readFileSync(HTML_PATH, 'utf8');

// ── Parse BAKED_WIKI_CACHE ────────────────────────────────────────────────────
const cacheMatch = html.match(/const BAKED_WIKI_CACHE = (\{[^\n]+\});/);
if (!cacheMatch) { console.error('BAKED_WIKI_CACHE not found'); process.exit(1); }
const cache = JSON.parse(cacheMatch[1]);

// ── Parse ITEMS block ─────────────────────────────────────────────────────────
const mIdx = html.indexOf('const ITEMS = [');
const bsItems = html.indexOf('[', mIdx);
let depth = 0, itemsEnd = -1;
for (let j = bsItems; j < html.length; j++) {
  if (html[j]==='[') depth++; else if (html[j]===']') { depth--; if(!depth){itemsEnd=j;break;} }
}
const ITEMS = (new Function('return ' + html.slice(bsItems, itemsEnd + 1)))();

// ── 1. Sort cosmetic-weapon items A-Z ────────────────────────────────────────
// Strategy: extract all cosmetic-weapon items from source lines, sort them,
// rebuild their section. We identify them by splitting the ITEMS block into lines
// and collecting lines that contain cat:'cosmetic-weapon' or cat:"cosmetic-weapon".

const allLines = html.slice(bsItems + 1, itemsEnd).split('\n');
const weaponLines = [];
const nonWeaponLines = [];
let inWeaponBlock = false;
let weaponComment = null;

for (const line of allLines) {
  const isWeapon = line.includes("cat:'cosmetic-weapon'") || line.includes('cat:"cosmetic-weapon"') || line.includes("cat: 'cosmetic-weapon'") || line.includes('cat: "cosmetic-weapon"');
  if (isWeapon) {
    weaponLines.push(line);
  } else {
    nonWeaponLines.push(line);
  }
}

console.log(`Weapon lines found: ${weaponLines.length}`);
console.log(`Non-weapon lines: ${nonWeaponLines.length}`);

// Extract name from each weapon line for sorting
function nameFromLine(line) {
  const m = line.match(/,name:(?:'([^']*)'|"([^"]*)")/);
  return m ? (m[1] || m[2]) : '';
}

weaponLines.sort((a, b) => {
  const na = nameFromLine(a), nb = nameFromLine(b);
  return na.localeCompare(nb, 'en', { sensitivity: 'base' });
});

// Rebuild: keep all non-weapon lines, then append sorted weapon lines at end
// Insert a comment header before weapon section
const weaponSectionComment = '  // ── Cosmetic weapon overrides (sorted A-Z) ─────────────────────────────';
const newItemsContent = '\n'
  + nonWeaponLines.filter(l => l.trim()).join('\n') + '\n'
  + weaponSectionComment + '\n'
  + weaponLines.join('\n') + '\n';

html = html.slice(0, bsItems + 1) + newItemsContent + html.slice(itemsEnd);
console.log(`✓ Sorted ${weaponLines.length} cosmetic-weapon items A-Z`);

// ── 2. Patch renderModalEquippedImage to use getLargeThumb ───────────────────
// Current: const bakedThumb = wikiCache[item.slug]?.thumbUrl;
//          el.innerHTML = `<img src="${bakedThumb}" ...>`
// Fix: use getLargeThumb(bakedThumb, 400) || bakedThumb
const OLD_MODAL = `  const bakedThumb = wikiCache[item.slug]?.thumbUrl;
  if (bakedThumb) {
    el.style.display = '';
    el.innerHTML = \`<img src="\${bakedThumb}" style="max-width:100%;max-height:420px;object-fit:contain;border-radius:6px;" alt="\${item.name} equipped">\`;
  }`;
const NEW_MODAL = `  const bakedThumb = wikiCache[item.slug]?.thumbUrl;
  if (bakedThumb) {
    const displayThumb = getLargeThumb(bakedThumb, 400) || bakedThumb;
    el.style.display = '';
    el.innerHTML = \`<img src="\${displayThumb}" style="max-width:100%;max-height:420px;object-fit:contain;border-radius:6px;" alt="\${item.name} equipped">\`;
  }`;

if (html.includes(OLD_MODAL)) {
  html = html.replace(OLD_MODAL, NEW_MODAL);
  console.log('✓ Patched renderModalEquippedImage to use getLargeThumb(400)');
} else {
  console.log('⚠ Could not find modal placeholder code to patch — skipping');
}

// ── 3. Identify sprite-only weapons (60px thumbnails, no equipped image) ──────
const WEAPONS = ITEMS.filter(i => i.cat === 'cosmetic-weapon');
const spriteOnly = WEAPONS.filter(w => {
  const t = cache[w.slug]?.t || '';
  return t.includes('/thumb/') && t.includes('/60px-');
});
console.log(`\nSprite-only weapons (60px thumb, no equipped image): ${spriteOnly.length}`);

// ── 4. Probe wiki for equipped images for sprite-only weapons ─────────────────
if (spriteOnly.length > 0) {
  console.log('Probing for equipped images...');

  async function resolveFileUrl(title) {
    const p = new URLSearchParams({ action:'query', prop:'imageinfo', iiprop:'url',
      titles: title, format:'json', origin:'*', redirects:'1' });
    const d = await (await fetch(`${WIKI}?${p}`, H)).json();
    const page = Object.values(d.query?.pages ?? {})[0];
    return page?.imageinfo?.[0]?.url ?? null;
  }

  let upgraded = 0;
  for (const w of spriteOnly) {
    // Derive base name as the modal does (strip _(override), _(re-colour))
    const base = w.slug.replace(/_\(override\)/gi, '').replace(/_\(re-colour\)/gi, '').trim();
    const candidates = [
      `File:${base} equipped.png`,
      `File:${base} equipped (male).png`,
      `File:${base.replace(/_/g, ' ')} equipped.png`,
      `File:${base.replace(/_/g, ' ')} equipped (male).png`,
    ];
    let found = null;
    for (const c of candidates) {
      const url = await resolveFileUrl(c);
      if (url) { found = url; break; }
    }
    if (found) {
      // Upgrade the cache entry — replace the 60px sprite with full-res equipped image
      cache[w.slug] = { ...cache[w.slug], t: found };
      upgraded++;
      console.log(`  ✓ ${w.name}: upgraded to equipped image`);
    }
    await sleep(150);
  }
  console.log(`\nUpgraded ${upgraded}/${spriteOnly.length} sprite-only weapons to equipped images`);

  // Write upgraded BAKED_WIKI_CACHE back
  const newCacheStr = 'const BAKED_WIKI_CACHE = ' + JSON.stringify(cache) + ';';
  html = html.replace(/const BAKED_WIKI_CACHE = \{[^\n]+\};/, newCacheStr);
}

// ── Syntax check ──────────────────────────────────────────────────────────────
const scriptSrc = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
try { new Function(scriptSrc); } catch(e) { console.error('SYNTAX ERROR:', e.message); process.exit(1); }
console.log('✓ Syntax check passed');

writeFileSync(HTML_PATH, html);
console.log('\nDone →', HTML_PATH);
