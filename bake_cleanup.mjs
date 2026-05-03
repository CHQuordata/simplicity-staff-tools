import { readFileSync, writeFileSync } from 'fs';
const path = String.raw`C:\Users\chris\OneDrive\Desktop\Simplicity\Dashboards\rs3-asset-library.html`;
const html = readFileSync(path, 'utf-8');

// ── 1. Bake Off-hand_Eldritch_crossbow with main-hand image (no off-hand image exists on wiki) ──
const wm = html.match(/const BAKED_WIKI_CACHE = (\{[^\n]+\});/);
const cache = JSON.parse(wm[1]);
cache['Off-hand_Eldritch_crossbow'] = { t: 'https://runescape.wiki/images/Eldritch_crossbow_equipped.png?5f033' };
console.log('Baked Off-hand_Eldritch_crossbow (using main-hand image)');

let newHtml = html.replace(/const BAKED_WIKI_CACHE = \{[^\n]+\};/, `const BAKED_WIKI_CACHE = ${JSON.stringify(cache)};`);

// ── 2. Remove setKey:'highwayman-purple' from items (no set preview image exists) ──
// Scope to ITEMS array only
const itemsStart = newHtml.indexOf('const ITEMS = [');
const itemsEnd = newHtml.indexOf('\n];', itemsStart) + 3;
let itemsBlock = newHtml.slice(itemsStart, itemsEnd);

const before = (itemsBlock.match(/setKey:'highwayman-purple'/g) || []).length;
itemsBlock = itemsBlock.replace(/,setKey:'highwayman-purple'/g, '');
const after = (itemsBlock.match(/setKey:'highwayman-purple'/g) || []).length;
console.log(`setKey:'highwayman-purple' removed: ${before} -> ${after}`);

newHtml = newHtml.slice(0, itemsStart) + itemsBlock + newHtml.slice(itemsEnd);

// ── Size guard ──
const delta = newHtml.length - html.length;
console.log(`Delta: ${delta} bytes`);
if (newHtml.length > html.length + 5000 || newHtml.length < html.length - 500) {
  console.error('Size sanity check failed'); process.exit(1);
}

writeFileSync(path, newHtml, 'utf-8');
console.log(`Done. Cache: ${Object.keys(cache).length} entries`);
