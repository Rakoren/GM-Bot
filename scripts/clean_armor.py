import csv
import re

def clean_name(name):
    name = re.sub(r'Chain Shir t', 'Chain Shirt', name)
    return name

def clean_ac(ac):
    ac = re.sub(r' \+ D', ' + Dex modifier', ac)
    return ac

def clean_csv(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    for row in rows:
        row['name'] = clean_name(row['name'])
        row['ac'] = clean_ac(row['ac'])
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=reader.fieldnames)
        writer.writeheader()
        writer.writerows(rows)

if __name__ == "__main__":
    clean_csv('data_sets/D&D/armor.csv')