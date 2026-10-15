import os
import json
import hashlib
import sys

sys.stdout.reconfigure(encoding='utf-8')

prod_dir = r'c:\.d\previalo-project\data\03_production'
public_dir = r'c:\.d\previalo-project\public\data'

with open(os.path.join(prod_dir, 'catalog_manifest.json'), 'r', encoding='utf-8') as f:
    manifest = json.load(f)

print('Manifest declared total cards:', manifest['global_stats']['total_cards'])

total_cards_in_public = 0
for cat in manifest['categories']:
    rel_path = cat['file']
    pub_file = os.path.join(public_dir, rel_path)
    prod_file = os.path.join(prod_dir, rel_path)
    with open(prod_file, 'rb') as fp:
        prod_hash = hashlib.sha256(fp.read()).hexdigest()
    with open(pub_file, 'rb') as fp:
        pub_hash = hashlib.sha256(fp.read()).hexdigest()
    
    assert prod_hash == pub_hash == cat['sha256'], f"SHA256 mismatch for {rel_path}"
    
    with open(pub_file, 'r', encoding='utf-8') as fp:
        d = json.load(fp)
    if 'cards' in d:
        c_count = len(d['cards'])
    else:
        c_count = len(d.get('drink_events', [])) + len(d.get('board_events', [])) + len(d.get('hot_events_level1', [])) + len(d.get('hot_events_level2', [])) + len(d.get('hot_events_level3', []))
    cid = cat.get('category_id') or cat.get('id')
    tot = cat.get('card_count', 0)
    print(f"Category {cid}: {c_count} cards (matches declared: {c_count == tot}) - SHA256: {pub_hash[:12]}... OK")
    total_cards_in_public += c_count

print('--- Presets ---')
for pre in manifest['presets']:
    rel_path = pre['file']
    pub_file = os.path.join(public_dir, rel_path)
    prod_file = os.path.join(prod_dir, rel_path)
    with open(prod_file, 'rb') as fp:
        prod_hash = hashlib.sha256(fp.read()).hexdigest()
    with open(pub_file, 'rb') as fp:
        pub_hash = hashlib.sha256(fp.read()).hexdigest()
    assert prod_hash == pub_hash == pre['sha256'], f"SHA256 mismatch for preset {rel_path}"
    with open(pub_file, 'r', encoding='utf-8') as fp:
        d = json.load(fp)
    pid = pre.get('preset_id') or pre.get('id')
    cnt = len(d.get('cards', []))
    print(f"Preset {pid}: {cnt} cards - SHA256: {pub_hash[:12]}... OK")

print(f"TOTAL ACCUMULATED CARDS IN PUBLIC/DATA: {total_cards_in_public}")
assert total_cards_in_public == 6937, f"Expected 6937 but got {total_cards_in_public}"
print("VERIFICATION OF 6,937 CARDS AND 100% SHA-256 MATCH: ABSOLUTELY PASSED!")
