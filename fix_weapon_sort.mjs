#!/usr/bin/env node
// Re-sorts the cosmetic-weapon section using apostrophe-normalised comparison.
import { readFileSync, writeFileSync } from 'fs';
const HTML_PATH = './Dashboards/rs3-asset-library.html';
let html = readFileSync(HTML_PATH, 'utf8');

const mIdx = html.indexOf('const ITEMS = [');
const bsItems = html.indexOf('[', mIdx);
let depth = 0, itemsEnd = -1;
for (let j = bsItems; j < html.length; j++) {
  if (html[j]==='[') depth++; else if (html[j]===']') { depth--; if(!depth){itemsEnd=j;break;} }
}

const allLines = html.slice(bsItems + 1, itemsEnd).split('\n');
const weaponLines = [], nonWeaponLines = [];
for (const line of allLines) {
  const isWeapon = /cat:["']cosmetic-weapon["']/.test(line);
  (isWeapon ? weaponLines : nonWeaponLines).push(line);
}

function nameFromLine(line) {
  const m = line.match(/,name:(?:'([^']*)'|"([^"]*)")/);
  return (m ? (m[1] || m[2]) : '').toLowerCase().replace(/['']/g, "'").replace(/[^a-z0-9 ]/g, '');
}

weaponLines.sort((a, b) => nameFromLine(a).localeCompare(nameFromLine(b), 'en', { sensitivity: 'base' }));

const weaponSectionComment = '  // ── Cosmetic weapon overrides (sorted A-Z) ─────────────────────────────';
const newContent = '\n'
  + nonWeaponLines.filter(l => l.trim()).join('\n') + '\n'
  + weaponSectionComment + '\n'
  + weaponLines.join('\n') + '\n';

html = html.slice(0, bsItems + 1) + newContent + html.slice(itemsEnd);

const scriptSrc = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
try { new Function(scriptSrc); } catch(e) { console.error('SYNTAX ERROR:', e.message); process.exit(1); }

writeFileSync(HTML_PATH, html);
console.log('Re-sorted. Done.');
