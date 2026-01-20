import csv
import re

def clean_name(name):
    name = re.sub(r'\b s \b', "'s ", name)
    name = re.sub(r'Scr oll', 'Scroll', name)
    name = re.sub(r'work ers', "workers", name)
    return name

def clean_utilize(utilize):
    utilize = re.sub(r'star t a r e', 'start a fire', utilize)
    utilize = re.sub(r'Utiliz e', 'Utilize', utilize)
    utilize = re.sub(r'ar ea', 'area', utilize)
    utilize = re.sub(r'giv e', 'give', utilize)
    utilize = re.sub(r'wear ers', 'wearers', utilize)
    utilize = re.sub(r'Acrobatics', 'Acrobatics', utilize)  # already
    utilize = re.sub(r'Impr ove', 'Improve', utilize)
    utilize = re.sub(r'a vor', 'flavor', utilize)
    utilize = re.sub(r'impr essiv e', 'impressive', utilize)
    utilize = re.sub(r'ourishes', 'flourishes', utilize)
    utilize = re.sub(r'guar d', 'guard', utilize)
    utilize = re.sub(r'for gery', 'forgery', utilize)
    utilize = re.sub(r'pr y', 'pry', utilize)
    return utilize

def clean_craft(craft):
    craft = re.sub(r'\b s \b', "'s ", craft)
    craft = re.sub(r'Fir e', 'Fire', craft)
    craft = re.sub(r' F ocus', " Focus", craft)
    craft = re.sub(r' P ouch', " Pouch", craft)
    craft = re.sub(r'Quar terstaff', "Quarterstaff", craft)
    craft = re.sub(r'Barr el', "Barrel", craft)
    craft = re.sub(r'Portable Ram', "Portable Ram", craft)
    craft = re.sub(r'Glass Bottle', "Glass Bottle", craft)
    craft = re.sub(r'Magnifying Glass', "Magnifying Glass", craft)
    craft = re.sub(r'work ers', "workers", craft)
    craft = re.sub(r'Leather work ers', "Leatherworkers", craft)
    # Remove trailing next tool name if present
    craft = re.sub(r' [A-Z][a-z]+ s Supplies.*', '', craft)
    craft = re.sub(r' [A-Z][a-z]+ s Tools.*', '', craft)
    craft = re.sub(r' Calligr apher.*', '', craft)
    return craft.strip()

def clean_csv(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    for row in rows:
        row['name'] = clean_name(row['name'])
        row['utilize'] = clean_utilize(row['utilize'])
        row['craft'] = clean_craft(row['craft'])
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=reader.fieldnames)
        writer.writeheader()
        writer.writerows(rows)

if __name__ == "__main__":
    clean_csv('data_sets/D&D/tools.csv')