#!/usr/bin/env node
// Adds all cosmetic sets with helm+body+legs (and equipped images) that are
// missing from LOOKBOOKS. Defaults every entry to theme:["cosmetic"].
// Run: node apply_missing_lookbooks.mjs

import { readFileSync, writeFileSync } from 'fs';

const HTML_PATH = './Dashboards/rs3-asset-library.html';
let html = readFileSync(HTML_PATH, 'utf8');

// ── Parse helpers ─────────────────────────────────────────────────────────────
function parseBlock(html, marker, open = '[') {
  const mIdx = html.indexOf(marker);
  const bStart = html.indexOf(open, mIdx);
  const close = open === '[' ? ']' : '}';
  let depth = 0, end = -1;
  for (let j = bStart; j < html.length; j++) {
    if (html[j] === open) depth++;
    else if (html[j] === close) { depth--; if (depth === 0) { end = j; break; } }
  }
  return { bStart, end, src: html.slice(bStart, end + 1) };
}

function parseLineStart(html, marker, open = '{') {
  // Finds marker only when it starts at column 0 (preceded by newline)
  let searchFrom = 0;
  while (true) {
    const idx = html.indexOf(marker, searchFrom);
    if (idx === -1) return null;
    if (idx === 0 || html[idx - 1] === '\n') {
      const bStart = html.indexOf(open, idx);
      const close = open === '{' ? '}' : ']';
      let depth = 0, end = -1;
      for (let j = bStart; j < html.length; j++) {
        if (html[j] === open) depth++;
        else if (html[j] === close) { depth--; if (depth === 0) { end = j; break; } }
      }
      return { bStart, end, src: html.slice(bStart, end + 1) };
    }
    searchFrom = idx + 1;
  }
}

const ITEMS        = (new Function('return ' + parseBlock(html, 'const ITEMS = [', '[').src))();
const LOOKBOOKS    = (new Function('return ' + parseBlock(html, 'const LOOKBOOKS = [', '[').src))();
const SET_EQUIPPED = (new Function('return ' + parseBlock(html, 'const SET_EQUIPPED_IMAGES = {', '{').src))();
const BAKED_SET    = (new Function('return ' + parseLineStart(html, 'const BAKED_SET_IMAGES = {', '{').src))();

const lookbookKeys = new Set(LOOKBOOKS.map(l => l.previewSetKey));

// ── Group cosmetic items by setKey ────────────────────────────────────────────
const COSMETIC_CATS = new Set(['cosmetic-armor', 'cosmetic-weapon', 'skilling-outfits']);
const bySet = new Map();
for (const it of ITEMS) {
  if (!COSMETIC_CATS.has(it.cat) || !it.setKey) continue;
  if (!bySet.has(it.setKey)) bySet.set(it.setKey, []);
  bySet.get(it.setKey).push(it);
}

// ── Find missing sets ─────────────────────────────────────────────────────────
const ARMOR_SLOTS = new Set(['helm','body','legs','boots','gloves','cape','shield','amulet']);
const missing = [];

for (const [key, items] of bySet) {
  if (lookbookKeys.has(key)) continue;
  const slots = new Set(items.map(i => i.slot));
  if (!slots.has('helm') || !slots.has('body') || !slots.has('legs')) continue;
  if (!SET_EQUIPPED[key] && !BAKED_SET[key]) continue; // no equipped image

  // Build slot→id map; prefer the item with the most complete name (fewest qualifiers)
  const bySlot = new Map();
  for (const it of items) {
    const slot = it.slot === 'weapon' ? '2h' : it.slot;
    if (!ARMOR_SLOTS.has(it.slot) && it.slot !== 'weapon') continue;
    const existing = bySlot.get(slot);
    if (!existing || it.name.length < existing.name.length) bySlot.set(slot, it);
  }
  missing.push({ key, bySlot });
}

console.log(`Sets to add to LOOKBOOKS: ${missing.length}`);

// ── Build insertion text ──────────────────────────────────────────────────────
const IDENT_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
const lines = missing.map(({ key, bySlot }) => {
  const pStr = [...bySlot.entries()]
    .map(([k, v]) => `${IDENT_RE.test(k) ? k : JSON.stringify(k)}:${JSON.stringify(v.id)}`)
    .join(', ');
  return `  { name: ${JSON.stringify(key)}, theme:["cosmetic"], previewSetKey:${JSON.stringify(key)},\n    pieces:{ ${pStr} } },`;
});

// ── Splice into LOOKBOOKS ─────────────────────────────────────────────────────
const lbBlock = parseBlock(html, 'const LOOKBOOKS = [', '[');
const before = html.slice(0, lbBlock.end).trimEnd();
const needsComma = before.endsWith('}');
const insertion = (needsComma ? ',\n' : '\n')
  + '  // ── Auto-generated: cosmetic sets with helm+body+legs ──\n'
  + lines.join('\n') + '\n';
html = html.slice(0, lbBlock.end) + insertion + html.slice(lbBlock.end);

// ── Syntax check ──────────────────────────────────────────────────────────────
const scriptSrc = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
try { new Function(scriptSrc); } catch (e) { console.error('SYNTAX ERROR:', e.message); process.exit(1); }
console.log('✓ Syntax check passed');

writeFileSync(HTML_PATH, html);
console.log('Done →', HTML_PATH);
