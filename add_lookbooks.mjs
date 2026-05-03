import { readFileSync, writeFileSync } from 'fs';
const path = String.raw`C:\Users\chris\OneDrive\Desktop\Simplicity\Dashboards\rs3-asset-library.html`;
const html = readFileSync(path, 'utf-8');

// [setKey, outfitName, themes, cape, aura, weaponSlot, weaponId]
// weaponSlot: '2h', 'weapon', or null
const ENTRIES = [
  // ── Endgame / prestige ──
  ['aetherium',        'Aetherium Vanguard',        ['cosmetic','prestige'],         'wings-salvation',  'aura-inspiration',  null,     null],
  ['aetherium-mw',     'Aetherium Masterwork',       ['cosmetic','prestige','endgame'],'wings-salvation', 'aura-inspiration',  null,     null],
  ['invictum',         'Invictum Destroyer',         ['cosmetic','dark'],             'wings-corruption', 'aura-vampyrism',    null,     null],
  ['invictum-mw',      'Invictum Apex',              ['cosmetic','dark','endgame'],   'wings-corruption', 'aura-vampyrism',    null,     null],
  ['necturion',        'Necturion Warden',           ['cosmetic','dark','necromancy'],'wings-decaying',   'aura-corruption',   null,     null],
  ['necturion-mw',     'Necturion Apex',             ['cosmetic','dark','endgame'],   'wings-decaying',   'aura-corruption',   null,     null],
  ['infernal-cerb',    'Infernal Cerberus',          ['cosmetic','dark','endgame'],   'wings-eth-death',  'aura-berserker',    null,     null],
  ['pestilent-torva',  'Pestilent Torva',            ['cosmetic','dark','endgame'],   'wings-bloodblade', 'aura-vampyrism',    null,     null],
  ['platinum-torva',   'Platinum Berserker',         ['cosmetic','prestige'],         'wings-gem-magic',  'aura-berserker',    null,     null],
  ['platinum-pernix',  'Platinum Ranger',            ['cosmetic','prestige'],         'wings-gem-sapphire','aura-berserker',   null,     null],
  ['platinum-virtus',  'Platinum Archmage',          ['cosmetic','prestige'],         'wings-gem-emerald','aura-inspiration',  null,     null],
  ['black-primal',     'Black Primal Warrior',       ['cosmetic','dark'],             'wings-drakan',     'aura-berserker',    null,     null],
  ['legacy-torva',     'Legacy Torva',               ['cosmetic','prestige','endgame'],'wings-fury',      'aura-berserker',    null,     null],
  ['legacy-pernix',    'Legacy Pernix',              ['cosmetic','prestige','endgame'],'wings-crystalline','aura-berserker',   null,     null],
  ['krils-battle',     "K'ril's Champion",           ['cosmetic','dark','endgame'],   'wings-drakan',     'aura-corruption',   null,     null],
  ['krils-god',        "K'ril's Godcrusher",         ['cosmetic','dark','endgame'],   'wings-drakan',     'aura-corruption',   null,     null],
  ['sclerite',         "Araxxor's Herald",           ['cosmetic','dark'],             'wings-decaying',   'aura-vampyrism',    null,     null],
  ['umbral-armour',    'Umbral Shadow',              ['cosmetic','dark','necromancy'],'wings-eth-death',  'aura-vampyrism',    null,     null],
  ['deathless-regent', 'Deathless Sovereign',        ['cosmetic','dark','necromancy'],'wings-decaying',   'aura-corruption',   null,     null],
  ['vindictive',       'Vindictive Warrior',         ['cosmetic','prestige'],         'wings-fury',       'aura-berserker',    null,     null],
  ['stormborn',        'Stormborn Knight',           ['cosmetic','prestige'],         'wings-freefall',   'aura-berserker',    null,     null],
  // ── Replica Barrows ──
  ['replica-dharok',   'Replica Dharok',             ['cosmetic','dark'],             'wings-decaying',   'aura-vampyrism',    null,     null],
  ['replica-guthan',   'Replica Guthan',             ['cosmetic','dark'],             'wings-decaying',   'aura-vampyrism',    null,     null],
  ['replica-karil',    'Replica Karil',              ['cosmetic','dark'],             'wings-bloodblade', 'aura-vampyrism',    null,     null],
  ['replica-ahrim',    'Replica Ahrim',              ['cosmetic','dark'],             'wings-eth-death',  'aura-corruption',   null,     null],
  ['replica-torag',    'Replica Torag',              ['cosmetic','dark'],             'wings-decaying',   'aura-vampyrism',    null,     null],
  ['replica-verac',    'Replica Verac',              ['cosmetic','dark'],             'wings-eth-death',  'aura-vampyrism',    null,     null],
  // ── Replica GWD ──
  ['replica-armadyl',  'Replica Armadyl',            ['cosmetic','prestige'],         'wings-armadyl',    'aura-inspiration',  null,     null],
  ['replica-bandos',   'Replica Bandos',             ['cosmetic','prestige'],         'wings-fury',       'aura-berserker',    null,     null],
  ['replica-pernix',   'Replica Pernix',             ['cosmetic','prestige','endgame'],'wings-eth-death', 'aura-berserker',    null,     null],
  ['replica-torva',    'Replica Torva',              ['cosmetic','prestige','endgame'],'wings-eth-death', 'aura-berserker',    null,     null],
  ['replica-virtus',   'Replica Virtus',             ['cosmetic','prestige','endgame'],'wings-eth-infinity','aura-corruption', null,     null],
  // ── Other replicas ──
  ['replica-dragon',   'Replica Dragon',             ['cosmetic'],                    'wings-fury',       'aura-berserker',    null,     null],
  ['replica-infinity', 'Replica Infinity',           ['cosmetic'],                    'wings-eth-infinity','aura-inspiration', null,     null],
  ['replica-metal',    'Replica Plate',              ['cosmetic'],                    'wings-dwarven',    'aura-berserker',    null,     null],
  // ── Iconic archetypes ──
  ['templar',          "Saradomin's Templar",        ['cosmetic','prestige'],         'wings-salvation',  'aura-inspiration',  null,     null],
  ['paladin',          'Divine Paladin',             ['cosmetic'],                    'wings-salvation',  'aura-inspiration',  null,     null],
  ['rogue',            'Shadow Rogue',               ['cosmetic','dark'],             'wings-dryad',      'aura-vampyrism',    null,     null],
  ['raptor',           "Raptor's Slayer",            ['cosmetic','endgame'],          'wings-fury',       'aura-berserker',    null,     null],
  ['raptor-adv',       'Advanced Raptor',            ['cosmetic','endgame'],          'wings-fury',       'aura-berserker',    null,     null],
  ['nomad',            'Soul Nomad',                 ['cosmetic','dark'],             'wings-eth-death',  'aura-corruption',   null,     null],
  ['revenant',         'Revenant Spirit',            ['cosmetic','dark'],             'wings-decaying',   'aura-vampyrism',    null,     null],
  ['mahjarrat',        'Mahjarrat Ritualist',        ['cosmetic','dark','endgame'],   'wings-eth-law',    'aura-corruption',   null,     null],
  ['shadow-knight',    'Shadow Knight',              ['cosmetic','dark'],             'wings-eth-death',  'aura-vampyrism',    null,     null],
  ['shadow-dragoon',   'Shadow Dragoon',             ['cosmetic','dark'],             'wings-eth-death',  'aura-vampyrism',    null,     null],
  ['shadow-hunter',    'Shadow Hunter',              ['cosmetic','dark'],             'wings-eth-death',  'aura-vampyrism',    null,     null],
  ['tokhaar-brute',    'TokHaar Brute',              ['cosmetic','endgame'],          'wings-fury',       'aura-berserker',    null,     null],
  ['tokhaar-veteran',  'TokHaar Veteran',            ['cosmetic','endgame'],          'wings-fury',       'aura-berserker',    null,     null],
  ['tokhaar-warlord',  'TokHaar Warlord',            ['cosmetic','endgame'],          'wings-fury',       'aura-berserker',    null,     null],
  ['hellforged',       'Hellforged Warrior',         ['cosmetic','dark'],             'wings-drakan',     'aura-berserker',    null,     null],
  ['heavenforged',     'Heavenforged Champion',      ['cosmetic','prestige'],         'wings-salvation',  'aura-inspiration',  null,     null],
  ['vanquisher',       'The Vanquisher',             ['cosmetic','dark'],             'wings-corruption', 'aura-vampyrism',    null,     null],
  ['night-reaver',     'Night Reaver',               ['cosmetic','dark'],             'wings-drakan',     'aura-vampyrism',    '2h',     'dis-night-reaver-halberd'],
  ['midnight-slayer',  'Midnight Slayer',            ['cosmetic','dark'],             'wings-bloodblade', 'aura-vampyrism',    '2h',     'dis-midnight-slayer-halberd'],
  ['celestial-slayer', 'Celestial Slayer',           ['cosmetic','prestige'],         'wings-salvation',  'aura-berserker',    '2h',     'dis-celestial-slayer-halberd'],
  ['soul-reaver',      'Soul Reaver',                ['cosmetic','dark'],             'wings-eth-death',  'aura-vampyrism',    null,     null],
  ['radiant-crusader', 'Radiant Crusader',           ['cosmetic','prestige'],         'wings-salvation',  'aura-inspiration',  null,     null],
  ['ripper',           'The Ripper',                 ['cosmetic','dark'],             'wings-drakan',     'aura-corruption',   null,     null],
  ['executioner',      'The Executioner',            ['cosmetic','dark'],             'wings-corruption', 'aura-berserker',    null,     null],
  ['grave-guardian',   'Grave Guardian',             ['cosmetic','dark'],             'wings-decaying',   'aura-vampyrism',    '2h',     'dis-grave-guardian-2h-sword'],
  ['ossified-guardian','Ossified Guardian',          ['cosmetic','dark'],             'wings-decaying',   'aura-vampyrism',    '2h',     'dis-ossified-guardian-2h-sword'],
  ['sanguine-guardian','Sanguine Guardian',          ['cosmetic','dark'],             'wings-bloodblade', 'aura-vampyrism',    '2h',     'dis-sanguine-guardian-2h-sword'],
  ['exiled-guardian',  'Exiled Guardian',            ['cosmetic','dark'],             'wings-drakan',     'aura-vampyrism',    '2h',     'dis-exiled-guardian-2h-sword'],
  ['crimson-guardian', 'Crimson Guardian',           ['cosmetic','dark'],             'wings-bloodblade', 'aura-berserker',    '2h',     'dis-crimson-guardian-2h-sword'],
  ['construct-justice','Construct of Justice',       ['cosmetic'],                    'wings-eth-law',    'aura-inspiration',  null,     null],
  ['construct-strength','Construct of Strength',     ['cosmetic'],                    'wings-fury',       'aura-berserker',    null,     null],
  // ── Faction / culture ──
  ["oceans-warrior",   "Ocean's Warrior",            ['cosmetic','endgame'],          'wings-dryad',      'aura-berserker',    null,     null],
  ["oceans-mage",      "Ocean's Mage",               ['cosmetic','endgame'],          'wings-echo-glow',  'aura-inspiration',  null,     null],
  ["oceans-archer",    "Ocean's Archer",             ['cosmetic','endgame'],          'wings-dragonfly',  'aura-berserker',    null,     null],
  ['musketeer',        'The Musketeer',              ['cosmetic'],                    'wings-festive',    'aura-inspiration',  null,     null],
  ['swashbuckler',     'Sea Swashbuckler',           ['cosmetic'],                    'wings-bloodblade', 'aura-berserker',    null,     null],
  ['privateer',        'The Privateer',              ['cosmetic'],                    'wings-corruption', 'aura-berserker',    null,     null],
  ['eastern',          'Eastern Wanderer',           ['cosmetic'],                    'wings-crystalline','aura-vampyrism',    null,     null],
  ['eastern-captain',  'Eastern Captain',            ['cosmetic'],                    'wings-crystalline','aura-vampyrism',    null,     null],
  ['eastern-crew',     'Eastern Crew',               ['cosmetic'],                    'wings-dragonfly',  'aura-vampyrism',    null,     null],
  ['monarch',          'The Monarch',                ['cosmetic','prestige'],         'wings-salvation',  'aura-inspiration',  null,     null],
  ['navigator',        'The Navigator',              ['cosmetic'],                    'wings-freefall',   'aura-inspiration',  null,     null],
  ['war-robes-guthix', 'Guthix War Mage',            ['cosmetic','dark'],             'wings-dryad',      'aura-inspiration',  null,     null],
  ['war-robes-sara',   'Saradomin War Priest',       ['cosmetic'],                    'wings-salvation',  'aura-inspiration',  null,     null],
  ['war-robes-zammy',  'Zamorak War Witch',          ['cosmetic','dark'],             'wings-drakan',     'aura-corruption',   null,     null],
  ['war-robes-zaros',  'Zaros War Mage',             ['cosmetic','dark'],             'wings-eth-death',  'aura-corruption',   null,     null],
  ['barbarian',        'Village Barbarian',          ['cosmetic'],                    'wings-fury',       'aura-berserker',    null,     null],
  ['beast',            'The Beast',                  ['cosmetic','dark'],             'wings-corruption', 'aura-berserker',    null,     null],
  ['colossus',         'The Colossus',               ['cosmetic'],                    'wings-dwarven',    'aura-berserker',    null,     null],
  ['titan',            'The Titan',                  ['cosmetic'],                    'wings-fury',       'aura-berserker',    null,     null],
  ['lion',             'The Lion',                   ['cosmetic'],                    'wings-gem-emerald','aura-inspiration',  null,     null],
  ['wolf',             'The Wolf',                   ['cosmetic'],                    'wings-freefall',   'aura-berserker',    null,     null],
  ['fox',              'The Fox',                    ['cosmetic'],                    'wings-dryad',      'aura-vampyrism',    null,     null],
  ['feline',           'The Feline',                 ['cosmetic'],                    'wings-dragonfly',  'aura-vampyrism',    null,     null],
  ['griffin',          'Griffin Knight',             ['cosmetic','prestige'],         'wings-armadyl',    'aura-inspiration',  null,     null],
  ['demonflesh-greater','Greater Demonflesh',        ['cosmetic','dark'],             'wings-drakan',     'aura-corruption',   null,     null],
  ['demonflesh-lesser','Lesser Demonflesh',          ['cosmetic','dark'],             'wings-drakan',     'aura-corruption',   null,     null],
  ['chaos-witch',      'Chaos Witch',                ['cosmetic','dark'],             'wings-eth-death',  'aura-corruption',   null,     null],
  ['chaos-witch-adept','Chaos Adept',                ['cosmetic','dark'],             'wings-eth-death',  'aura-corruption',   null,     null],
  ['chaos-witch-master','Coven Master',              ['cosmetic','dark'],             'wings-corruption', 'aura-corruption',   null,     null],
  ['werewolf',         'The Werewolf',               ['cosmetic','dark'],             'wings-decaying',   'aura-vampyrism',    null,     null],
  ['faceless-enforcer-blue',  'Enforcer (Blue)',     ['cosmetic'],                    'wings-gem-sapphire','aura-berserker',   null,     null],
  ['faceless-enforcer-green', 'Enforcer (Green)',    ['cosmetic'],                    'wings-gem-emerald','aura-berserker',    null,     null],
  ['faceless-enforcer-purple','Enforcer (Purple)',   ['cosmetic'],                    'wings-gem-magic',  'aura-berserker',    null,     null],
  ['faceless-enforcer-red',   'Enforcer (Red)',      ['cosmetic'],                    'wings-bloodblade', 'aura-berserker',    null,     null],
  ['faceless-enforcer-master','Faceless Master',     ['cosmetic','dark'],             'wings-corruption', 'aura-berserker',    null,     null],
  ['reforged-sara',    'Reforged Saradomin',         ['cosmetic','prestige'],         'wings-salvation',  'aura-inspiration',  null,     null],
  ['reforged-zammy',   'Reforged Zamorak',           ['cosmetic','dark'],             'wings-drakan',     'aura-corruption',   null,     null],
  ['radiant-dawn',     'Radiant Dawn',               ['cosmetic','prestige'],         'wings-salvation',  'aura-inspiration',  null,     null],
  ['furies-agent',     'Furies Agent',               ['cosmetic','dark'],             'wings-drakan',     'aura-vampyrism',    null,     null],
  ['gu-ronin',         'Gu Ronin',                   ['cosmetic'],                    'wings-eth-death',  'aura-berserker',    null,     null],
  ['dervish',          'Desert Dervish',             ['cosmetic'],                    'wings-freefall',   'aura-inspiration',  null,     null],
  ['legatus',          'Legatus Maximus',            ['cosmetic','prestige'],         'wings-fury',       'aura-berserker',    null,     null],
  ['vampire-hunter',   'Vampire Hunter',             ['cosmetic','dark'],             'wings-eth-law',    'aura-vampyrism',    null,     null],
  ['hexers',           "Hexer's Regalia",            ['cosmetic','dark'],             'wings-eth-infinity','aura-corruption',  null,     null],
  ['spirit-hunter',    'Spirit Hunter',              ['cosmetic'],                    'wings-salvation',  'aura-penance',      null,     null],
  ['tundral-stalker',  'Tundral Stalker',            ['cosmetic'],                    'wings-freefall',   'aura-berserker',    null,     null],
  ['savage-hawk',      'Skypouncer',                 ['cosmetic'],                    'wings-armadyl',    'aura-berserker',    null,     null],
];

// ── Build JS lookbook entry strings ──
const newEntries = [];
for (const [setKey, name, themes, cape, aura, wSlot, wId] of ENTRIES) {
  const pieces = {
    helm: `${setKey}-helm`,
    body: `${setKey}-body`,
    legs: `${setKey}-legs`,
  };
  if (cape) pieces.cape = cape;
  if (aura) pieces.aura = aura;
  if (wSlot && wId) pieces[wSlot] = wId;

  const piecesStr = Object.entries(pieces)
    .map(([k,v]) => `${k}:'${v}'`)
    .join(', ');

  newEntries.push(
    `  { name: ${JSON.stringify(name)}, theme:${JSON.stringify(themes)}, previewSetKey:'${setKey}',\n    pieces:{ ${piecesStr} } }`
  );
}

// ── Safely splice into LOOKBOOKS array ──
const lbStart = html.indexOf('const LOOKBOOKS = [');
const afterLB  = html.indexOf('let _lookbookFilter', lbStart);
const endIdx   = html.lastIndexOf('];', afterLB) + 2;
let lb = html.slice(lbStart, endIdx);

// Append before closing ];
const closeIdx = lb.lastIndexOf(']');
lb = lb.slice(0, closeIdx) + ',\n' + newEntries.join(',\n') + '\n]';

const newHtml = html.slice(0, lbStart) + lb + html.slice(endIdx);

const delta = newHtml.length - html.length;
console.log(`Lookbook entries added: ${newEntries.length}`);
console.log(`Delta: ${delta} bytes`);
if (delta < 1000) { console.error('ABORT — grew less than expected'); process.exit(1); }
if (delta > 100_000) { console.error('ABORT — grew too much'); process.exit(1); }

writeFileSync(path, newHtml, 'utf-8');
console.log('Done.');
