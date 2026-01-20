import csv
import re

def clean_text(text):
    # Clean OCR artifacts
    text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces with single
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)  # Add space between lowercase and uppercase
    text = re.sub(r'(\d)([a-zA-Z])', r'\1 \2', text)  # Add space between number and letter
    text = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', text)  # Add space between letter and number
    return text

def parse_weapons(text):
    weapons = []
    # Find the Weapons section
    start = text.find("Weapons Name Damage Proper ties Master y Weight Cost")
    if start == -1:
        return weapons
    end = text.find("Weapon Proficiency", start)
    if end == -1:
        end = len(text)
    section = text[start:end]
    
    # Split on category headers
    categories = ["Simple Melee W eapons", "Simple Ranged W eapons", "Martial Melee W eapons", "Martial Ranged W eapons"]
    parts = re.split(r'(' + '|'.join(re.escape(cat) for cat in categories) + ')', section)
    
    current_category = ""
    for part in parts:
        part = part.strip()
        if part in categories:
            current_category = part
            continue
        if not part or "Weapons Name" in part:
            continue
        # Now part is the concatenated weapons for the category
        # Split on cost
        entries = re.split(r'(\d+ (?:SP|GP|CP))', part)
        # entries = [weapon_data, cost, weapon_data, cost, ...]
        for i in range(0, len(entries) - 1, 2):
            weapon_data = entries[i].strip()
            cost = entries[i+1].strip()
            if not weapon_data:
                continue
            # Parse weapon_data
            # Find damage
            damage_match = re.search(r'(\d+ d \d+ [A-Z][a-z]+)', weapon_data)
            if not damage_match:
                continue
            damage = damage_match.group(1).replace(' d ', 'd')
            name = weapon_data[:damage_match.start()].strip()
            rest = weapon_data[damage_match.end():]
            # Find weight
            weight_match = re.search(r'(\d+ lb\.|\d+/\d+ lb\.)', rest)
            if not weight_match:
                continue
            weight = weight_match.group(1)
            before_weight = rest[:weight_match.start()].strip()
            # Split before_weight into properties and mastery
            words = before_weight.split()
            if words:
                mastery = words[-1]
                properties = ' '.join(words[:-1])
            else:
                mastery = ''
                properties = ''
            
            weapons.append({
                'name': name,
                'damage': damage,
                'properties': properties,
                'mastery': mastery,
                'weight': weight,
                'cost': cost,
                'category': current_category
            })
    return weapons

def parse_armor(text):
    armor = []
    start = text.find("Armor Armor Armor Class (A C) Strength Stealth Weight Cost")
    if start == -1:
        return armor
    end = text.find("Shield (", start)
    if end == -1:
        end = text.find("Armor Training", start)
    if end == -1:
        end = len(text)
    section = text[start:end]
    
    # Split on category headers
    categories = ["Light Armor", "Medium Armor", "Heavy Armor"]
    parts = re.split(r'(' + '|'.join(re.escape(cat) for cat in categories) + ')', section)
    
    current_category = ""
    for part in parts:
        part = part.strip()
        if part in categories:
            current_category = part
            continue
        if not part or "Armor Armor" in part:
            continue
        # Remove the don/doff info
        part = re.sub(r'\([^)]*\)', '', part).strip()
        # Now part is concatenated armors for the category
        # Split on cost
        entries = re.split(r'(\d+ (?:GP|SP))', part)
        # entries = [armor_data, cost, armor_data, cost, ...]
        for i in range(0, len(entries) - 1, 2):
            armor_data = entries[i].strip()
            cost = entries[i+1].strip()
            if not armor_data:
                continue
            # Parse armor_data
            # Find weight
            weight_match = re.search(r'(\d+ lb\.)', armor_data)
            if not weight_match:
                continue
            weight = weight_match.group(1)
            before_weight = armor_data[:weight_match.start()].strip()
            # Check for Disadvantage
            if 'Disadv antage' in before_weight:
                stealth = 'Disadvantage'
                before_weight = before_weight.replace('Disadv antage', '').strip()
            else:
                stealth = ''
            # Now before_weight is name + ac
            # Find the number for AC
            ac_match = re.search(r'(\d+ \+ .+?)', before_weight)
            if ac_match:
                ac = ac_match.group(1)
                name = before_weight[:ac_match.start()].strip()
            else:
                continue
            
            armor.append({
                'name': name,
                'ac': ac,
                'strength': '',
                'stealth': stealth,
                'weight': weight,
                'cost': cost,
                'category': current_category
            })
    return armor

def parse_tools(text):
    tools = []
    start = text.find("Artisan s Tools")
    if start == -1:
        return tools
    end = text.find("Other Tools", start)
    if end == -1:
        end = text.find("Adventuring Gear", start)
    if end == -1:
        end = len(text)
    section = text[start:end]
    
    # Split on tool entries, each starting with name (cost)
    tool_entries = re.split(r'(([A-Z][a-z]+(?: [a-z]+ [A-Z][a-z]+)*) \(\d+ [A-Z]{2}\))', section)
    for i in range(1, len(tool_entries), 3):  # 1: full name(cost), 2: name, 3: data
        name_cost = tool_entries[i].strip()
        data = tool_entries[i+2].strip() if i+2 < len(tool_entries) else ''
        # Parse name and cost
        match_nc = re.match(r'(.+?)\s*\((.+?)\)', name_cost)
        if not match_nc:
            continue
        name = match_nc.group(1).strip()
        cost = match_nc.group(2).strip()
        # Parse data: Ability: ... Weight: ... Utilize: ... Craft: ...
        ability_match = re.search(r'Ability:\s*(.+?)\s*Weight:', data)
        if not ability_match:
            continue
        ability = ability_match.group(1).strip()
        weight_match = re.search(r'Weight:\s*(.+?)\s*Utiliz', data)
        if not weight_match:
            continue
        weight = weight_match.group(1).strip()
        utilize_match = re.search(r'Utiliz[^:]*:\s*(.+?)\s*Craft:', data)
        if not utilize_match:
            continue
        utilize = utilize_match.group(1).strip()
        craft_match = re.search(r'Craft:\s*(.+)', data)
        if not craft_match:
            continue
        craft = craft_match.group(1).strip()
        
        tools.append({
            'name': name,
            'cost': cost,
            'ability': ability,
            'weight': weight,
            'utilize': utilize,
            'craft': craft
        })
    return tools

def parse_adventuring_gear(text):
    gear = []
    start = text.find("Adventuring Gear Item Weight Cost")
    if start == -1:
        return gear
    end = text.find("Acid (25 GP)", start)
    if end == -1:
        end = len(text)
    section = text[start:end]
    
    # Remove header
    section = section.replace("Adventuring Gear Item Weight Cost", "").strip()
    # Split on cost
    entries = re.split(r'(\d+ (?:GP|SP|CP))', section)
    # entries = [gear_data, cost, gear_data, cost, ...]
    for i in range(0, len(entries) - 1, 2):
        gear_data = entries[i].strip()
        cost = entries[i+1].strip()
        if not gear_data:
            continue
        # Parse gear_data
        # Find weight
        weight_match = re.search(r'(\d+ lb\.|Varies)', gear_data)
        if not weight_match:
            continue
        weight = weight_match.group(1)
        name = gear_data[:weight_match.start()].strip()
        
        gear.append({
            'name': name,
            'weight': weight,
            'cost': cost
        })
    return gear

def main():
    with open('PHB 2024/Chapter 6.txt', 'r', encoding='utf-8') as f:
        text = f.read()
    
    text = clean_text(text)
    
    weapons = parse_weapons(text)
    armor = parse_armor(text)
    tools = parse_tools(text)
    gear = parse_adventuring_gear(text)
    
    # Write CSVs
    with open('data_sets/D&D/weapons.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'damage', 'properties', 'mastery', 'weight', 'cost', 'category'])
        writer.writeheader()
        writer.writerows(weapons)
    
    with open('data_sets/D&D/armor.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'ac', 'strength', 'stealth', 'weight', 'cost', 'category'])
        writer.writeheader()
        writer.writerows(armor)
    
    with open('data_sets/D&D/tools.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'cost', 'ability', 'weight', 'utilize', 'craft'])
        writer.writeheader()
        writer.writerows(tools)
    
    with open('data_sets/D&D/adventuring_gear.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'weight', 'cost'])
        writer.writeheader()
        writer.writerows(gear)

if __name__ == "__main__":
    main()