import csv
from pathlib import Path

base = Path(__file__).resolve().parents[1]
path = base / 'data_sets' / 'D&D' / 'species_traits.csv'
backup = path.with_suffix('.csv.bak')
backup.write_bytes(path.read_bytes())

seen = set()
rows = []
with path.open(encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for r in reader:
        tid = r.get('trait_id','')
        if tid in seen:
            continue
        seen.add(tid)
        rows.append(r)

with path.open('w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for r in rows:
        writer.writerow(r)

print(f'Wrote deduped species_traits.csv ({len(rows)} rows); backup saved to {backup.name}')
