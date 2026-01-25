import csv
import re


def ordinal_level(num_str: str) -> str:
    try:
        n = int(num_str)
    except ValueError:
        return num_str
    if 10 <= n % 100 <= 20:
        suffix = 'th'
    else:
        suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')
    return f"{n}{suffix}"


def clean_line(line: str) -> str:
    return line.replace('\xa0', ' ').strip()


def normalize_name(name: str) -> str:
    name = name.replace('ﬁ', 'fi').replace('ﬂ', 'fl').replace('’', "'")
    return re.sub(r'[^a-z]', '', name.lower())


def is_level_line(line: str) -> bool:
    if re.match(r'^[A-Za-z ]+\s+Cantrip\b', line):
        return True
    if re.match(r'^Level\s+\d+\s+[A-Za-z ]+\b', line):
        return True
    return False


def parse_spells_from_chapter8(text: str, canonical_names: dict):
    lines = [clean_line(l) for l in text.split('\n')]
    # Start at the first spell list marker if present
    start_idx = 0
    for i, line in enumerate(lines):
        if line.startswith('Spells ('):
            start_idx = i + 1
            break

    spells = []
    i = start_idx
    field_prefixes = ('Casting Time:', 'Range:', 'Range/Area:', 'Components:', 'Duration:')

    while i < len(lines):
        line = lines[i]
        if not line or line.startswith('Spells ('):
            i += 1
            continue

        # Spell name candidates have no colon and are followed by a line with Level/Cantrip
        if ':' not in line:
            raw_name = line
            next_line = lines[i + 1] if i + 1 < len(lines) else ''
            if is_level_line(next_line):
                # Parse level/school line
                level = ''
                school = ''
                if 'Cantrip' in next_line:
                    # Example: "Evocation Cantrip (Sorcerer, Wizard)"
                    pre = next_line.split('Cantrip')[0].strip()
                    school = re.sub(r'\s+', '', pre)
                    level = 'Cantrip'
                elif next_line.startswith('Level '):
                    # Example: "Level 2 Abjuration (Bard, Cleric)"
                    m = re.match(r'Level\s+(\d+)\s+([A-Za-z ]+)', next_line)
                    if m:
                        level = ordinal_level(m.group(1))
                        school = re.sub(r'\s+', '', m.group(2))
                i += 2

                casting_time = ''
                range_ = ''
                components = ''
                duration = ''

                # Read the standard fields if present
                while i < len(lines):
                    l = lines[i]
                    if not l:
                        i += 1
                        continue
                    if any(l.startswith(prefix) for prefix in field_prefixes):
                        if l.startswith('Casting Time:'):
                            casting_time = l.replace('Casting Time:', '').strip()
                        elif l.startswith('Range:'):
                            range_ = l.replace('Range:', '').strip()
                        elif l.startswith('Range/Area:'):
                            range_ = l.replace('Range/Area:', '').strip()
                        elif l.startswith('Components:'):
                            components = l.replace('Components:', '').strip()
                        elif l.startswith('Duration:'):
                            duration = l.replace('Duration:', '').strip()
                        i += 1
                        continue
                    break

                # Description until next spell name marker
                desc_parts = []
                while i < len(lines):
                    l = lines[i]
                    if not l:
                        i += 1
                        continue
                    # Next spell detection: line without colon and followed by Level/Cantrip line
                    if ':' not in l:
                        lookahead = lines[i + 1] if i + 1 < len(lines) else ''
                        if 'Cantrip' in lookahead or lookahead.startswith('Level '):
                            break
                    if not l.startswith(field_prefixes):
                        desc_parts.append(l)
                    i += 1

                description = re.sub(r'\s+', ' ', ' '.join(desc_parts)).strip()

                normalized = normalize_name(raw_name)
                if normalized not in canonical_names:
                    continue
                name = canonical_names[normalized]

                spells.append({
                    'name': name,
                    'level': level,
                    'school': school,
                    'casting_time': casting_time,
                    'range': range_,
                    'components': components,
                    'duration': duration,
                    'description': description
                })
                continue

        i += 1

    return spells


def main():
    canonical_names = {}
    try:
        with open('data_sets/D&D/spells.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get('name', '').strip()
                if name:
                    canonical_names[normalize_name(name)] = name
    except FileNotFoundError:
        pass

    with open('PHB 2024/Chapter 8_raw.txt', 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()

    spells = parse_spells_from_chapter8(text, canonical_names)
    print(f"Parsed {len(spells)} spells from Chapter 8")

    with open('data_sets/D&D/spells_ch8.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(
            f,
            fieldnames=['name', 'level', 'school', 'casting_time', 'range', 'components', 'duration', 'description']
        )
        writer.writeheader()
        writer.writerows(spells)

    # Compare to existing spells.csv
    try:
        with open('data_sets/D&D/spells.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            existing_names = {row.get('name', '').strip() for row in reader if row.get('name')}
        new_names = {s['name'] for s in spells if s.get('name')}
        missing_in_existing = sorted(new_names - existing_names)
        missing_in_ch8 = sorted(existing_names - new_names)
        print(f"Missing in existing spells.csv: {len(missing_in_existing)}")
        if missing_in_existing:
            print("First 20 missing in existing:", missing_in_existing[:20])
        print(f"Missing in Chapter 8 parse: {len(missing_in_ch8)}")
        if missing_in_ch8:
            print("First 20 missing in Chapter 8:", missing_in_ch8[:20])
    except FileNotFoundError:
        pass


if __name__ == '__main__':
    main()
