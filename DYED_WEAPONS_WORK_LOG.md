# RS3 Asset Library — Work Log

## Project Context

- **File:** `Dashboards/rs3-asset-library.html` (single-file HTML dashboard, vanilla JS, dark theme)
- **Repo:** Live on GitHub Hub — every change must be committed + pushed immediately
- **Bake scripts:** `bake_dyed_weapons.mjs`, `bake_discontinued.mjs`, `bake_cosmetic_weapons.mjs`
- **Cache:** `BAKED_WIKI_CACHE` — inline JS constant `{slug: {t?: thumbUrl, g?: [gifNames]}}` baked into the HTML

---

## Merged Changes (already in main)

### `remove-textures-animations` — merged via PR #1

**What it does:** Removes the Textures and Animations categories entirely — both from the sidebar and from the `ITEMS` data array.

**Deleted from sidebar:**
```html
<!-- REMOVED -->
<button data-cat="textures">🎨 Textures</button>
<button data-cat="animations">🎬 Animations</button>
```

**Deleted from ITEMS (~53 lines):**
- 16 texture items (`tex-obsidian`, `tex-glacyte`, `tex-dragon`, `tex-crystal`, `tex-barrows`, `tex-shadow`, `tex-abyssal`, `tex-third-age`, `tex-noxious`, `tex-masterwork`, `tex-blood`, `tex-ice`, `tex-soul`, `tex-smoke`, `tex-eldritch`, `tex-aurora`)
- 10 attack animation items (`anim-barrows`, `anim-whip`, `anim-2h-basic`, `anim-nox-scythe`, `anim-zaros-gs`, `anim-rcb`, `anim-magic-staff`, `anim-dual-wield-melee`, `anim-wand-offhand`, `anim-ascension-cbow`)
- 10 walk/idle/death override items (`anim-walk-plague`, `anim-walk-scorpion`, `anim-walk-royal`, `anim-walk-ranger`, `anim-walk-stealth`, `anim-walk-hellhound`, `anim-walk-penguin`, `anim-walk-sliske`, `anim-walk-vampyric`, `anim-walk-pirate`, `anim-idle-slayer`, `anim-idle-phantom`, `anim-idle-meditation`, `anim-death-reaper`, `anim-death-disintegrate`)

---

### `fix-cosmetic-icons` — merged via PR #2

**Builds on top of `remove-textures-animations`.** Adds `iconName` field to specific cosmetic items whose wiki filenames don't match their item name, fixing broken icon loading.

**How `iconName` works:**

The card renderer (`iconUrlChain()`) normally derives the wiki image filename from the item `name` or `slug`. When those don't match the actual wiki file, the icon 404s and falls through to a broken image. Adding `iconName` sets the exact wiki filename to use, bypassing the guessing logic:

```js
// In iconUrlChain():
if (item.iconName) {
  chain.push(cdn(item.iconName));   // direct CDN URL
  chain.push(sfp(item.iconName));   // Special:FilePath fallback
  if (cachedThumb) chain.push(cachedThumb);
  return chain;
}
```

**Items that got `iconName` added:**

| Item ID | `iconName` value | Why needed |
|---------|-----------------|-----------|
| `warlord-helm` | `Warlord headdress` | Wiki file is "headdress" not "helmet" |
| `warlord-body` | `Warlord tunic` | Wiki file is "tunic" not "body" |
| `warlord-legs` | `Warlord kilt` | Wiki file is "kilt" not "legs" |
| `samurai-helm` | `Samurai kasa` | Wiki file uses Japanese term "kasa" |
| `override-shadow-sword` | `Shadow sword detail` | Needs `detail` suffix to resolve correctly |
| `override-golden-scythe` | `Golden scythe` | Override suffix causes mismatch |

**Status:** Both branches merged and live on main.

---

## Session Work — Dyed Weapons Overhaul

### 1. Removed Wrong `isDyed:true` Block (~90 entries)

A previous session had added 90 dyed weapon entries using completely wrong slug format:

```js
// WRONG — these files don't exist on the wiki
slug: 'Zaros_godsword_(Blood_dye)'
slug: 'Ek-ZekKil_(Smoke_dye)'
slug: 'Noxious_scythe_(Abyssal)'
```

These were `cat:'weapons'`, `isDyed:true` — wrong category, wrong slugs, wrong dye names ("Smoke dye", "Eldritch dye", "Abyssal dye" don't apply to weapons). All 90 deleted.

---

### 2. Rewrote Dyed Weapon Section (136 correct entries)

Replaced deleted block + expanded existing partial `cat:'cosmetic-weapon'` block into a complete wiki-verified dataset.

#### Correct Wiki Slug Format

| Dye | Slug suffix | Capitalisation |
|-----|------------|----------------|
| blood | `_(blood)` | lowercase |
| ice | `_(ice)` | lowercase |
| shadow | `_(shadow)` | lowercase |
| Soul | `_(Soul)` | capital S |
| Aurora | `_(Aurora)` | capital A |
| Barrows | `_(Barrows)` | capital B |
| Third Age | `_(Third_Age)` | capital T and A |

#### Weapons Covered

| Weapon | Dyes | Notes |
|--------|------|-------|
| Zaros godsword | 7 | All dyes |
| Khopesh of Tumeken | 7 | All dyes |
| Khopesh of Elidinis | 7 | All dyes (offhand) |
| Seren godbow | 7 | All dyes |
| Fractured Staff of Armadyl | 7 | All dyes |
| Ek-ZekKil | 7 | All dyes |
| Noxious scythe | 7 | All dyes |
| Noxious longbow | 7 | All dyes |
| Noxious staff | 7 | All dyes |
| Drygore rapier | 7 | All dyes |
| Off-hand drygore rapier | 7 | All dyes |
| Drygore longsword | 7 | All dyes |
| Drygore mace | 7 | All dyes |
| Seismic wand | 7 | All dyes |
| Seismic singularity | 7 | All dyes (offhand) |
| Blightbound crossbow | 7 | All dyes |
| Ascension crossbow | 7 | All dyes |
| Imperium core | 7 | All dyes (offhand) |
| Bow of the Last Guardian | **4** | Aurora/Barrows/Soul/Third_Age only — no blood/ice/shadow on wiki |
| Eldritch crossbow | **6** | Aurora/Soul/Third_Age/barrows(lowercase!)/blood/ice — no shadow |

**Off-hand Eldritch crossbow** and **Off-hand Ascension crossbow** — NO dye images on wiki, not included.

**Total: 136 entries**

#### Item Structure

```js
{
  id: 'override-zaros-gs-blood',
  name: 'Zaros godsword (blood)',
  cat: 'cosmetic-weapon',
  slot: '2h',
  tier: 0,
  style: 'cosmetic',
  era: 'modern',
  tags: ['zaros', 'ancient', 'blood-dye', 'red', 'dyed', 'endgame'],
  slug: 'Zaros_godsword_(blood)',
  isCosmetic: true,
  stats: {},
  cosmDesc: 'Blood-dyed Zaros godsword.'
}
```

---

### 3. Updated `bake_dyed_weapons.mjs`

```js
// OLD
if (!line.includes('isDyed:true')) continue;

// NEW
if (!line.includes("cat:'cosmetic-weapon'")) continue;
if (!line.includes("'dyed'")) continue;
```

---

### 4. Baked 91 New Wiki Thumbnails

- **90 direct wiki hits** — each card gets the specific `_detail.png` for that dye variant
- **1 fallback** — `Off-hand_drygore_rapier_(ice)` has no wiki thumb, used base weapon image
- Cache: **1,135 → 1,226 entries**

The `pageimages` API returns each dye variant page's primary image = always `Weapon_(dye)_detail.png`. Scales to every weapon automatically.

---

## Key Rules

1. **Always push after every change** — site is live from GitHub, local edits are invisible until pushed
2. **Dye slug format** — `_(blood)` not `_(Blood_dye)`, Soul/Aurora/Barrows/Third_Age capitalised
3. **BoLG exception** — only 4 dyes (no blood/ice/shadow on wiki)
4. **Eldritch CBow exception** — 6 dyes, `_(barrows)` lowercase, no shadow
5. **No off-hand dye images** — Off-hand Eldritch and Off-hand Ascension have no wiki images
6. **Bake detection** — detect dyed weapons by `cat:'cosmetic-weapon'` + `'dyed'` in tags
7. **iconName field** — use on items whose wiki filename doesn't match their name/slug

---

## Commit History (this work)

| Commit | Description |
|--------|-------------|
| `f5dd680` | Fix icon loading for cosmetic items with mismatched wiki filenames (PR #2) |
| `5c7f099` | Remove textures and animations from sidebar (PR #1) |
| `f60b25a` | Replace dyed weapon data with correct wiki slugs, expand to full 7-dye coverage |
| `f985a32` | Bake thumbnails for dyed weapon variants |
| `fb68426` | Add 92 dyed weapon variants + 2 missing off-hand base weapons |
| `48eab67` | Remove Compare and Inspiration features from RS3 Asset Library |
