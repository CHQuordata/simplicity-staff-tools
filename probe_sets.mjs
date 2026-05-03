// Probe RS3 wiki for set preview images for all missing cosmetic-armor sets
const WIKI = 'https://runescape.wiki/api.php';
const h = { headers: { 'Api-User-Agent': 'SimplicitRS3Tool/1.0' } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Each entry: [setKey, wikiPageTitle, ...extraFilesToTry]
const SETS = [
  // ── Endgame / prestige ──
  ['aetherium',        'Aetherium Outfit'],
  ['aetherium-mw',     'Aetherium (Masterwork) Outfit'],
  ['invictum',         'Invictum Outfit'],
  ['invictum-mw',      'Invictum (Masterwork) Outfit'],
  ['necturion',        'Necturion Outfit'],
  ['necturion-mw',     'Necturion (Masterwork) Outfit'],
  ['infernal-cerb',    'Infernal Cerberus Armour'],
  ['pestilent-torva',  'Pestilent Torva Armour'],
  ['platinum-torva',   'Platinum Torva Armour'],
  ['platinum-pernix',  'Platinum Pernix Armour'],
  ['platinum-virtus',  'Platinum Virtus Armour'],
  ['black-primal',     'Black Primal Armour'],
  ['legacy-torva',     'Legacy Torva Armour'],
  ['legacy-pernix',    'Legacy Pernix Outfit'],
  ['krils-battle',     "K'ril's Battlegear"],
  ['krils-god',        "K'ril's Godcrusher"],
  ['sclerite',         'Sclerite Armour'],
  ['umbral-armour',    'Umbral Armour'],
  ['deathless-regent', 'Deathless Regent'],
  ['vindictive',       'Vindictive Armour'],
  ['stormborn',        'Stormborn Armour'],
  ['dawnforged',       'Dawnforged Armour Outfit'],
  // ── Replica sets ──
  ['replica-dharok',   'Replica Barrows (Dharok)'],
  ['replica-guthan',   'Replica Barrows (Guthan)'],
  ['replica-karil',    'Replica Barrows (Karil)'],
  ['replica-ahrim',    'Replica Barrows (Ahrim)'],
  ['replica-torag',    'Replica Barrows (Torag)'],
  ['replica-verac',    'Replica Barrows (Verac)'],
  ['replica-armadyl',  'Replica GWD (Armadyl)'],
  ['replica-bandos',   'Replica GWD (Bandos)'],
  ['replica-pernix',   'Replica GWD (Pernix)'],
  ['replica-torva',    'Replica GWD (Torva)'],
  ['replica-virtus',   'Replica GWD (Virtus)'],
  ['replica-dragon',   'Replica Dragon'],
  ['replica-infinity', 'Replica Infinity Robes'],
  ['replica-metal',    'Replica Metal Plate Armour'],
  // ── Iconic archetypes ──
  ['templar',          'Templar'],
  ['paladin',          'Paladin (override)'],
  ['rogue',            'Rogue (override)'],
  ['raptor',           'Raptor (override)'],
  ['raptor-adv',       'Raptor (Advanced)'],
  ['nomad',            'Nomad (override)'],
  ['revenant',         'Revenant (override)'],
  ['mahjarrat',        'Mahjarrat (override)'],
  ['shadow-knight',    'Shadow Knight'],
  ['shadow-dragoon',   'Shadow Dragoon'],
  ['shadow-hunter',    'Shadow Hunter'],
  ['tokhaar-brute',    'TokHaar (Brute)'],
  ['tokhaar-veteran',  'TokHaar (Veteran)'],
  ['tokhaar-warlord',  'TokHaar (Warlord)'],
  ['hellforged',       'Hellforged Warrior Armour'],
  ['heavenforged',     'Heavenforged Warrior Armour'],
  ['vanquisher',       'Vanquisher'],
  ['night-reaver',     'Night Reaver Outfit'],
  ['midnight-slayer',  'Midnight Slayer Outfit'],
  ['celestial-slayer', 'Celestial Slayer Outfit'],
  ['soul-reaver',      'Soul Reaver Regalia'],
  ['radiant-crusader', 'Radiant Crusader Outfit'],
  ['skullhide',        'Skullhide Stalker Outfit'],
  ['ripper',           'Ripper Outfit'],
  ['executioner',      'Executioner (override)'],
  ['deathless',        'Deathless Regent'],
  ['grave-guardian',   'Grave Guardian Outfit'],
  ['ossified-guardian','Ossified Guardian Outfit'],
  ['sanguine-guardian','Sanguine Guardian Outfit'],
  ['exiled-guardian',  'Exiled Guardian Outfit'],
  ['crimson-guardian', 'Crimson Guardian Outfit'],
  ['construct-justice','Construct of Justice'],
  ['construct-strength','Construct of Strength'],
  // ── Others ──
  ['oceans-warrior',   "Ocean's Warrior"],
  ['oceans-mage',      "Ocean's Mage"],
  ['oceans-archer',    "Ocean's Archer"],
  ['musketeer',        'Musketeer'],
  ['swashbuckler',     'Swashbuckler'],
  ['privateer',        'Privateer'],
  ['eastern',          'Eastern'],
  ['eastern-captain',  'Eastern Captain'],
  ['eastern-crew',     'Eastern Crew'],
  ['monarch',          'Monarch (override)'],
  ['navigator',        'Navigator (override)'],
  ['war-robes-guthix', 'War Robes (Guthix)'],
  ['war-robes-sara',   'War Robes (Saradomin)'],
  ['war-robes-zammy',  'War Robes (Zamorak)'],
  ['war-robes-zaros',  'War Robes (Zaros)'],
  ['barbarian',        'Barbarian (override)'],
  ['beast',            'Beast (override)'],
  ['colossus',         'Colossus (override)'],
  ['titan',            'Titan (override)'],
  ['lion',             'Lion (override)'],
  ['wolf',             'Wolf (override)'],
  ['fox',              'Fox (override)'],
  ['feline',           'Feline'],
  ['griffin',          'Griffin'],
  ['demonflesh-greater','Demonflesh (Greater)'],
  ['demonflesh-lesser','Demonflesh (Lesser)'],
  ['chaos-witch',      'Chaos Witch (override)'],
  ['chaos-witch-adept','Chaos Witch Adept'],
  ['chaos-witch-master','Chaos Witch Master'],
  ['werewolf',         'Werewolf (override)'],
  ['dragon-wolf-over', 'Dragon Wolf (override)'],
  ['faceless-enforcer-blue', 'Faceless Enforcer Outfit (Blue)'],
  ['faceless-enforcer-green','Faceless Enforcer Outfit (Green)'],
  ['faceless-enforcer-purple','Faceless Enforcer Outfit (Purple)'],
  ['faceless-enforcer-red','Faceless Enforcer Outfit (Red)'],
  ['faceless-enforcer-master','Faceless Enforcer (Master)'],
  ['reforged-sara',    'Reforged Saradomin Armour'],
  ['reforged-zammy',   'Reforged Zamorak Armour'],
  ['victorious',       'Radiant Dawn'],
  ['furies-agent',     'Furies Agent'],
  ['gu-ronin',         'Gu Ronin (override)'],
  ['dervish',          'Dervish'],
  ['legatus',          'Legatus Maximus (override)'],
  ['vampire-hunter',   'Vampyre Hunter'],
  ['hexers',           "Hexer's Outfit"],
  ['spirit-hunter',    'Spirit Hunter'],
  ['tundral-stalker',  'Tundral stalker'],
  ['savage-hawk',      'Skypouncer (override)'],
];

// 1. Batch pageimages probe
async function batchPageImages(titles) {
  const p = new URLSearchParams({ action:'query', prop:'pageimages', pithumbsize:'400', titles: titles.join('|'), format:'json', origin:'*' });
  const r = await fetch(`${WIKI}?${p}`, h);
  const d = await r.json();
  const result = {};
  const norm = {};
  for (const n of d.query?.normalized??[]) norm[n.to] = n.from;
  for (const pg of Object.values(d.query?.pages??{})) {
    const origTitle = norm[pg.title] ?? pg.title;
    if (pg.thumbnail) result[origTitle] = pg.thumbnail.source;
  }
  return result;
}

// 2. Batch imageinfo probe for direct file URLs
async function batchImageInfo(fileNames) {
  const p = new URLSearchParams({ action:'query', prop:'imageinfo', iiprop:'url', titles: fileNames.join('|'), format:'json', origin:'*' });
  const r = await fetch(`${WIKI}?${p}`, h);
  const d = await r.json();
  const result = {};
  const norm = {};
  for (const n of d.query?.normalized??[]) norm[n.to] = n.from;
  for (const pg of Object.values(d.query?.pages??{})) {
    if ('missing' in pg) continue;
    const url = pg.imageinfo?.[0]?.url;
    if (!url) continue;
    const origTitle = norm[pg.title] ?? pg.title;
    result[origTitle] = url;
  }
  return result;
}

// Run in batches of 50
async function runBatches(items, fn, batchSize = 50) {
  const results = {};
  for (let i = 0; i < items.length; i += batchSize) {
    Object.assign(results, await fn(items.slice(i, i + batchSize)));
    if (i + batchSize < items.length) await sleep(300);
  }
  return results;
}

const pageTitles = SETS.map(([, title]) => title);
const pageImgs = await runBatches(pageTitles, batchPageImages);

// Also try direct equipped file probes for sets that didn't get a pageimage
const missing = SETS.filter(([, t]) => !pageImgs[t]);
const fileProbes = missing.flatMap(([, t]) => [
  `File:${t} equipped (male).png`,
  `File:${t} equipped.png`,
  `File:${t.replace(' (override)','')} equipped (male).png`,
]);
const fileResults = await runBatches(fileProbes, batchImageInfo);

// Consolidate
const found = {};
const dead = [];
for (const [key, title] of SETS) {
  const url = pageImgs[title]
    || fileResults[`File:${title} equipped (male).png`]
    || fileResults[`File:${title} equipped.png`]
    || fileResults[`File:${title.replace(' (override)','')} equipped (male).png`];
  if (url) { found[key] = { title, url }; }
  else dead.push({ key, title });
}

console.log('\n=== FOUND (' + Object.keys(found).length + ') ===');
for (const [key, { title, url }] of Object.entries(found)) {
  console.log(`  '${key}': '${url}',  // ${title}`);
}

console.log('\n=== DEAD (' + dead.length + ') ===');
for (const { key, title } of dead) console.log(`  ${key}: ${title}`);
