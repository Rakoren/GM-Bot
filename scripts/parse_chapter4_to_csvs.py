import re
from pathlib import Path
import csv

base = Path(__file__).resolve().parents[1]
chapter_path = base / 'PHB 2024' / 'Chapter 4.txt'
out_dir = base / 'data_sets' / 'D&D'

text = chapter_path.read_text(encoding='utf-8')
# normalize whitespace
text = re.sub(r"\s+"," ", text)

# extract backgrounds section
bg_start = text.find('Back ground Descriptions')
species_start = text.find('Species Descriptions')
if bg_start==-1 or species_start==-1:
    print('Could not locate background or species sections')
    raise SystemExit(1)

bg_text = text[bg_start:species_start]
sp_text = text[species_start:]

# known background names in this chapter based on the text
bg_names = ['Acolyte','Artisan','Charlatan','Criminal','Entertainer','Farmer','Guard','Guide','Hermit','Merchant','Noble','Sage','Sailor','Scribe','Soldier','Wayfarer']

# split backgrounds
bg_entries = {}
for name in bg_names:
    # find pattern like 'Name Ability'
    m = re.search(rf"{name} Ability Scor es: (.+?)(?=(?:{'|'.join(bg_names)}) Ability Scor es:|$)", bg_text)
    if m:
        bg_entries[name] = m.group(1).strip()
    else:
        # fallback: try to find name and capture until next name
        m2 = re.search(rf"{name} (.+?)(?=(?:{'|'.join(bg_names)}) |$)", bg_text)
        if m2:
            bg_entries[name] = m2.group(1).strip()

# write backgrounds CSV
bg_csv = out_dir / 'backgrounds_new.csv'
with bg_csv.open('w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['background','raw'])
    for k,v in bg_entries.items():
        writer.writerow([k,v])

# extract species list
# species names listed earlier: Aasimar, Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling
species_names = ['Aasimar','Dragonborn','Dwarf','Elf','Gnome','Goliath','Halfling','Human','Orc','Tiefling']
sp_entries = {}
for i,name in enumerate(species_names):
    # capture from name to next species
    if i < len(species_names)-1:
        nxt = species_names[i+1]
        m = re.search(rf"{name} (.+?)(?={nxt} )", sp_text)
    else:
        m = re.search(rf"{name} (.+)", sp_text)
    if m:
        sp_entries[name] = m.group(1).strip()

# parse basic traits: Creature Type, Size, Speed
species_rows = []
traits_rows = []
for name,body in sp_entries.items():
    creature = re.search(r'Creatur e Type: ([^ ]+)', body)
    size = re.search(r'Size: ([^ ]+)', body)
    speed = re.search(r'Speed: (\d+)', body)
    creature_v = creature.group(1) if creature else ''
    size_v = size.group(1) if size else ''
    speed_v = speed.group(1) if speed else ''
    species_rows.append((name, creature_v, size_v, speed_v))
    # find 'As a NAME, you have these special traits.' and capture until next capitalized 'Traits' or next species
    traits_match = re.search(rf"As an? {name},? you ha ve these special tr aits\.(.+?)(?=(?:[A-Z][a-z]+ Traits|As an? )|$)", body)
    if traits_match:
        traits_text = traits_match.group(1).strip()
    else:
        # fallback capture up to 'Traits' header
        t2 = re.search(r"Traits (.+)", body)
        traits_text = t2.group(1).strip() if t2 else ''
    traits_rows.append((name, traits_text))

# write species CSVs
sp_csv = out_dir / 'species_new.csv'
with sp_csv.open('w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['species','creature_type','size','speed'])
    for r in species_rows:
        writer.writerow(r)

tr_csv = out_dir / 'species_traits_new.csv'
with tr_csv.open('w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['species','traits_raw'])
    for r in traits_rows:
        writer.writerow(r)

print('Wrote:', bg_csv, sp_csv, tr_csv)
