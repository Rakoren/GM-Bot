import csv
from pathlib import Path

base = Path(__file__).resolve().parents[1]
indir = base / 'data_sets' / 'D&D'

problems = []
for fname in ['backgrounds.csv','species.csv','feats.csv','spells.csv']:
    path = indir / fname
    with path.open(encoding='utf-8') as f:
        reader = csv.DictReader(f)
        ids = set()
        names = set()
        dup_ids = []
        dup_names = []
        for r in reader:
            if 'background_id' in r:
                idv = r['background_id']
            elif 'species_id' in r:
                idv = r['species_id']
            elif 'feat_id' in r:
                idv = r['feat_id']
            else:
                idv = ''
            name = r.get('name','')
            if idv:
                if idv in ids:
                    dup_ids.append(idv)
                ids.add(idv)
            if name:
                if name in names:
                    dup_names.append(name)
                names.add(name)
        print(f"{fname}: rows={len(names)}, dup_ids={dup_ids}, dup_names={dup_names}")

print('Validation complete')
