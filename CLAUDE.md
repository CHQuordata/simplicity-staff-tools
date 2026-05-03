# Simplicity Staff Tools — Claude Rules

## rs3-asset-library.html — Script Safety

This file is a single ~700KB HTML file with a giant single-line `BAKED_WIKI_CACHE` constant.
Running regex replacements on the full file string will corrupt it.

### Rules for any script that edits this file:

1. **Scope all replacements to the target block only.**
   Slice out the section you want to modify, operate on that slice, then splice it back:
   ```js
   const startIdx = html.indexOf('const LOOKBOOKS = [');
   const endIdx   = html.lastIndexOf('];', html.indexOf('let _lookbookFilter', startIdx)) + 2;
   let block = html.slice(startIdx, endIdx);
   // ... modify block only ...
   const newHtml = html.slice(0, startIdx) + block + html.slice(endIdx);
   ```

2. **Always assert the file shrinks (or grows by at most ~100 bytes) before writing.**
   ```js
   if (newHtml.length > html.length + 100) { console.error('ABORT — file grew unexpectedly'); process.exit(1); }
   ```

3. **The only safe global replacement is on the single-line cache constants:**
   ```js
   html.replace(/const BAKED_WIKI_CACHE = \{[^\n]+\};/, 'const BAKED_WIKI_CACHE = ' + JSON.stringify(cache) + ';')
   ```
   These are single-line so `[^\n]+` is safe. Everything else must be block-scoped.

4. **Prefer the Edit tool for small targeted removals** — use scripts only when iterating over many items.

5. **Never use `-e` inline node scripts for regex work on this file** — escaping is error-prone. Write a `.mjs` file instead.

6. **Always run a pre-write syntax check before writing any modified file:**
   ```js
   const scriptSrc = newHtml.slice(newHtml.indexOf('<script>') + 8, newHtml.indexOf('</script>'));
   try { new Function(scriptSrc); } catch(e) { console.error('SYNTAX ERROR:', e.message); process.exit(1); }
   ```
   This catches JS syntax errors (e.g. unquoted `2h` property keys) before they brick the dashboard.

7. **Property keys that are not valid JS identifiers must be quoted.** `2h`, numeric-prefixed names, and hyphenated names all need quotes: `'2h':'value'` not `2h:'value'`.

## rs3-asset-library.html — Item Addition Rule

**Any item with no accessible wiki image must not be added to the dashboard.**

Before adding any new item:
1. Confirm its wiki image exists (probe `BAKED_WIKI_CACHE` slug against `runescape.wiki/api.php` or `oldschool.runescape.wiki/api.php`)
2. If no image is found — remove the item entirely. Do not add it with a placeholder or broken card.
3. If an item is already in the dashboard and its wiki image is confirmed dead — remove it immediately.

This applies to all categories: weapons, armour, cosmetics, pets, auras, etc.
