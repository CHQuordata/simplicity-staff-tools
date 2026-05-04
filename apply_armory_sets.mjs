#!/usr/bin/env node
// Phase 2: Apply confirmed cosmetic sets from probe results to the dashboard.
// Reads: Data/armory_probe_results.json
// Writes: Dashboards/rs3-asset-library.html
// Run: node apply_armory_sets.mjs

import { readFileSync, writeFileSync } from 'fs';

const PROBE = JSON.parse(readFileSync('./Data/armory_probe_results.json', 'utf8'));
const HTML_PATH = './Dashboards/rs3-asset-library.html';

// ── Slot corrections for mis-detected pieces ──────────────────────────────────
const SLOT_FIXES = {
  'backpack': 'cape',  'medallion': 'amulet', 'medal': 'amulet',
  'jumper': 'body',    'tunic': 'body',        'tabard': 'body',
};
function fixSlot(pieceName, slot) {
  const last = pieceName.toLowerCase().replace(/\s*\([^)]+\)\s*$/, '').split(/\s+/).at(-1);
  return SLOT_FIXES[last] ?? slot;
}

// Slots that form a complete outfit
const ARMOR_SLOTS  = ['helm','body','legs','boots','gloves','cape','shield','amulet'];
const WEAPON_SLOTS = ['weapon','ammo'];

// ── Load existing item IDs to avoid duplicates ────────────────────────────────
const html = readFileSync(HTML_PATH, 'utf8');
const markerIdx  = html.indexOf('const ITEMS = [');
const bracketStart = html.indexOf('[', markerIdx);
let depth = 0, blockEnd = -1;
for (let j = bracketStart; j < html.length; j++) {
  if (html[j] === '[') depth++;
  else if (html[j] === ']') { depth--; if (depth === 0) { blockEnd = j + 1; break; } }
}
const EXISTING = (new Function(`return ${html.slice(bracketStart, blockEnd)}`))();
const existingIds   = new Set(EXISTING.map(i => i.id));
const existingNames = new Set(EXISTING.map(i => i.name.toLowerCase().replace(/['']/g,'')));

// ── Build additions from probe results ────────────────────────────────────────

const newItems      = [];   // ITEMS entries
const newSetMeta    = [];   // SET_META entries
const newSetEqImgs  = [];   // SET_EQUIPPED_IMAGES entries
const newLookbooks  = [];   // LOOKBOOKS entries

for (const s of PROBE.sets) {
  // Only process sets where we confirmed at least 1 piece
  const confirmed = s.piecesWithSlots
    .filter(p => p.hasImage)
    .map(p => ({ ...p, slot: fixSlot(p.name, p.slot) }));
  if (confirmed.length === 0) continue;

  const setKey = s.setKey;
  const tags   = s.tags;

  // Deduplicate by slot — prefer more specific names (longer name wins)
  const bySlot = new Map();
  for (const p of confirmed) {
    const existing = bySlot.get(p.slot);
    if (!existing || p.name.length > existing.name.length) bySlot.set(p.slot, p);
  }

  // Generate ITEMS entries for each confirmed piece (skip existing by name)
  for (const p of confirmed) {
    const normName = p.name.toLowerCase().replace(/['']/g,'');
    if (existingNames.has(normName)) continue;
    if (existingIds.has(p.id))       continue;

    const cat  = WEAPON_SLOTS.includes(p.slot) ? 'cosmetic-weapon' : 'cosmetic-armor';
    const item = {
      id:        p.id,
      name:      p.name,
      cat,
      slot:      p.slot,
      tier:      0,
      style:     'cosmetic',
      era:       'solomons',
      setKey,
      tags:      [...new Set([...tags, p.slot])],
      slug:      p.slug,
      isCosmetic: true,
      stats:     {},
    };
    newItems.push(item);
    existingIds.add(item.id);
    existingNames.add(normName);
  }

  // SET_META — only if 3+ confirmed pieces across 2+ unique slots
  const confirmedSlots = new Set([...bySlot.keys()]);
  if (confirmedSlots.size >= 2 && confirmed.length >= 3) {
    newSetMeta.push({ key: setKey, name: s.name });
  }

  // SET_EQUIPPED_IMAGES — only if we have a confirmed equipped file
  if (s.equippedFile) {
    newSetEqImgs.push({ key: setKey, file: s.equippedFile });
  }

  // LOOKBOOKS — only if equipped file + (helm+body+legs OR 4+ pieces across 3+ slots)
  const hasHelm   = bySlot.has('helm');
  const hasBody   = bySlot.has('body');
  const hasLegs   = bySlot.has('legs');
  const hasWeapon = bySlot.has('weapon');
  const hasCape   = bySlot.has('cape');

  const isFullOutfit = hasHelm && hasBody && hasLegs;
  const isUsableOutfit = s.equippedFile && confirmed.length >= 4 && confirmedSlots.size >= 3;

  if (s.equippedFile && (isFullOutfit || isUsableOutfit)) {
    const pieces = {};
    if (bySlot.get('helm'))    pieces.helm   = bySlot.get('helm').id;
    if (bySlot.get('body'))    pieces.body   = bySlot.get('body').id;
    if (bySlot.get('legs'))    pieces.legs   = bySlot.get('legs').id;
    if (bySlot.get('boots'))   pieces.boots  = bySlot.get('boots').id;
    if (bySlot.get('gloves'))  pieces.gloves = bySlot.get('gloves').id;
    if (bySlot.get('cape'))    pieces.cape   = bySlot.get('cape').id;
    if (bySlot.get('shield'))  pieces.shield = bySlot.get('shield').id;
    if (bySlot.get('amulet'))  pieces.amulet = bySlot.get('amulet').id;
    if (bySlot.get('weapon'))  pieces['2h']  = bySlot.get('weapon').id;

    const theme = ['cosmetic'];
    if (['Templar','Aurora','Superhero'].includes(s.name)) theme.push('prestige');
    if (['Stasis'].includes(s.name)) theme.push('dark');

    newLookbooks.push({ name: s.name, theme, previewSetKey: setKey, pieces });
  }
}

console.log(`New items:        ${newItems.length}`);
console.log(`New SET_META:     ${newSetMeta.length}`);
console.log(`New SET_EQ_IMGS:  ${newSetEqImgs.length}`);
console.log(`New LOOKBOOKS:    ${newLookbooks.length}`);

if (newItems.length === 0) {
  console.log('Nothing new to add. Exiting.');
  process.exit(0);
}

// ── Generate text blocks ──────────────────────────────────────────────────────

function itemLine(it) {
  return `  {id:${JSON.stringify(it.id)},name:${JSON.stringify(it.name)},cat:${JSON.stringify(it.cat)},slot:${JSON.stringify(it.slot)},tier:0,style:'cosmetic',era:'solomons',setKey:${JSON.stringify(it.setKey)},tags:${JSON.stringify(it.tags)},slug:${JSON.stringify(it.slug)},isCosmetic:true,stats:{}},`;
}

function setMetaLine(e) {
  return `  ${JSON.stringify(e.key)}:      [${JSON.stringify(e.name)},   0,   '✨'],`;
}

function setEqLine(e) {
  return `  ${JSON.stringify(e.key)}:     ${JSON.stringify(e.file)},`;
}

const IDENT_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
function lookbookLine(lb) {
  const pStr = Object.entries(lb.pieces)
    .map(([k,v]) => `${IDENT_RE.test(k) ? k : JSON.stringify(k)}:${JSON.stringify(v)}`)
    .join(', ');
  return `  { name: ${JSON.stringify(lb.name)}, theme:${JSON.stringify(lb.theme)}, previewSetKey:${JSON.stringify(lb.previewSetKey)},\n    pieces:{ ${pStr} } },`;
}

// ── Splice into HTML (block-scoped per CLAUDE.md) ────────────────────────────

let newHtml = html;

// 1. ITEMS — insert before the closing ]; of ITEMS block
{
  const marker   = 'const ITEMS = [';
  const mIdx     = newHtml.indexOf(marker);
  const bStart   = newHtml.indexOf('[', mIdx);
  let d = 0, end = -1;
  for (let j = bStart; j < newHtml.length; j++) {
    if (newHtml[j]==='[') d++; else if (newHtml[j]===']') { d--; if(!d){end=j;break;} }
  }
  const insertion = '\n  // ── WIKI ARMORY ADDITIONS ─────────────────────────────────────\n'
    + newItems.map(itemLine).join('\n') + '\n';
  newHtml = newHtml.slice(0, end) + insertion + newHtml.slice(end);
}

// 2. SET_META — insert before closing };
if (newSetMeta.length) {
  const marker = 'const SET_META = {';
  const mIdx   = newHtml.indexOf(marker);
  const bStart = newHtml.indexOf('{', mIdx);
  let d = 0, end = -1;
  for (let j = bStart; j < newHtml.length; j++) {
    if (newHtml[j]==='{') d++; else if (newHtml[j]==='}') { d--; if(!d){end=j;break;} }
  }
  const insertion = '\n  // ── Wiki armory cosmetic sets ──\n'
    + newSetMeta.map(setMetaLine).join('\n') + '\n';
  newHtml = newHtml.slice(0, end) + insertion + newHtml.slice(end);
}

// 3. SET_EQUIPPED_IMAGES — insert before the closing }; of the main object
if (newSetEqImgs.length) {
  const marker = 'const SET_EQUIPPED_IMAGES = {';
  const mIdx   = newHtml.indexOf(marker);
  const bStart = newHtml.indexOf('{', mIdx);
  let d = 0, end = -1;
  for (let j = bStart; j < newHtml.length; j++) {
    if (newHtml[j]==='{') d++; else if (newHtml[j]==='}') { d--; if(!d){end=j;break;} }
  }
  const insertion = '\n  // ── Wiki armory cosmetic sets ──\n'
    + newSetEqImgs.map(setEqLine).join('\n') + '\n';
  newHtml = newHtml.slice(0, end) + insertion + newHtml.slice(end);
}

// 4. LOOKBOOKS — insert before the closing ];
if (newLookbooks.length) {
  const marker = 'const LOOKBOOKS = [';
  const mIdx   = newHtml.indexOf(marker);
  const bStart = newHtml.indexOf('[', mIdx);
  let d = 0, end = -1;
  for (let j = bStart; j < newHtml.length; j++) {
    if (newHtml[j]==='[') d++; else if (newHtml[j]===']') { d--; if(!d){end=j;break;} }
  }
  // If the last entry has no trailing comma, add one
  const before = newHtml.slice(0, end).trimEnd();
  const needsComma = before.endsWith('}');
  const insertion = (needsComma ? ',\n' : '\n')
    + '  // ── Wiki armory cosmetic lookbooks ──\n'
    + newLookbooks.map(lookbookLine).join('\n') + '\n';
  newHtml = newHtml.slice(0, end) + insertion + newHtml.slice(end);
}

// ── Syntax check ──────────────────────────────────────────────────────────────
const scriptSrc = newHtml.slice(newHtml.indexOf('<script>') + 8, newHtml.indexOf('</script>'));
try { new Function(scriptSrc); } catch(e) { console.error('SYNTAX ERROR:', e.message); process.exit(1); }

console.log(`\nFile size: ${html.length} → ${newHtml.length} (+${newHtml.length - html.length} bytes)`);
writeFileSync(HTML_PATH, newHtml);
console.log('Written → ' + HTML_PATH);
