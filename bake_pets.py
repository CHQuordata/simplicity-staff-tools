import re, json, time, urllib.request, urllib.parse, sys

path = r'C:\Users\chris\OneDrive\Desktop\Simplicity\Dashboards\rs3-asset-library.html'
with open(path, 'rb') as f:
    raw = f.read()
content = raw.decode('utf-8')

# ── Extract existing BAKED_WIKI_CACHE ────────────────────────────────────────
m = re.search(r'const BAKED_WIKI_CACHE = (\{[^\n]+\});', content)
if not m:
    print('ERROR: BAKED_WIKI_CACHE not found'); sys.exit(1)
existing_cache = json.loads(m.group(1))
print(f'Existing cache: {len(existing_cache)} entries')

# ── Extract all pet slugs ─────────────────────────────────────────────────────
# Each item is one line; slug comes as slug:'...' or slug:"..."
pet_slugs = []
for line in content.split('\n'):
    if "cat:'pets'" not in line:
        continue
    sm = re.search(r"slug:(?:'([^']*)'|\"([^\"]*)\")", line)
    if sm:
        pet_slugs.append(sm.group(1) or sm.group(2))

print(f'Pet slugs in file: {len(pet_slugs)}')

to_fetch = [s for s in pet_slugs if s not in existing_cache]
print(f'Not yet in cache: {len(to_fetch)}')

if not to_fetch:
    print('Nothing to fetch — already fully baked.')
    sys.exit(0)

# ── Fetch from RS3 wiki API ───────────────────────────────────────────────────
WIKI_API = 'https://runescape.wiki/api.php'
BATCH    = 50
new_entries = {}

for i in range(0, len(to_fetch), BATCH):
    batch = to_fetch[i:i+BATCH]
    batch_num = i // BATCH + 1
    total_batches = (len(to_fetch) + BATCH - 1) // BATCH

    # Build title→originalSlug map BEFORE the request
    title_to_slug = {s.replace('_', ' '): s for s in batch}

    params = urllib.parse.urlencode({
        'action':      'query',
        'prop':        'pageimages|images',
        'pithumbsize': '60',
        'imlimit':     '50',
        'redirects':   '1',
        'titles':      '|'.join(s.replace('_', ' ') for s in batch),
        'format':      'json',
        'origin':      '*',
    })
    url = WIKI_API + '?' + params
    req = urllib.request.Request(url, headers={'User-Agent': 'SimplicitRS3Tool/1.0'})

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f'  Batch {batch_num}/{total_batches} FAILED: {e}')
        time.sleep(3)
        continue

    # Apply normalization + redirects to title→slug map
    for n in data.get('query', {}).get('normalized', []):
        orig = n['from']
        resolved = n['to']
        orig_slug = orig.replace(' ', '_')
        if orig_slug in batch:
            title_to_slug[resolved] = orig_slug

    for r in data.get('query', {}).get('redirects', []):
        frm = r['from']
        to  = r['to']
        if frm in title_to_slug:
            title_to_slug[to] = title_to_slug[frm]

    pages = data.get('query', {}).get('pages', {})
    hits = 0
    for page in pages.values():
        if 'missing' in page:
            continue
        page_title   = page.get('title', '')
        original_slug = title_to_slug.get(page_title, page_title.replace(' ', '_'))
        thumb = page.get('thumbnail', {}).get('source', '')
        gifs  = [img['title'].replace('File:', '') for img in page.get('images', [])
                 if img['title'].lower().endswith('.gif')]
        entry = {}
        if thumb: entry['t'] = thumb
        if gifs:  entry['g'] = gifs
        if entry:
            new_entries[original_slug] = entry
            hits += 1

    print(f'  Batch {batch_num}/{total_batches}: {hits}/{len(batch)} hits')
    time.sleep(1.5)

print(f'\nFetched {len(new_entries)} new entries')

# ── Merge and write back ──────────────────────────────────────────────────────
existing_cache.update(new_entries)
cache_json   = json.dumps(existing_cache, ensure_ascii=False, separators=(',', ':'))
new_cache_str = f'const BAKED_WIKI_CACHE = {cache_json};'

new_content = re.sub(r'const BAKED_WIKI_CACHE = \{[^\n]+\};', new_cache_str, content)
if new_content == content:
    print('ERROR: replacement produced no change — regex mismatch'); sys.exit(1)

with open(path, 'wb') as f:
    f.write(new_content.encode('utf-8'))

print(f'Done! BAKED_WIKI_CACHE now has {len(existing_cache)} entries.')
