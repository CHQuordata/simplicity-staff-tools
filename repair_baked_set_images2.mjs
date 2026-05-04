#!/usr/bin/env node
// Repairs BAKED_SET_IMAGES — adds cos-aurora/hiker/templar to the actual JS constant.
// Previous repair went into an HTML <code> element. This version uses the <script> boundary
// to find the correct occurrence.
// Run: node repair_baked_set_images2.mjs

import { readFileSync, writeFileSync } from 'fs';

const HTML_PATH = './Dashboards/rs3-asset-library.html';
let html = readFileSync(HTML_PATH, 'utf8');

const NEW_ENTRIES = {
  'cos-aurora':  'https://runescape.wiki/images/Aurora_equipped_%28male%29.png?c1eba',
  'cos-hiker':   'https://runescape.wiki/images/Hiker_equipped_%28male%29.png?703a9',
  'cos-templar': 'https://runescape.wiki/images/Templar_equipped_%28male%29.png?62fb6',
};

// ── 1. Remove the bad insertion from the <code> HTML element ──────────────────
const CODE_BAD =
  'const BAKED_SET_IMAGES = {…\n  // ── New wiki armory lookbook equipped images ──\n' +
  '  "cos-aurora": "' + NEW_ENTRIES['cos-aurora'] + '",\n' +
  '  "cos-hiker": "' + NEW_ENTRIES['cos-hiker'] + '",\n' +
  '  "cos-templar": "' + NEW_ENTRIES['cos-templar'] + '",\n' +
  '};';

// Actually let's just remove the injected lines around line 3801
// Find the surrounding HTML structure to do a precise removal
const badCodePrefix = 'const BAKED_SET_IMAGES = {&#8230;';
// The code element text may use HTML entity for … — let's search for the raw text
const SEARCH_START = 'const BAKED_SET_IMAGES = {…\n  // ── New wiki armory lookbook equipped images ──\n';
const idx = html.indexOf(SEARCH_START);
if (idx !== -1) {
  // Remove from the injected comment through the closing };
  const endMarker = '\n};';
  const endIdx = html.indexOf(endMarker, idx + SEARCH_START.length);
  if (endIdx !== -1) {
    const removal = SEARCH_START + html.slice(idx + SEARCH_START.length, endIdx + endMarker.length);
    html = html.slice(0, idx) + 'const BAKED_SET_IMAGES = {…\n};' + html.slice(idx + removal.length);
    console.log('✓ Removed bad injection from <code> element');
  } else {
    console.log('  Could not find end marker for code element fix');
  }
} else {
  // Try without the em-dash
  const SEARCH_ALT = html.indexOf('// ── New wiki armory lookbook equipped images ──\n  "cos-aurora"');
  if (SEARCH_ALT !== -1) {
    console.log('Found alternative bad injection at char', SEARCH_ALT);
    // Find the enclosing context
    const lineStart = html.lastIndexOf('\n', SEARCH_ALT);
    const badBlock = html.slice(lineStart, SEARCH_ALT + 200);
    console.log('Context:', JSON.stringify(badBlock.slice(0, 150)));
  } else {
    console.log('  No bad injection in code element found (already clean?)');
  }
}

// ── 2. Find the actual JS constant — within the <script> block ────────────────
const scriptStart = html.indexOf('<script>') + 8;
const scriptEnd   = html.indexOf('</script>');
const scriptSrc   = html.slice(scriptStart, scriptEnd);

const marker = 'const BAKED_SET_IMAGES = {';
const markerInScript = scriptSrc.indexOf(marker);
if (markerInScript === -1) { console.error('BAKED_SET_IMAGES not found in script'); process.exit(1); }
const absoluteMarker = scriptStart + markerInScript;
console.log(`BAKED_SET_IMAGES found in script at char ${absoluteMarker}`);

const bStart = html.indexOf('{', absoluteMarker);
let depth = 0, blockEnd = -1;
for (let j = bStart; j < html.length; j++) {
  if (html[j] === '{') depth++;
  else if (html[j] === '}') { depth--; if (depth === 0) { blockEnd = j; break; } }
}
if (blockEnd === -1) { console.error('Could not find end of BAKED_SET_IMAGES'); process.exit(1); }

// Check which entries are already there
const existing = html.slice(bStart, blockEnd);
const toAdd = Object.entries(NEW_ENTRIES).filter(([k]) => !existing.includes(JSON.stringify(k)));

if (toAdd.length === 0) {
  console.log('  All 3 entries already in BAKED_SET_IMAGES');
} else {
  const insertion = '\n  // ── New wiki armory lookbook equipped images ──\n'
    + toAdd.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')
    + '\n';
  html = html.slice(0, blockEnd) + insertion + html.slice(blockEnd);
  console.log(`✓ Added ${toAdd.length} entries to actual BAKED_SET_IMAGES`);
}

// ── 3. Syntax check ───────────────────────────────────────────────────────────
const newScript = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
try { new Function(newScript); } catch (e) {
  console.error('SYNTAX ERROR:', e.message); process.exit(1);
}
console.log('✓ Syntax check passed');

writeFileSync(HTML_PATH, html);
console.log('Done. File written.');
