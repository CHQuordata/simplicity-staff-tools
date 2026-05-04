#!/usr/bin/env node
// Repairs two issues with BAKED_SET_IMAGES:
//   1. Removes incorrectly injected content from bakeCacheToSource() template literal
//   2. Adds cos-aurora/hiker/templar to the actual BAKED_SET_IMAGES constant
// Run: node repair_baked_set_images.mjs

import { readFileSync, writeFileSync } from 'fs';

const HTML_PATH = './Dashboards/rs3-asset-library.html';
let html = readFileSync(HTML_PATH, 'utf8');

const NEW_ENTRIES = {
  'cos-aurora':  'https://runescape.wiki/images/Aurora_equipped_%28male%29.png?c1eba',
  'cos-hiker':   'https://runescape.wiki/images/Hiker_equipped_%28male%29.png?703a9',
  'cos-templar': 'https://runescape.wiki/images/Templar_equipped_%28male%29.png?62fb6',
};

// ── 1. Repair bakeCacheToSource() template literal ────────────────────────────
// Find the template literal that starts with `const BAKED_SET_IMAGES = {\n
// It's inside the bakeCacheToSource() function and got extra content inserted.
// The correct form should end with: \n};\`
const BAD_INJECTION =
  '\n  // ── New wiki armory lookbook equipped images ──\n' +
  '  "cos-aurora": "' + NEW_ENTRIES['cos-aurora'] + '",\n' +
  '  "cos-hiker": "' + NEW_ENTRIES['cos-hiker'] + '",\n' +
  '  "cos-templar": "' + NEW_ENTRIES['cos-templar'] + '",\n';

// The marker for the template literal line
const TMPL_MARKER = "const block = `const BAKED_SET_IMAGES = {\\n${lines.join(',\\n')}\\n";
const tmplIdx = html.indexOf(TMPL_MARKER);
if (tmplIdx === -1) { console.error('Template literal marker not found'); process.exit(1); }

const afterMarker = tmplIdx + TMPL_MARKER.length;
// After the marker we expect either `};` directly or the bad injection then `};`
const badStart = html.indexOf(BAD_INJECTION, afterMarker);
if (badStart !== -1 && badStart < afterMarker + 10) {
  // Remove the bad injection
  html = html.slice(0, badStart) + html.slice(badStart + BAD_INJECTION.length);
  console.log('✓ Removed bad injection from template literal');
} else {
  // Check if template literal is already clean
  const snippet = html.slice(afterMarker, afterMarker + 10);
  if (snippet.startsWith('};`')) {
    console.log('  Template literal already clean, skipping');
  } else {
    console.error('Unexpected content after template marker:', JSON.stringify(snippet));
    process.exit(1);
  }
}

// ── 2. Add entries to actual BAKED_SET_IMAGES constant ────────────────────────
// Locate the second occurrence of "const BAKED_SET_IMAGES = {" — the actual constant
// (the first is inside the bakeCacheToSource template literal)
const marker = 'const BAKED_SET_IMAGES = {';
const firstIdx  = html.indexOf(marker);
const secondIdx = html.indexOf(marker, firstIdx + marker.length);

const targetIdx = secondIdx !== -1 ? secondIdx : firstIdx;
console.log(`Found actual BAKED_SET_IMAGES at char index ${targetIdx}`);

const bStart = html.indexOf('{', targetIdx);
let depth = 0, blockEnd = -1;
for (let j = bStart; j < html.length; j++) {
  if (html[j] === '{') depth++;
  else if (html[j] === '}') { depth--; if (depth === 0) { blockEnd = j; break; } }
}
if (blockEnd === -1) { console.error('Could not find end of BAKED_SET_IMAGES'); process.exit(1); }

// Check which entries are already there
const existing = html.slice(bStart, blockEnd);
const insertion = Object.entries(NEW_ENTRIES)
  .filter(([k]) => !existing.includes(JSON.stringify(k)))
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join('\n');

if (!insertion) {
  console.log('  All 3 entries already in BAKED_SET_IMAGES, skipping');
} else {
  html = html.slice(0, blockEnd) + '\n  // ── New wiki armory lookbook equipped images ──\n' + insertion + '\n' + html.slice(blockEnd);
  console.log(`✓ Added entries to actual BAKED_SET_IMAGES`);
}

// ── 3. Syntax check ───────────────────────────────────────────────────────────
const scriptSrc = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
try { new Function(scriptSrc); } catch (e) {
  console.error('SYNTAX ERROR:', e.message); process.exit(1);
}
console.log('✓ Syntax check passed');

writeFileSync(HTML_PATH, html);
console.log('Done. File written.');
