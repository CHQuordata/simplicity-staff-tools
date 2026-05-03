import { readFileSync, writeFileSync } from 'fs';
const path = String.raw`C:\Users\chris\OneDrive\Desktop\Simplicity\Dashboards\rs3-asset-library.html`;
const html = readFileSync(path, 'utf-8');

// ── Piece templates by armour type ──
const TYPES = {
  armour:  [['helm','helmet'],['body','platebody'],['legs','platelegs']],
  robes:   [['helm','hood'],['body','robe top'],['legs','robe bottom']],
  ranged:  [['helm','coif'],['body','body'],['legs','chaps']],
  outfit:  [['helm','head'],['body','top'],['legs','bottom']],
};

// ── All new sets to add ──
// [setKey, wikiSlug, previewUrl, era, type, tags]
const SETS = [
  // ── Endgame / prestige ──
  ['aetherium',       'Aetherium_Outfit',                'https://runescape.wiki/images/Aetherium_Helm_chathead.png?40978',                   'solomons',   'armour',  ['aetherium','white','sleek','prestige']],
  ['aetherium-mw',    'Aetherium_(Masterwork)_Outfit',   'https://runescape.wiki/images/Aetherium_%28Masterwork%29_Helm_chathead.png?6dbca',   'solomons',   'armour',  ['aetherium','masterwork','prestige','endgame']],
  ['invictum',        'Invictum_Outfit',                 'https://runescape.wiki/images/Invictum_Helm_chathead.png?04ed6',                    'solomons',   'armour',  ['invictum','dark','prestige']],
  ['invictum-mw',     'Invictum_(Masterwork)_Outfit',    'https://runescape.wiki/images/Invictum_%28Masterwork%29_Helm_chathead.png?a5a21',    'solomons',   'armour',  ['invictum','masterwork','prestige','endgame']],
  ['necturion',       'Necturion_Outfit',                'https://runescape.wiki/images/Necturion_Helm_chathead.png?52012',                   'solomons',   'armour',  ['necturion','necromancy','dark','prestige']],
  ['necturion-mw',    'Necturion_(Masterwork)_Outfit',   'https://runescape.wiki/images/Necturion_%28Masterwork%29_Helm_chathead.png?e426c',   'solomons',   'armour',  ['necturion','masterwork','necromancy','endgame']],
  ['infernal-cerb',   'Infernal_Cerberus_Armour',        'https://runescape.wiki/images/Infernal_Cerberus_helmet_chathead.png?302a8',          'solomons',   'armour',  ['cerberus','infernal','fiery','hound']],
  ['pestilent-torva', 'Pestilent_Torva_Armour',          'https://runescape.wiki/images/Pestilent_Torva_Armour_%28male%29.png?7a0fa',          'solomons',   'armour',  ['torva','pestilent','undead','dark']],
  ['platinum-torva',  'Platinum_Torva_Armour',           'https://runescape.wiki/images/Platinum_Torva_Full_Helm_chathead.png?bfc4c',          'solomons',   'armour',  ['torva','platinum','prestige','silver']],
  ['platinum-pernix', 'Platinum_Pernix_Armour',          'https://runescape.wiki/images/Platinum_Pernix_Cowl_chathead.png?3826c',             'solomons',   'ranged',  ['pernix','platinum','prestige','silver']],
  ['platinum-virtus', 'Platinum_Virtus_Armour',          'https://runescape.wiki/images/Platinum_Virtus_Mask_chathead.png?e001c',             'solomons',   'robes',   ['virtus','platinum','prestige','silver']],
  ['black-primal',    'Black_Primal_Armour',             'https://runescape.wiki/images/Black_Primal_Armour_%28male%29.png?d5d72',            'solomons',   'armour',  ['primal','black','dark','dungeoneering']],
  ['legacy-torva',    'Legacy_Torva_Armour',             'https://runescape.wiki/images/Legacy_Torva_Full_Helm_chathead.png?d5667',           'solomons',   'armour',  ['torva','legacy','classic','prestige']],
  ['legacy-pernix',   'Legacy_Pernix_Outfit',            'https://runescape.wiki/images/Legacy_Pernix_Outfit_equipped_%28male%29.png?26a0e',  'solomons',   'ranged',  ['pernix','legacy','classic','prestige']],
  ['krils-battle',    "K'ril's_Battlegear",              'https://runescape.wiki/images/K%27ril%27s_Battlegear_icon_%28male%29.png?84976',    'solomons',   'armour',  ["k'ril",'zamorak','demon','battlegear']],
  ['krils-god',       "K'ril's_Godcrusher",              'https://runescape.wiki/images/K%27ril%27s_Godcrusher_icon_%28male%29.png?84976',    'solomons',   'armour',  ["k'ril",'zamorak','godcrusher','endgame']],
  ['sclerite',        'Sclerite_Armour',                 'https://runescape.wiki/images/Sclerite_Helm_chathead.png?545e0',                    'solomons',   'armour',  ['sclerite','araxxor','spider','chitin']],
  ['umbral-armour',   'Umbral_Armour',                   'https://runescape.wiki/images/thumb/Umbral_Helm_chathead.png/400px-Umbral_Helm_chathead.png?38d48', 'solomons','armour',['umbral','dark','shadow','necromancy']],
  ['deathless-regent','Deathless_Regent',                'https://runescape.wiki/images/Deathless_Regent_Headguard_%28male%29_chathead.png?c8afa','solomons', 'armour',  ['deathless','regent','dark','necromancy']],
  ['vindictive',      'Vindictive_Armour',               'https://runescape.wiki/images/Vindictive_helmet_chathead.png?7b819',                'solomons',   'armour',  ['vindictive','warrior','imposing']],
  ['stormborn',       'Stormborn_Armour',                'https://runescape.wiki/images/Stormborn_Helmet_chathead.png?8989e',                 'solomons',   'armour',  ['stormborn','storm','lightning','warrior']],
  // ── Replica sets ──
  ['replica-dharok',  'Replica_Barrows_(Dharok)',        'https://runescape.wiki/images/Replica_Barrows_%28Dharok%29_icon.png?6de2d',         'solomons',   'armour',  ['replica','barrows','dharok','undead']],
  ['replica-guthan',  'Replica_Barrows_(Guthan)',        'https://runescape.wiki/images/Replica_Barrows_%28Guthan%29_icon.png?bcbac',         'solomons',   'armour',  ['replica','barrows','guthan','undead']],
  ['replica-karil',   'Replica_Barrows_(Karil)',         'https://runescape.wiki/images/Replica_Barrows_%28Karil%29_Coif_chathead.png?9e38f', 'solomons',   'ranged',  ['replica','barrows','karil','undead']],
  ['replica-ahrim',   'Replica_Barrows_(Ahrim)',         'https://runescape.wiki/images/Replica_Barrows_%28Ahrim%29_icon.png?e91c0',          'solomons',   'robes',   ['replica','barrows','ahrim','undead']],
  ['replica-torag',   'Replica_Barrows_(Torag)',         'https://runescape.wiki/images/Replica_Barrows_%28Torag%29_icon.png?0dd08',          'solomons',   'armour',  ['replica','barrows','torag','undead']],
  ['replica-verac',   'Replica_Barrows_(Verac)',         'https://runescape.wiki/images/Replica_Barrows_%28Verac%29_Helm_chathead.png?4083b', 'solomons',   'armour',  ['replica','barrows','verac','undead']],
  ['replica-armadyl', 'Replica_GWD_(Armadyl)',           'https://runescape.wiki/images/Replica_GWD_%28Armadyl%29_icon.png?7bed9',            'solomons',   'ranged',  ['replica','gwd','armadyl','aviantese']],
  ['replica-bandos',  'Replica_GWD_(Bandos)',            'https://runescape.wiki/images/Replica_GWD_%28Bandos%29_icon.png?9a364',             'solomons',   'armour',  ['replica','gwd','bandos','goblin']],
  ['replica-pernix',  'Replica_GWD_(Pernix)',            'https://runescape.wiki/images/Replica_GWD_%28Pernix%29_icon.png?b752e',             'solomons',   'ranged',  ['replica','gwd','pernix','zaros']],
  ['replica-torva',   'Replica_GWD_(Torva)',             'https://runescape.wiki/images/Replica_GWD_%28Torva%29_icon.png?278c2',              'solomons',   'armour',  ['replica','gwd','torva','zaros']],
  ['replica-virtus',  'Replica_GWD_(Virtus)',            'https://runescape.wiki/images/Replica_GWD_%28Virtus%29_Mask_chathead.png?9daac',    'solomons',   'robes',   ['replica','gwd','virtus','zaros']],
  ['replica-dragon',  'Replica_Dragon',                  'https://runescape.wiki/images/Dragon_full_helm_chathead_old.png?d28bd',             'solomons',   'armour',  ['replica','dragon','classic']],
  ['replica-infinity','Replica_Infinity_Robes',          'https://runescape.wiki/images/Replica_Infinity_Robes_icon.png?56098',               'solomons',   'robes',   ['replica','infinity','mage','classic']],
  ['replica-metal',   'Replica_Metal_Plate_Armour',      'https://runescape.wiki/images/Replica_Metal_Plate_Armour_icon.png?f6d19',           'solomons',   'armour',  ['replica','metal','plate','classic']],
  // ── Iconic archetypes ──
  ['templar',         'Templar',                         'https://runescape.wiki/images/Templar_cuirass.png?17c46',                           'solomons',   'armour',  ['templar','saradomin','holy','knight']],
  ['paladin',         'Paladin_(override)',               'https://runescape.wiki/images/Paladin_%28Hero%29_Helm_chathead.png?637df',          'solomons',   'armour',  ['paladin','saradomin','holy','knight']],
  ['rogue',           'Rogue_(override)',                 'https://runescape.wiki/images/Rogue_%28override%29_icon.png?f1f17',                 'solomons',   'outfit',  ['rogue','thief','stealth','dark']],
  ['raptor',          'Raptor_(override)',                'https://runescape.wiki/images/Raptor%27s_basic_outfit.png?17ada',                   'achievement','armour',  ['raptor','slayer','warrior','menacing']],
  ['raptor-adv',      'Raptor_(Advanced)',                'https://runescape.wiki/images/Raptor_%28Advanced%29_Helmet_chathead.png?41854',     'achievement','armour',  ['raptor','advanced','slayer','endgame']],
  ['nomad',           'Nomad_(override)',                 'https://runescape.wiki/images/Nomad_Gorget_chathead.png?8f31d',                     'solomons',   'armour',  ['nomad','soul','magic','iconic']],
  ['revenant',        'Revenant_(override)',              'https://runescape.wiki/images/Revenant_%28override%29_icon.png?eda43',              'solomons',   'outfit',  ['revenant','ghost','undead','ethereal']],
  ['mahjarrat',       'Mahjarrat_(override)',             'https://runescape.wiki/images/Mahjarrat_Head_chathead_%28male%29.png?e9650',        'solomons',   'armour',  ['mahjarrat','zaros','ancient','powerful']],
  ['shadow-knight',   'Shadow_Knight',                   'https://runescape.wiki/images/Shadow_Knight_icon_%28male%29.png?e42bd',             'solomons',   'armour',  ['shadow','knight','dark','zaros']],
  ['shadow-dragoon',  'Shadow_Dragoon',                  'https://runescape.wiki/images/Shadow_Dragoon_Helm_chathead.png?b1a1d',              'solomons',   'armour',  ['shadow','dragoon','dark','zaros']],
  ['shadow-hunter',   'Shadow_Hunter',                   'https://runescape.wiki/images/Shadow_Hunter_icon_%28male%29.png?1e643',             'solomons',   'ranged',  ['shadow','hunter','dark','zaros']],
  ['tokhaar-brute',   'TokHaar_(Brute)',                  'https://runescape.wiki/images/TokHaar_%28Brute%29_icon_%28male%29.png?02758',       'achievement','armour',  ['tokhaar','tzhaar','brute','lava']],
  ['tokhaar-veteran', 'TokHaar_(Veteran)',                'https://runescape.wiki/images/TokHaar_%28Veteran%29_Helm_chathead.png?ee75a',       'achievement','armour',  ['tokhaar','tzhaar','veteran','lava']],
  ['tokhaar-warlord', 'TokHaar_(Warlord)',                'https://runescape.wiki/images/TokHaar_%28Warlord%29_icon_%28male%29.png?f54c0',     'achievement','armour',  ['tokhaar','tzhaar','warlord','lava']],
  ['hellforged',      'Hellforged_Warrior_Armour',       'https://runescape.wiki/images/Hellforged_Warrior_helmet_chathead.png?74856',        'solomons',   'armour',  ['hellforged','fire','warrior','dark']],
  ['heavenforged',    'Heavenforged_Warrior_Armour',     'https://runescape.wiki/images/Heavenforged_Warrior_Armour_equipped_%28male%29.png?219cb','solomons','armour', ['heavenforged','light','warrior','holy']],
  ['vanquisher',      'Vanquisher',                      'https://runescape.wiki/images/Vanquisher_Skull_chathead.png?e0fca',                 'solomons',   'armour',  ['vanquisher','skull','dark','menacing']],
  ['night-reaver',    'Night_Reaver_Outfit',              'https://runescape.wiki/images/Night_Reaver_Mask_chathead.png?b7dee',               'solomons',   'outfit',  ['night-reaver','dark','undead','slayer']],
  ['midnight-slayer', 'Midnight_Slayer_Outfit',           'https://runescape.wiki/images/Midnight_Slayer_Hood_chathead.png?25e9c',            'solomons',   'ranged',  ['midnight-slayer','dark','slayer','ranged']],
  ['celestial-slayer','Celestial_Slayer_Outfit',          'https://runescape.wiki/images/Celestial_Slayer_Hood_chathead.png?ab844',           'solomons',   'ranged',  ['celestial-slayer','light','slayer','ranged']],
  ['soul-reaver',     'Soul_Reaver_Regalia',              'https://runescape.wiki/images/Soul_Reaver_Regalia_%28male%29.png?77b83',           'solomons',   'armour',  ['soul-reaver','soul','dark','regalia']],
  ['radiant-crusader','Radiant_Crusader_Outfit',          'https://runescape.wiki/images/Radiant_Crusader_Helm_chathead.png?0d646',           'solomons',   'armour',  ['radiant','crusader','holy','light']],
  ['ripper',          'Ripper_Outfit',                    'https://runescape.wiki/images/Ripper_Outfit_Head_chathead.png?84b72',              'solomons',   'outfit',  ['ripper','demon','dark','slayer']],
  ['executioner',     'Executioner_(override)',            'https://runescape.wiki/images/Executioner_%28override%29_icon_%28male%29.png?be471','solomons',  'armour',  ['executioner','dark','skull','warrior']],
  ['grave-guardian',  'Grave_Guardian_Outfit',            'https://runescape.wiki/images/Grave_Guardian_Helmet_chathead.png?6f195',           'solomons',   'armour',  ['grave-guardian','undead','guardian','dark']],
  ['ossified-guardian','Ossified_Guardian_Outfit',        'https://runescape.wiki/images/Ossified_Guardian_Helmet_chathead.png?e840c',        'solomons',   'armour',  ['ossified','guardian','bone','undead']],
  ['sanguine-guardian','Sanguine_Guardian_Outfit',        'https://runescape.wiki/images/Sanguine_Guardian_Helmet_chathead.png?b65c2',        'solomons',   'armour',  ['sanguine','guardian','blood','vampyre']],
  ['exiled-guardian', 'Exiled_Guardian_Outfit',           'https://runescape.wiki/images/Exiled_Guardian_Outfit_%28male%29.png?af70b',        'solomons',   'armour',  ['exiled','guardian','dark','warrior']],
  ['crimson-guardian','Crimson_Guardian_Outfit',          'https://runescape.wiki/images/Crimson_Guardian_Helmet_chathead.png?d9bda',         'solomons',   'armour',  ['crimson','guardian','red','warrior']],
  ['construct-justice','Construct_of_Justice',            'https://runescape.wiki/images/Construct_of_Justice_icon.png?eb46b',                'solomons',   'armour',  ['construct','justice','golem','arcane']],
  ['construct-strength','Construct_of_Strength',          'https://runescape.wiki/images/Construct_of_Strength_icon.png?dce23',               'solomons',   'armour',  ['construct','strength','golem','warrior']],
  // ── Faction / culture ──
  ['oceans-warrior',  "Ocean's_Warrior",                  "https://runescape.wiki/images/Ocean%27s_Warrior_equipped_%28male%29.png?687ad",    'achievement','armour',  ['ocean','solak','warrior','blue']],
  ['oceans-mage',     "Ocean's_Mage",                     "https://runescape.wiki/images/Ocean%27s_Mage_equipped_%28male%29.png?91414",       'achievement','robes',   ['ocean','solak','mage','blue']],
  ['oceans-archer',   "Ocean's_Archer",                   "https://runescape.wiki/images/Ocean%27s_Archer_Head_chathead.png?06850",           'achievement','ranged',  ['ocean','solak','archer','blue']],
  ['musketeer',       'Musketeer',                        'https://runescape.wiki/images/Musketeer_icon_%28male%29.png?b5685',                 'solomons',   'outfit',  ['musketeer','french','historical','elegant']],
  ['swashbuckler',    'Swashbuckler',                     'https://runescape.wiki/images/Swashbuckler_icon_%28male%29.png?de503',              'solomons',   'outfit',  ['swashbuckler','pirate','adventurer']],
  ['privateer',       'Privateer',                        'https://runescape.wiki/images/Privateer_icon.jpg?09349',                           'solomons',   'outfit',  ['privateer','pirate','sea','adventurer']],
  ['eastern',         'Eastern',                          'https://runescape.wiki/images/Eastern_icon_%28male%29.png?7e324',                  'solomons',   'outfit',  ['eastern','wushanko','oriental','elegant']],
  ['eastern-captain', 'Eastern_Captain',                  'https://runescape.wiki/images/Eastern_Captain_Tricorne_%28female%29_chathead.png?f3149','solomons','outfit', ['eastern','captain','wushanko','oriental']],
  ['eastern-crew',    'Eastern_Crew',                     'https://runescape.wiki/images/Eastern_Crew_icon_%28male%29.png?77a33',             'solomons',   'outfit',  ['eastern','crew','wushanko','oriental']],
  ['monarch',         'Monarch_(override)',                'https://runescape.wiki/images/Monarch_%28override%29_icon_%28male%29.png?b66e4',   'solomons',   'armour',  ['monarch','royal','crown','regal']],
  ['navigator',       'Navigator_(override)',              'https://runescape.wiki/images/Navigator_%28override%29_icon.png?5b527',            'solomons',   'outfit',  ['navigator','explorer','sea','historical']],
  ['war-robes-guthix','War_Robes_(Guthix)',               'https://runescape.wiki/images/War_Robes_%28Guthix%29_Hood_chathead.png?6e44f',     'solomons',   'robes',   ['war-robes','guthix','balance','divine']],
  ['war-robes-sara',  'War_Robes_(Saradomin)',            'https://runescape.wiki/images/War_Robes_%28Saradomin%29_Hood_chathead.png?e8bcf',  'solomons',   'robes',   ['war-robes','saradomin','holy','divine']],
  ['war-robes-zammy', 'War_Robes_(Zamorak)',              'https://runescape.wiki/images/War_Robes_%28Zamorak%29_Hood_chathead.png?c2759',    'solomons',   'robes',   ['war-robes','zamorak','dark','divine']],
  ['war-robes-zaros', 'War_Robes_(Zaros)',                'https://runescape.wiki/images/War_Robes_%28Zaros%29_Hood_chathead.png?8212f',      'solomons',   'robes',   ['war-robes','zaros','ancient','divine']],
  ['barbarian',       'Barbarian_(override)',              'https://runescape.wiki/images/Barbarian_Helmet_chathead.png?77200',               'solomons',   'armour',  ['barbarian','barbarian-village','warrior','rugged']],
  ['beast',           'Beast_(override)',                  'https://runescape.wiki/images/Beast_%28override%29_icon.png?eb0ce',               'solomons',   'outfit',  ['beast','monster','dark','transform']],
  ['colossus',        'Colossus_(override)',               'https://runescape.wiki/images/Colossus_%28override%29_icon.png?8ec24',            'solomons',   'armour',  ['colossus','giant','stone','imposing']],
  ['titan',           'Titan_(override)',                  'https://runescape.wiki/images/Titan_%28override%29_icon.png?ffea1',               'solomons',   'armour',  ['titan','powerful','dark','imposing']],
  ['lion',            'Lion_(override)',                   'https://runescape.wiki/images/Lion_%28override%29_icon.png?867c8',                'solomons',   'outfit',  ['lion','animal','regal','cat']],
  ['wolf',            'Wolf_(override)',                   'https://runescape.wiki/images/Wolf_%28override%29_icon_%28male%29.png?9e861',     'solomons',   'outfit',  ['wolf','animal','wild','nordic']],
  ['fox',             'Fox_(override)',                    'https://runescape.wiki/images/Fox_%28override%29_icon_%28male%29.png?ae79f',      'solomons',   'outfit',  ['fox','animal','cunning','russet']],
  ['feline',          'Feline',                           'https://runescape.wiki/images/Feline_icon_%28male%29.png?d0492',                  'solomons',   'outfit',  ['feline','cat','elegant','sleek']],
  ['griffin',         'Griffin',                          'https://runescape.wiki/images/Griffin_Crown_chathead_%28male%29.png?8ab92',        'solomons',   'armour',  ['griffin','mythical','regal','wings']],
  ['demonflesh-greater','Demonflesh_(Greater)',            'https://runescape.wiki/images/Demonflesh_%28Greater%29_Mask_chathead.png?d2167',  'solomons',   'outfit',  ['demonflesh','demon','dark','sinister']],
  ['demonflesh-lesser','Demonflesh_(Lesser)',              'https://runescape.wiki/images/Demonflesh_%28Lesser%29_icon_%28male%29.png?731c6', 'solomons',   'outfit',  ['demonflesh','demon','dark','sinister']],
  ['chaos-witch',     'Chaos_Witch_(override)',            'https://runescape.wiki/images/Chaos_Witch_hat_chathead.png?a42f8',                'solomons',   'robes',   ['chaos-witch','witch','dark','mage']],
  ['chaos-witch-adept','Chaos_Witch_Adept',               'https://runescape.wiki/images/Chaos_Witch_Adept_hat_chathead.png?fc255',          'solomons',   'robes',   ['chaos-witch','adept','witch','dark']],
  ['chaos-witch-master','Chaos_Witch_Master',              'https://runescape.wiki/images/Chaos_Witch_Master_hat_chathead.png?2d387',         'solomons',   'robes',   ['chaos-witch','master','witch','dark']],
  ['werewolf',        'Werewolf_(override)',               'https://runescape.wiki/images/Werewolf_%28override%29_icon_%28male%29.png?6b1c3', 'solomons',   'outfit',  ['werewolf','monster','dark','transform']],
  ['faceless-enforcer-blue',  'Faceless_Enforcer_Outfit_(Blue)',   'https://runescape.wiki/images/Faceless_Enforcer_Mask_%28Blue%29.png?32803',   'solomons','armour', ['faceless','enforcer','blue','color-variant']],
  ['faceless-enforcer-green', 'Faceless_Enforcer_Outfit_(Green)',  'https://runescape.wiki/images/Faceless_Enforcer_Mask_%28Green%29.png?3f1c5',  'solomons','armour', ['faceless','enforcer','green','color-variant']],
  ['faceless-enforcer-purple','Faceless_Enforcer_Outfit_(Purple)', 'https://runescape.wiki/images/Faceless_Enforcer_Mask_%28Purple%29.png?4cfc7', 'solomons','armour', ['faceless','enforcer','purple','color-variant']],
  ['faceless-enforcer-red',   'Faceless_Enforcer_Outfit_(Red)',    'https://runescape.wiki/images/Faceless_Enforcer_Mask_%28Red%29.png?10029',    'solomons','armour', ['faceless','enforcer','red','color-variant']],
  ['faceless-enforcer-master','Faceless_Enforcer_(Master)',        'https://runescape.wiki/images/Faceless_Enforcer_Mask_%28Master%29.png?2628a', 'solomons','armour', ['faceless','enforcer','master','elite']],
  ['reforged-sara',   'Reforged_Saradomin_Armour',        'https://runescape.wiki/images/Reforged_Saradomin_Full_Helm_chathead.png?dce70',   'solomons',   'armour',  ['reforged','saradomin','holy','warrior']],
  ['reforged-zammy',  'Reforged_Zamorak_Armour',          'https://runescape.wiki/images/Reforged_Zamorak_Full_Helm_chathead.png?54d61',     'solomons',   'armour',  ['reforged','zamorak','dark','warrior']],
  ['radiant-dawn',    'Radiant_Dawn',                     'https://runescape.wiki/images/Radiant_Dawn_Headpiece_chathead.png?ace8a',          'solomons',   'armour',  ['radiant','dawn','light','holy']],
  ['furies-agent',    'Furies_Agent',                     'https://runescape.wiki/images/Furies_Agent_Horns_%28male%29_chathead.png?de70f',   'solomons',   'armour',  ['furies','agent','horns','dark']],
  ['gu-ronin',        'Gu_Ronin_(override)',               'https://runescape.wiki/images/Gu_Ronin_Helm_chathead.png?08928',                  'solomons',   'armour',  ['gu-ronin','ronin','samurai','wushanko']],
  ['dervish',         'Dervish',                          'https://runescape.wiki/images/Dervish_icon_%28male%29.png?1adfc',                  'solomons',   'outfit',  ['dervish','desert','menaphos','elegant']],
  ['legatus',         'Legatus_Maximus_(override)',        'https://runescape.wiki/images/Legatus_Maximus_%28override%29_equipped_%28male%29.png?9442e','solomons','armour',['legatus','roman','maximus','imposing']],
  ['vampire-hunter',  'Vampyre_Hunter',                   'https://runescape.wiki/images/Vampyre_Hunter_Torso.png?61edd',                    'solomons',   'outfit',  ['vampire-hunter','morytania','dark','hunter']],
  ['hexers',          "Hexer's_Outfit",                   'https://runescape.wiki/images/Hexer%27s_Crown_chathead.png?8fff3',                 'solomons',   'robes',   ['hexer','mage','witch','dark']],
  ['spirit-hunter',   'Spirit_Hunter',                    'https://runescape.wiki/images/Spirit_Hunter_icon.png?c124e',                      'solomons',   'outfit',  ['spirit','hunter','ethereal','white']],
  ['tundral-stalker', 'Tundral_stalker',                  'https://runescape.wiki/images/Tundral_stalker_hood_chathead.png?2dca3',            'solomons',   'ranged',  ['tundral','stalker','snow','arctic']],
  ['savage-hawk',     'Skypouncer_(override)',             'https://runescape.wiki/images/Skypouncer_Headpiece_%28male%29_chathead.png?b8fa3', 'solomons',   'armour',  ['skypouncer','hawk','aerial','savage']],
];

// ── Generate item display name for each piece ──
function pieceName(setTitle, type, slotKey, pieceSuffix) {
  // Strip override/armour/outfit suffixes from title for cleaner names
  const base = setTitle
    .replace(/ \(override\)$/i,'').replace(/_/g,' ')
    .replace(/ Armour$/, '').replace(/ Outfit$/, '')
    .replace(/ Outfit$/, '').replace(/ Robes$/, '')
    .trim();
  return `${base} ${pieceSuffix}`;
}

// ── Generate ITEMS JS lines ──
const newItemLines = [];
for (const [setKey, slug, previewUrl, era, type, tags] of SETS) {
  const pieces = TYPES[type];
  const displayTitle = slug.replace(/_/g,' ').replace(/%27/g,"'").replace(/%28/g,'(').replace(/%29/g,')');
  for (const [slotKey, pieceSuffix] of pieces) {
    const id = `${setKey}-${slotKey}`;
    const name = pieceName(displayTitle, type, slotKey, pieceSuffix);
    const cosmDesc = `${displayTitle.replace(/ \(override\)$/, '')} cosmetic override.`;
    const tagsStr = JSON.stringify(tags);
    newItemLines.push(
      `  {id:'${id}',name:${JSON.stringify(name)},cat:'cosmetic-armor',slot:'${slotKey}',tier:0,style:'cosmetic',era:'${era}',setKey:'${setKey}',tags:${tagsStr},slug:${JSON.stringify(slug)},isCosmetic:true,stats:{},cosmDesc:${JSON.stringify(cosmDesc)}},`
    );
  }
}

// ── Locate end of cosmetic-armor block (first cosmetic-weapon item) ──
const cwIdx = html.indexOf("cat:'cosmetic-weapon'");
// Walk back to start of that line
let insertAt = html.lastIndexOf('\n', cwIdx);
const insertBlock = newItemLines.join('\n');

let newHtml = html.slice(0, insertAt) + '\n' + insertBlock + html.slice(insertAt);

// ── Bake BAKED_WIKI_CACHE ──
const wm = newHtml.match(/const BAKED_WIKI_CACHE = (\{[^\n]+\});/);
const cache = JSON.parse(wm[1]);
for (const [setKey, slug, previewUrl] of SETS) {
  cache[slug] = { t: previewUrl };
}
newHtml = newHtml.replace(/const BAKED_WIKI_CACHE = \{[^\n]+\};/, `const BAKED_WIKI_CACHE = ${JSON.stringify(cache)};`);

// ── Bake BAKED_SET_IMAGES (3rd occurrence) ──
let siIdx = 0, found = 0;
while ((siIdx = newHtml.indexOf('const BAKED_SET_IMAGES = {', siIdx + 1)) !== -1 && ++found < 3);
const siEnd = newHtml.indexOf('\n};', siIdx) + 3;
let siBlock = newHtml.slice(siIdx, siEnd);

// Find insertion point just before closing '};'
const siCloseIdx = siBlock.lastIndexOf('\n};');
const newEntries = SETS.map(([setKey,,previewUrl]) => `  '${setKey}': '${previewUrl}',`).join('\n');
siBlock = siBlock.slice(0, siCloseIdx) + '\n' + newEntries + siBlock.slice(siCloseIdx);
newHtml = newHtml.slice(0, siIdx) + siBlock + newHtml.slice(siEnd);

// ── Size guard ──
const delta = newHtml.length - html.length;
console.log(`Items added: ${newItemLines.length}`);
console.log(`Sets baked: ${SETS.length}`);
console.log(`Cache entries: ${Object.keys(cache).length}`);
console.log(`Delta: ${delta} bytes`);
if (newHtml.length < html.length + 1000) { console.error('ABORT — file grew less than expected'); process.exit(1); }
if (newHtml.length > html.length + 200_000) { console.error('ABORT — file grew too much'); process.exit(1); }

writeFileSync(path, newHtml, 'utf-8');
console.log('Done.');
