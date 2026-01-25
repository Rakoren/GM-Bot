import csv
import re


def clean_text(text: str) -> str:
    replacements = {
        '\xa0': ' ',
        'â€™': "'",
        'â€“': '-',
        'â€”': '-',
        'ï¬‚': 'fl',
        'ï¬€': 'ff',
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    lines = text.replace('\r', '\n').split('\n')
    cleaned = []
    for line in lines:
        if 'ARTIST:' in line:
            line = line.split('ARTIST:', 1)[0]
        line = re.sub(r'\s+', ' ', line).strip()
        cleaned.append(line)
    return cleaned


def is_creature_header(line: str) -> bool:
    if not line:
        return False
    if line.startswith('APPENDIX') or line.startswith('Appendix'):
        return False
    return bool(re.match(r'^[A-Z][A-Z\s\-’\']+$', line))


def parse_blocks(lines):
    blocks = []
    current = None
    i = 0
    while i < len(lines):
        line = lines[i]
        if is_creature_header(line):
            # Only treat as creature header if next non-empty line starts with AC
            j = i + 1
            while j < len(lines) and not lines[j]:
                j += 1
            if j < len(lines) and lines[j].startswith('AC '):
                if current:
                    blocks.append(current)
                current = {'name_raw': line, 'lines': []}
                i += 1
                continue
        if current:
            current['lines'].append(line)
        i += 1
    if current:
        blocks.append(current)
    return blocks


def parse_creature(block):
    name = block['name_raw'].title().replace('’', "'")
    lines = block['lines']

    ac = initiative = hp = speed = ''
    abilities = {}
    skills = senses = languages = cr = ''
    traits = []
    actions = []
    bonus_actions = []
    reactions = []

    section = 'traits'

    for line in lines:
        if not line:
            continue
        if line.startswith('MOD'):
            continue
        if line.startswith('AC '):
            ac = line.replace('AC', '').strip()
            init_match = re.search(r'Initiativ\s*e\s+([\+\-]?\d+\s*\(.*?\))', line)
            if init_match:
                initiative = init_match.group(1).strip()
            ac = re.sub(r'Initiativ\s*e\s+.*', '', ac).strip()
            continue
        if line.startswith('HP '):
            hp = line.replace('HP', '').strip()
            continue
        if line.startswith('Speed '):
            speed = line.replace('Speed', '').strip()
            continue
        if line.startswith('STR ') or line.startswith('DEX ') or line.startswith('CON ') or line.startswith('INT ') or line.startswith('WIS ') or line.startswith('CHA '):
            parts = line.split()
            if len(parts) >= 2:
                stat = parts[0]
                score = parts[1]
                abilities[stat] = score
            continue
        if line.startswith('Skills '):
            skills = line.replace('Skills', '').strip()
            continue
        if line.startswith('Senses '):
            senses = line.replace('Senses', '').strip()
            continue
        if line.startswith('Languages '):
            languages = line.replace('Languages', '').strip()
            continue
        if line.startswith('CR '):
            cr = line.replace('CR', '').strip()
            continue
        if line == 'Actions':
            section = 'actions'
            continue
        if line == 'Bonus Actions':
            section = 'bonus_actions'
            continue
        if line == 'Reactions':
            section = 'reactions'
            continue
        if section == 'traits':
            traits.append(line)
        elif section == 'actions':
            actions.append(line)
        elif section == 'bonus_actions':
            bonus_actions.append(line)
        elif section == 'reactions':
            reactions.append(line)

    abilities_str = ', '.join([f"{k} {v}" for k, v in abilities.items()])

    traits_str = ' '.join(traits).strip()
    actions_str = ' '.join(actions).strip()
    bonus_actions_str = ' '.join(bonus_actions).strip()
    reactions_str = ' '.join(reactions).strip()

    size = creature_type = alignment = ''
    creature_types = (
        'Aberration|Beast|Celestial|Construct|Dragon|Elemental|Fey|Fiend|Giant|'
        'Humanoid|Monstrosity|Ooze|Plant|Undead'
    )
    size_match = re.search(
        rf'(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+({creature_types})\s*,\s+([A-Za-z\s]+)',
        ' '.join(lines)
    )
    if size_match:
        size = size_match.group(1).strip()
        creature_type = size_match.group(2).strip()
        alignment = size_match.group(3).strip()
        alignment = re.sub(r'\s+[A-Z]{2,}(?:\s+[A-Z]{2,})*$', '', alignment).strip()
        size_line = size_match.group(0)
        traits_str = traits_str.replace(size_line, '').strip()
        actions_str = actions_str.replace(size_line, '').strip()

    if 'Senses' in skills:
        parts = skills.split('Senses', 1)
        skills = parts[0].strip()
        senses = (parts[1].strip() + (' ' + senses if senses else '')).strip()
    if 'Languages' in skills:
        parts = skills.split('Languages', 1)
        skills = parts[0].strip()
        languages = (parts[1].strip() + (' ' + languages if languages else '')).strip()
    if 'Languages' in senses:
        parts = senses.split('Languages', 1)
        senses = parts[0].strip()
        languages = (parts[1].strip() + (' ' + languages if languages else '')).strip()
    if 'CR ' in languages:
        parts = languages.split('CR ', 1)
        languages = parts[0].strip()
        cr = ('CR ' + parts[1].strip()).strip()

    return {
        'name': name,
        'size': size,
        'type': creature_type,
        'alignment': alignment,
        'ac': ac,
        'initiative': initiative,
        'hp': hp,
        'speed': speed,
        'abilities': abilities_str,
        'skills': skills,
        'senses': senses,
        'languages': languages,
        'cr': cr,
        'traits': traits_str,
        'actions': actions_str,
        'bonus_actions': bonus_actions_str,
        'reactions': reactions_str,
    }


def main():
    with open('PHB 2024/Chapter 10_raw.txt', 'r', encoding='utf-8', errors='ignore') as f:
        raw = f.read()

    lines = clean_text(raw)
    # Trim to Appendix B content
    if 'Appendix B: Creature Stat Blocks' in raw:
        start_idx = next((i for i, l in enumerate(lines) if 'Appendix B: Creature Stat Blocks' in l), 0)
        lines = lines[start_idx:]
    if '---PAGE BREAK---' in lines:
        lines = lines[:lines.index('---PAGE BREAK---')]

    blocks = parse_blocks(lines)
    creatures = [parse_creature(b) for b in blocks]

    with open('data_sets/D&D/creature_stat_blocks.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(
            f,
            fieldnames=['name','size','type','alignment','ac','initiative','hp','speed','abilities','skills','senses','languages','cr','traits','actions','bonus_actions','reactions']
        )
        writer.writeheader()
        writer.writerows(creatures)

    print(f"Creatures parsed: {len(creatures)}")


if __name__ == '__main__':
    main()
