import csv
import re

def clean_name(name):
    # Fix common OCR issues
    name = re.sub(r'\b s \b', "'s ", name)  # " s " -> "'s "
    name = re.sub(r' F ir e', " Fire", name)
    name = re.sub(r' F ocus', " Focus", name)
    name = re.sub(r' P ouch', " Pouch", name)
    name = re.sub(r'Scr oll', "Scroll", name)
    name = re.sub(r'Cr ossbow', "Crossbow", name)
    name = re.sub(r'Bullse ye', "Bullseye", name)
    name = re.sub(r'Ir on', "Iron", name)
    name = re.sub(r'P ot', "Pot", name)
    name = re.sub(r'P ortable', "Portable", name)
    name = re.sub(r'Spik es', "Spikes", name)
    name = re.sub(r'Tinderbo x', "Tinderbox", name)
    name = re.sub(r'Enter tainer', "Entertainer", name)
    name = re.sub(r'Explor er', "Explorer", name)
    name = re.sub(r'Climber', "Climber", name)
    name = re.sub(r'Diplomat', "Diplomat", name)
    name = re.sub(r'Druidic', "Druidic", name)
    name = re.sub(r'Component', "Component", name)
    name = re.sub(r'Bask et', "Basket", name)
    name = re.sub(r'Bedr oll', "Bedroll", name)
    name = re.sub(r'Blank et', "Blanket", name)
    name = re.sub(r'Buck et', "Bucket", name)
    name = re.sub(r'Caltr ops', "Caltrops", name)
    name = re.sub(r'Costume', "Costume", name)
    name = re.sub(r'Lantern', "Lantern", name)
    name = re.sub(r'Manacles', "Manacles", name)
    name = re.sub(r'Net', "Net", name)
    name = re.sub(r'Oil', "Oil", name)
    name = re.sub(r'Pole', "Pole", name)
    name = re.sub(r'Quiv er', "Quiver", name)
    name = re.sub(r'Rations', "Rations", name)
    name = re.sub(r'Robe', "Robe", name)
    name = re.sub(r'Rope', "Rope", name)
    name = re.sub(r'Shovel', "Shovel", name)
    name = re.sub(r'Tent', "Tent", name)
    name = re.sub(r'Torch', "Torch", name)
    name = re.sub(r'Waterskin', "Waterskin", name)
    # Fix specific ones
    name = re.sub(r'Mirror 1/', 'Mirror', name)
    name = re.sub(r'Potion of Healing 1/', 'Potion of Healing', name)
    name = re.sub(r'Sack 1/', 'Sack', name)
    name = re.sub(r'000', '1000', name)  # Spyglass cost
    return name.strip()

def clean_csv(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    for row in rows:
        row['name'] = clean_name(row['name'])
        if row['cost'] == '000 GP':
            row['cost'] = '1000 GP'
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=reader.fieldnames)
        writer.writeheader()
        writer.writerows(rows)

if __name__ == "__main__":
    clean_csv('data_sets/D&D/adventuring_gear.csv')