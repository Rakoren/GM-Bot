import csv
import re

def clean_text(text):
    if not text:
        return text
    # Fix common OCR errors
    replacements = {
        'f eats': 'feats',
        'y ou': 'you',
        'y our': 'your',
        'ar e': 'are',
        't o': 'to',
        'ha ve': 'have',
        'Le vel': 'Level',
        'incr ease': 'increase',
        'Incr ease': 'Increase',
        'pr erequisite': 'prerequisite',
        'Pr erequisite': 'Prerequisite',
        'mor e': 'more',
        'tak e': 'take',
        'f eat': 'feat',
        'F eat': 'Feat',
        'abo ve': 'above',
        'alr eady': 'already',
        'pr oﬁciency': 'proficiency',
        'Pr oﬁciency': 'Proficiency',
        'r oll': 'roll',
        'r olls': 'rolls',
        'A ttack': 'Attack',
        'Char ge': 'Charge',
        'Impr oved': 'Improved',
        'Charisma': 'Charisma',
        'Str ength': 'Strength',
        'Dexterity': 'Dexterity',
        'Constitution': 'Constitution',
        'Wisdom': 'Wisdom',
        'Intelligence': 'Intelligence',
        'Cr ossbow': 'Crossbow',
        'Hea vy': 'Heavy',
        'Light': 'Light',
        'Disadv antage': 'Disadvantage',
        'Adv antage': 'Advantage',
        'Bludgeoning': 'Bludgeoning',
        'Slashing': 'Slashing',
        'Pier cing': 'Piercing',
        'Finesse': 'Finesse',
        'Weapon': 'Weapon',
        'Armor': 'Armor',
        'Class': 'Class',
        'Reaction': 'Reaction',
        'Bonus': 'Bonus',
        'Action': 'Action',
        'Short': 'Short',
        'Long': 'Long',
        'Rest': 'Rest',
        'Hit': 'Hit',
        'Points': 'Points',
        'Dice': 'Dice',
        'Temporary': 'Temporary',
        'Unarmed': 'Unarmed',
        'Strike': 'Strike',
        'Damage': 'Damage',
        'Critical': 'Critical',
        'can ’t': "can't",
        'don ’t': "don't",
        'doesn ’t': "doesn't",
        'isn ’t': "isn't",
        'aren ’t': "aren't",
        'wasn ’t': "wasn't",
        'weren ’t': "weren't",
        'hasn ’t': "hasn't",
        'haven ’t': "haven't",
        'hadn ’t': "hadn't",
        'won ’t': "won't",
        'wouldn ’t': "wouldn't",
        'couldn ’t': "couldn't",
        'shouldn ’t': "shouldn't",
        'mustn ’t': "mustn't",
        'let ’s': "let's",
        'i ’m': "I'm",
        'you ’re': "you're",
        'we ’re': "we're",
        'they ’re': "they're",
        'it ’s': "it's",
        'that ’s': "that's",
        'there ’s': "there's",
        'here ’s': "here's",
        'what ’s': "what's",
        'who ’s': "who's",
        'how ’s': "how's",
        'when ’s': "when's",
        'where ’s': "where's",
        'why ’s': "why's",
        'Scor e': 'Score',
        'Impr ovement': 'Improvement',
        'Gener al': 'General',
        'Char ger': 'Charger',
        'Exper t': 'Expert',
        'Crusher': 'Crusher',
        'Defensiv e': 'Defensive',
        'Duelist': 'Duelist',
        'Athlete': 'Athlete',
        'Chef': 'Chef',
        'Crossbow': 'Crossbow',
        'Piercer': 'Piercer',
        'Poisoner': 'Poisoner',
        'Polearm': 'Polearm',
        'Resilient': 'Resilient',
        'Ritual': 'Ritual',
        'Caster': 'Caster',
        'Sentinel': 'Sentinel',
        'Shadow': 'Shadow',
        'T ouched': 'Touched',
        'Sharpshooter': 'Sharpshooter',
        'Shield': 'Shield',
        'Master': 'Master',
        'Sk ullker': 'Skulker',
        'Slasher': 'Slasher',
        'Speedy': 'Speedy',
        'Spell': 'Spell',
        'Sniper': 'Sniper',
        'Telekinetic': 'Telekinetic',
        'Telepathic': 'Telepathic',
        'War': 'War',
        'Caster': 'Caster',
        'Weapon': 'Weapon',
        'Master': 'Master',
        'Fey': 'Fey',
        'T ouched': 'Touched',
        'Grappler': 'Grappler',
        'Great': 'Great',
        'W eapon': 'Weapon',
        'Master': 'Master',
        'Heavily': 'Heavily',
        'Armor ed': 'Armored',
        'Heavy': 'Heavy',
        'Armor': 'Armor',
        'Master': 'Master',
        'Inspiring': 'Inspiring',
        'Leader': 'Leader',
        'Keen': 'Keen',
        'Mind': 'Mind',
        'Lightly': 'Lightly',
        'Armor ed': 'Armored',
        'Mage': 'Mage',
        'Sla yer': 'Slayer',
        'Martial': 'Martial',
        'W eapon': 'Weapon',
        'Training': 'Training',
        'Medium': 'Medium',
        'Armor': 'Armor',
        'Master': 'Master',
        'Moder ately': 'Moderately',
        'Armor ed': 'Armored',
        'Mounted': 'Mounted',
        'Combatant': 'Combatant',
        'Obser vant': 'Observant',
        'Dual': 'Dual',
        'Wielder': 'Wielder',
        'Durable': 'Durable',
        'Elemental': 'Elemental',
        'Adept': 'Adept',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    # Remove " General Feat" 
    text = text.replace(' General Feat', '')
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def clean_feat_id(feat_id):
    # Clean OCR in feat_id
    replacements = {
        'SCOR_E': 'SCORE',
        'IMPR_OVEMENT': 'IMPROVEMENT',
        'GENER_AL': 'GENERAL',
        'CHAR_GER': 'CHARGER',
        'EXPER_T': 'EXPERT',
        'DEFENSIV_E': 'DEFENSIVE',
        'DUELIST': 'DUELIST',
        'W_EAPON': 'WEAPON',
        'ARMOR_ED': 'ARMORED',
        'MODER_ATELY': 'MODERATELY',
        'OBSER_VANT': 'OBSERVANT',
        'DUAL': 'DUAL',
        'WIELDER': 'WIELDER',
        'ELEMENTAL': 'ELEMENTAL',
        'ADEPT': 'ADEPT',
        'FEY': 'FEY',
        'T_OUCHED': 'TOUCHED',
        'GREAT': 'GREAT',
        'MASTER': 'MASTER',
        'HEAVILY': 'HEAVILY',
        'HEAVY': 'HEAVY',
        'ARMOR': 'ARMOR',
        'INSPIRING': 'INSPIRING',
        'LEADER': 'LEADER',
        'KEEN': 'KEEN',
        'MIND': 'MIND',
        'LIGHTLY': 'LIGHTLY',
        'MAGE': 'MAGE',
        'SLA_YER': 'SLAYER',
        'MARTIAL': 'MARTIAL',
        'TRAINING': 'TRAINING',
        'MEDIUM': 'MEDIUM',
        'MOUNTED': 'MOUNTED',
        'COMBATANT': 'COMBATANT',
        'PIERCER': 'PIERCER',
        'POISONER': 'POISONER',
        'POLEARM': 'POLEARM',
        'RESILIENT': 'RESILIENT',
        'RITUAL': 'RITUAL',
        'CASTER': 'CASTER',
        'SENTINEL': 'SENTINEL',
        'SHADOW': 'SHADOW',
        'SHARPSHOOTER': 'SHARPSHOOTER',
        'SHIELD': 'SHIELD',
        'SK_ULLKER': 'SKULKER',
        'SLASHER': 'SLASHER',
        'SPEEDY': 'SPEEDY',
        'SPELL': 'SPELL',
        'SNIPER': 'SNIPER',
        'TELEKINETIC': 'TELEKINETIC',
        'TELEPATHIC': 'TELEPATHIC',
        'WAR': 'WAR',
        'CASTER': 'CASTER',
        'WEAPON': 'WEAPON',
        'MASTER': 'MASTER',
    }
    for old, new in replacements.items():
        feat_id = feat_id.replace(old, new)
    return feat_id

def clean_name(name):
    # First apply replacements
    replacements = {
        'Scor e': 'Score',
        'Impr ovement': 'Improvement',
        'Gener al': 'General',
        'Char ger': 'Charger',
        'Exper t': 'Expert',
        'Defensiv e': 'Defensive',
        'Duelist': 'Duelist',
        'W eapon': 'Weapon',
        'Armor ed': 'Armored',
        'Moder ately': 'Moderately',
        'Obser vant': 'Observant',
        'Dual': 'Dual',
        'Wielder': 'Wielder',
        'Elemental': 'Elemental',
        'Adept': 'Adept',
        'Fey': 'Fey',
        'T ouched': 'Touched',
        'Great': 'Great',
        'Master': 'Master',
        'Heavily': 'Heavily',
        'Heavy': 'Heavy',
        'Armor': 'Armor',
        'Inspiring': 'Inspiring',
        'Leader': 'Leader',
        'Keen': 'Keen',
        'Mind': 'Mind',
        'Lightly': 'Lightly',
        'Mage': 'Mage',
        'Sla yer': 'Slayer',
        'Martial': 'Martial',
        'Training': 'Training',
        'Medium': 'Medium',
        'Mounted': 'Mounted',
        'Combatant': 'Combatant',
        'Piercer': 'Piercer',
        'Poisoner': 'Poisoner',
        'Polearm': 'Polearm',
        'Resilient': 'Resilient',
        'Ritual': 'Ritual',
        'Caster': 'Caster',
        'Sentinel': 'Sentinel',
        'Shadow': 'Shadow',
        'Sharpshooter': 'Sharpshooter',
        'Shield': 'Shield',
        'Sk ullker': 'Skulker',
        'Slasher': 'Slasher',
        'Speedy': 'Speedy',
        'Spell': 'Spell',
        'Sniper': 'Sniper',
        'Telekinetic': 'Telekinetic',
        'Telepathic': 'Telepathic',
        'War': 'War',
        'Caster': 'Caster',
        'Weapon': 'Weapon',
        'Master': 'Master',
    }
    for old, new in replacements.items():
        name = name.replace(old, new)
    # Remove extra spaces, capitalize words
    name = re.sub(r'\s+', ' ', name).strip()
    # Remove " General Feat" or "General Feat" from name
    name = re.sub(r'\s*General\s*Feat\s*$', '', name, flags=re.IGNORECASE)
    # Remove "General", "Origin", etc. from end if still there
    name = re.sub(r'\s+(General|Origin|Fighting Style|Epic Boon)$', '', name, flags=re.IGNORECASE)
    return name.title()

def is_valid_feat(row):
    name = row['name']
    # Invalid if name contains certain phrases or is too long/short
    if 'feat list' in name.lower() or 'descriptions parts' in name.lower() or 'f eats' in name.lower() or len(name) > 50 or len(name) < 3:
        return False
    # Check if it's a real feat name
    invalid_starts = ['All the', 'Feat List', 'Descriptions Parts', 'F eats']
    if any(name.startswith(start) for start in invalid_starts):
        return False
    return True

def parse_prereq_and_level(desc):
    prereq = ''
    level = ''
    # Look for (Prerequisite: ...)
    match = re.search(r'\(Prerequisite:\s*(.*?)\)', desc, re.IGNORECASE)
    if match:
        prereq_text = match.group(1)
        prereq = prereq_text
        # Extract level if present
        level_match = re.search(r'Level (\d+)', prereq_text, re.IGNORECASE)
        if level_match:
            level = level_match.group(1)
    return prereq, level

def main():
    input_file = 'data_sets/D&D/feats.csv'
    output_file = 'data_sets/D&D/feats_cleaned.csv'
    
    with open(input_file, 'r', newline='', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        rows = list(reader)
    
    cleaned_rows = []
    for row in rows:
        if not is_valid_feat(row):
            continue
        # Clean feat_id
        if row['feat_id']:
            row['feat_id'] = clean_feat_id(row['feat_id'])
        # Clean fields
        row['name'] = clean_name(row['name'])
        row['description'] = clean_text(row['description'])
        row['benefit_summary'] = clean_text(row['benefit_summary'])
        # Parse prereq and level
        prereq, level = parse_prereq_and_level(row['description'])
        if prereq:
            row['prerequisites'] = prereq
        if level:
            row['level_requirement'] = level
        # Clean type
        row['type'] = clean_text(row['type']).title()
        cleaned_rows.append(row)
    
    # Write back
    fieldnames = reader.fieldnames
    with open(output_file, 'w', newline='', encoding='utf-8') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(cleaned_rows)
    
    print(f"Cleaned {len(cleaned_rows)} feats. Saved to {output_file}")

if __name__ == '__main__':
    main()