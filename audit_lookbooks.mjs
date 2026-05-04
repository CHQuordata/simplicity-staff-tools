#!/usr/bin/env node
// Audits LOOKBOOKS against all three criteria:
//   1. Remove entries with no confirmed equipped image
//   2. Remove duplicate setKeys / names
//   3. Sort A-Z by name
// Run: node audit_lookbooks.mjs

import { readFileSync, writeFileSync } from 'fs';

const HTML_PATH = './Dashboards/rs3-asset-library.html';
let html = readFileSync(HTML_PATH, 'utf8');

// ── Parse helpers ─────────────────────────────────────────────────────────────
function parseBlock(src, marker, open = '[') {
  const mIdx = src.indexOf(marker);
  const bStart = src.indexOf(open, mIdx);
  const close = open === '[' ? ']' : '}';
  let depth = 0, end = -1;
  for (let j = bStart; j < src.length; j++) {
    if (src[j] === open) depth++;
    else if (src[j] === close) { depth--; if (depth === 0) { end = j; break; } }
  }
  return { bStart, end };
}

function parseLineStart(src, marker, open = '{') {
  let from = 0;
  while (true) {
    const idx = src.indexOf(marker, from);
    if (idx === -1) return null;
    if (idx === 0 || src[idx - 1] === '\n') {
      const bStart = src.indexOf(open, idx);
      const close = open === '{' ? '}' : ']';
      let depth = 0, end = -1;
      for (let j = bStart; j < src.length; j++) {
        if (src[j] === open) depth++;
        else if (src[j] === close) { depth--; if (depth === 0) { end = j; break; } }
      }
      return { bStart, end };
    }
    from = idx + 1;
  }
}

// Parse all required constants
const lbRange  = parseBlock(html, 'const LOOKBOOKS = [', '[');
const seRange  = parseBlock(html, 'const SET_EQUIPPED_IMAGES = {', '{');
const bsiRange = parseLineStart(html, 'const BAKED_SET_IMAGES = {', '{');

const LOOKBOOKS     = (new Function('return ' + html.slice(lbRange.bStart, lbRange.end + 1)))();
const SET_EQUIPPED  = (new Function('return ' + html.slice(seRange.bStart, seRange.end + 1)))();
const BAKED_SET     = (new Function('return ' + html.slice(bsiRange.bStart, bsiRange.end + 1)))();

console.log(`Starting LOOKBOOKS count: ${LOOKBOOKS.length}`);

// ── 1. Remove entries with no equipped image ──────────────────────────────────
const noImage = LOOKBOOKS.filter(lb => !BAKED_SET[lb.previewSetKey] && !SET_EQUIPPED[lb.previewSetKey]);
console.log(`\nNo equipped image: ${noImage.length}`);
for (const lb of noImage) console.log(`  REMOVE [${lb.previewSetKey}] ${lb.name}`);

let filtered = LOOKBOOKS.filter(lb => BAKED_SET[lb.previewSetKey] || SET_EQUIPPED[lb.previewSetKey]);

// ── 2. Remove duplicates ──────────────────────────────────────────────────────
// Deduplicate by previewSetKey first
const seenKeys  = new Map(); // setKey → first index
const seenNames = new Map(); // normalised name → first index
const dupKeys   = [];
const dupNames  = [];

const deduped = [];
for (const lb of filtered) {
  const normName = lb.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (seenKeys.has(lb.previewSetKey)) {
    dupKeys.push({ kept: seenKeys.get(lb.previewSetKey), dupe: lb });
    continue;
  }
  if (seenNames.has(normName)) {
    dupNames.push({ kept: seenNames.get(normName), dupe: lb });
    continue;
  }
  seenKeys.set(lb.previewSetKey, lb);
  seenNames.set(normName, lb);
  deduped.push(lb);
}

console.log(`\nDuplicate setKeys removed: ${dupKeys.length}`);
for (const { kept, dupe } of dupKeys)
  console.log(`  REMOVE [${dupe.previewSetKey}] ${dupe.name}  (kept: ${kept.name})`);

console.log(`Duplicate names removed:   ${dupNames.length}`);
for (const { kept, dupe } of dupNames)
  console.log(`  REMOVE [${dupe.previewSetKey}] ${dupe.name}  (kept: [${kept.previewSetKey}] ${kept.name})`);

// ── 3. Sort A-Z by name ───────────────────────────────────────────────────────
deduped.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
console.log(`\nFinal count: ${LOOKBOOKS.length} → ${deduped.length}`);
console.log(`Removed total: ${LOOKBOOKS.length - deduped.length} (${noImage.length} no-image, ${dupKeys.length} dup-key, ${dupNames.length} dup-name)`);

// ── Serialize and splice ──────────────────────────────────────────────────────
const IDENT_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
function serializeLookbook(lb) {
  const pStr = Object.entries(lb.pieces)
    .map(([k, v]) => `${IDENT_RE.test(k) ? k : JSON.stringify(k)}:${JSON.stringify(v)}`)
    .join(', ');
  return `  { name: ${JSON.stringify(lb.name)}, theme:${JSON.stringify(lb.theme)}, previewSetKey:${JSON.stringify(lb.previewSetKey)},\n    pieces:{ ${pStr} } }`;
}

const newBlock = '[\n' + deduped.map(serializeLookbook).join(',\n') + '\n]';

// Replace the entire LOOKBOOKS block (preserving const declaration)
const lbMarker = 'const LOOKBOOKS = ';
const lbDeclIdx = html.indexOf(lbMarker);
html = html.slice(0, lbDeclIdx + lbMarker.length)
  + newBlock
  + ';'
  + html.slice(lbRange.end + 1);

// ── Syntax check ──────────────────────────────────────────────────────────────
const scriptSrc = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
try { new Function(scriptSrc); } catch (e) { console.error('SYNTAX ERROR:', e.message); process.exit(1); }
console.log('✓ Syntax check passed');

writeFileSync(HTML_PATH, html);
console.log('Done →', HTML_PATH);
