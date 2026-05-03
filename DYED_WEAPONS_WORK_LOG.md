# RS3 Asset Library — Dyed Weapons Work Log

## Project Context

- **File:** `Dashboards/rs3-asset-library.html` (single-file HTML dashboard, vanilla JS, dark theme)
- **Repo:** Live on GitHub Hub — every change must be committed + pushed immediately
- **Bake scripts:** `bake_dyed_weapons.mjs`, `bake_discontinued.mjs`, `bake_cosmetic_weapons.mjs`
- **Cache:** `BAKED_WIKI_CACHE` — inline JS constant `{slug: {t?: thumbUrl, g?: [gifNames]}}` baked into the HTML

---

## What Was Done This Session

### 1. Removed Wrong `isDyed:true` Block (~90 entries)

A previous session had added 90 dyed weapon entries using a completely wrong slug format:

```js
// WRONG — these files don't exist on the wiki
slug:'Zaros_godsword_(Blood_dye)'
slug:'Ek-ZekKil_(Smoke_dye)'
slug:'Noxious_scythe_(Abyssal)'
```

These were `cat:'weapons'`, `isDyed:true` — wrong category, wrong slugs, wrong dye names (referenced "Smoke dye", "Eldritch dye", "Abyssal dye" which don't apply to weapons). All 90 were deleted.

---

### 2. Rewrote Dyed Weapon Section (136 correct entries)

Replaced the deleted block + expanded the existing partial `cat:'cosmetic-weapon'` block into a complete, wiki-verified dataset.

#### Correct Wiki Slug Format

| Dye | Slug suffix | Notes |
|-----|------------|-------|
| blood | `_(blood)` | lowercase |
| ice | `_(ice)` | lowercase |
| shadow | `_(shadow)` | lowercase |
| Soul | `_(Soul)` | capital S |
| Aurora | `_(Aurora)` | capital A |
| Barrows | `_(Barrows)` | capital B |
| Third Age | `_(Third_Age)` | capital T and A |

#### Weapons Covered

| Weapon | Dye count | Notes |
|--------|-----------|-------|
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

**Off-hand Eldritch crossbow** and **Off-hand Ascension crossbow** have NO dye images on the wiki — not included.

**Total: 136 entries**

#### Item Structure Used

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
  cosmDesc: 'Blood-dyed Zaros godsword. Crimson recolor of the iconic T92 ancient melee weapon.'
}
```

---

### 3. Updated `bake_dyed_weapons.mjs`

Changed detection from `isDyed:true` to `cat:'cosmetic-weapon'` + `'dyed'` in tags:

```js
// OLD — broken after isDyed block deleted
if (!line.includes('isDyed:true')) continue;

// NEW — correct
if (!line.includes("cat:'cosmetic-weapon'")) continue;
if (!line.includes("'dyed'")) continue;
```

---

### 4. Baked 91 New Wiki Thumbnails

Ran `node bake_dyed_weapons.mjs`:
- **91 slugs** detected as missing from cache
- **90 direct wiki hits** — each returned `_{dye}_detail.png` (the actual dyed variant detail image)
- **1 fallback** — `Off-hand_drygore_rapier_(ice)` has no thumb on wiki, used base weapon image
- Cache grew from **1,135 → 1,226 entries**

Example cached URL:
```
Zaros_godsword_(Aurora) →
https://runescape.wiki/images/thumb/Zaros_godsword_%28Aurora%29_detail.png/200px-Zaros_godsword_%28Aurora%29_detail.png
```

The `pageimages` API returns the item page's primary image, which for RS3 wiki weapon pages is always the `_detail.png`. This means each dyed variant card shows its specific coloured detail image, not the base weapon.

---

### 5. Committed & Pushed

```
commit f60b25a
Replace dyed weapon data with correct wiki slugs, expand to full 7-dye coverage
```

**Live on GitHub Hub immediately after push.**

---

## Key Rules Going Forward

1. **Always push after every change** — site is live from GitHub, local edits are invisible until pushed
2. **Dye slug format** — `_(blood)` not `_(Blood_dye)`, Soul/Aurora/Barrows/Third_Age are capitalised
3. **BoLG exception** — only 4 dyes (no blood/ice/shadow)
4. **Eldritch CBow exception** — 6 dyes, `_(barrows)` is lowercase, no shadow
5. **No off-hand dye images** — Off-hand Eldritch and Off-hand Ascension have no wiki equipped images
6. **Bake detection** — detect dyed weapons by `cat:'cosmetic-weapon'` + `'dyed'` in tags

---

## Files Modified

| File | What changed |
|------|-------------|
| `Dashboards/rs3-asset-library.html` | Deleted 90 wrong entries, added 136 correct dyed weapon entries, updated BAKED_WIKI_CACHE (+91 entries) |
| `bake_dyed_weapons.mjs` | Updated item detection from `isDyed:true` to `cat+dyed tag` |
