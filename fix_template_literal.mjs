#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
const HTML_PATH = './Dashboards/rs3-asset-library.html';
let html = readFileSync(HTML_PATH, 'utf8');

// The bad template literal looks like:
//   const block = `const BAKED_SET_IMAGES = {\n${lines.join(',\n')}\n
//   // ── New wiki armory lookbook equipped images ──
//   "cos-aurora": "...",
//   "cos-hiker": "...",
//   "cos-templar": "...",
// };\`;
// It should be just one line ending with \n};\`;

const BAD_SUFFIX = '\n  // ── New wiki armory lookbook equipped images ──\n' +
  '  "cos-aurora": "https://runescape.wiki/images/Aurora_equipped_%28male%29.png?c1eba",\n' +
  '  "cos-hiker": "https://runescape.wiki/images/Hiker_equipped_%28male%29.png?703a9",\n' +
  '  "cos-templar": "https://runescape.wiki/images/Templar_equipped_%28male%29.png?62fb6",\n';

const anchor = "const block = `const BAKED_SET_IMAGES = {\\n${lines.join(',\\n')}\\n";
const anchorIdx = html.indexOf(anchor);
if (anchorIdx === -1) { console.error('anchor not found'); process.exit(1); }

const afterAnchor = anchorIdx + anchor.length;
if (html.startsWith(BAD_SUFFIX, afterAnchor)) {
  html = html.slice(0, afterAnchor) + html.slice(afterAnchor + BAD_SUFFIX.length);
  console.log('✓ Removed bad suffix from template literal');
} else {
  const snippet = html.slice(afterAnchor, afterAnchor + 50);
  console.log('Template literal after anchor:', JSON.stringify(snippet));
  if (snippet.startsWith('};`')) {
    console.log('  Already clean, no change needed');
  } else {
    console.error('Unexpected content, aborting');
    process.exit(1);
  }
}

const scriptSrc = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
try { new Function(scriptSrc); } catch (e) { console.error('SYNTAX ERROR:', e.message); process.exit(1); }
console.log('✓ Syntax check passed');
writeFileSync(HTML_PATH, html);
console.log('Done.');
