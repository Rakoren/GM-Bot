import csv
from pathlib import Path
import re

base = Path(__file__).resolve().parents[1]
old = base / 'data_sets' / 'D&D' / 'feats.csv'
new = base / 'data_sets' / 'D&D' / 'feats_new.csv'
backup = old.with_suffix('.csv.bak')
backup.write_bytes(old.read_bytes())

# load existing names
existing = set()
rows = []
with old.open(encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for r in reader:
        existing.add(r['name'].strip())
        rows.append(r)

# read new feats
added = []
with new.open(encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for r in reader:
        name = r['name'].strip()
        if name in existing or not name:
            continue
        # create feat_id
        fid = 'FEAT_' + re.sub(r"[^A-Za-z0-9]+", '_', name).upper()
        # parse level requirement from prerequisites
        prereq = r.get('prerequisites','')
        lvl = ''
        m = re.search(r'Level\s*(\d+)', prereq)
        if m:
            lvl = m.group(1)
        # determine type/category
        desc = r.get('description','')
        if 'Origin' in desc or 'Origin Feat' in desc:
            ftype = 'Origin'
        elif 'Fighting Style' in desc or 'Fighting Style Feat' in desc:
            ftype = 'Fighting Style'
        elif 'Epic Boon' in desc or 'Epic Boon Feat' in desc:
            ftype = 'Epic Boon'
        else:
            ftype = 'General'
        newrow = {
            'feat_id': fid,
            'name': name,
            'prerequisites': prereq,
            'type': ftype,
            'level_requirement': lvl,
            'benefit_summary': r.get('benefit_summary',''),
            'description': r.get('description',''),
            'tags': '',
            'source': r.get('source','PHB (2024)'),
            'version': r.get('version','2024')
        }
        rows.append(newrow)
        existing.add(name)
        added.append(name)

# ensure fieldnames
if not fieldnames:
    fieldnames = ['feat_id','name','prerequisites','type','level_requirement','benefit_summary','description','tags','source','version']

with old.open('w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for r in rows:
        writer.writerow(r)

print('Added feats:', added)
