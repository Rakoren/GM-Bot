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
    cleaned = [re.sub(r'\s+', ' ', line).strip() for line in lines]
    return '\n'.join(cleaned).strip()


def normalize_header(line: str) -> str:
    return re.sub(r'\s+', '', line).lower()


def fix_alignment_words(text: str) -> str:
    fixes = {
        'Law ful': 'Lawful',
        'Cha otic': 'Chaotic',
        'Neutr al': 'Neutral',
        'E vil': 'Evil',
        'G ood': 'Good',
    }
    for k, v in fixes.items():
        text = text.replace(k, v)
    return text


def fix_plane_name(name: str) -> str:
    fixes = {
        'Acher on': 'Acheron',
        'Arbor ea': 'Arborea',
        'Ysgar d': 'Ysgard',
        'Astr al Plane': 'Astral Plane',
        'Ether eal Plane': 'Ethereal Plane',
        'Shadowf ell': 'Shadowfell',
        'Elemental Plane of Ear th': 'Elemental Plane of Earth',
        'Elemental Plane of Fir e': 'Elemental Plane of Fire',
        'Elemental Plane of W ater': 'Elemental Plane of Water',
    }
    return fixes.get(name, name)


def main():
    with open('PHB 2024/Chapter 9_raw.txt', 'r', encoding='utf-8', errors='ignore') as f:
        raw = f.read()

    text = clean_text(raw)
    # Trim before Appendix A and after page break
    if 'Appendix A: The Multiverse' in text:
        text = text.split('Appendix A: The Multiverse', 1)[1]
    if '---PAGE BREAK---' in text:
        text = text.split('---PAGE BREAK---', 1)[0]

    planes = []
    outer_table = []
    current_section = None
    current = None
    in_table = False

    for raw_line in text.split('\n'):
        line = raw_line.strip()
        if not line:
            continue

        header_key = normalize_header(line)
        if header_key in {'thematerialrealms', 'materialrealms'}:
            if current:
                planes.append(current)
                current = None
            current_section = 'Material Realms'
            in_table = False
            continue
        if header_key in {'thetransitiveplanes', 'transitiveplanes'}:
            if current:
                planes.append(current)
                current = None
            current_section = 'Transitive Planes'
            in_table = False
            continue
        if header_key in {'theinnerplanes', 'innerplanes'}:
            if current:
                planes.append(current)
                current = None
            current_section = 'Inner Planes'
            in_table = False
            continue
        if header_key in {'theouterplanes', 'outerplanes'}:
            if current:
                planes.append(current)
                current = None
            current_section = 'Outer Planes'
            in_table = False
            continue
        if header_key == 'outerplanealignment':
            if current:
                planes.append(current)
                current = None
            in_table = True
            continue

        if in_table:
            if line.startswith('ARTIST:'):
                in_table = False
                continue
            line = fix_alignment_words(line)
            m = re.match(r'^(.*?)\s+(Lawful|Chaotic|Neutral)\s+(.+)$', line)
            if m:
                plane = fix_plane_name(m.group(1).strip())
                alignment = f"{m.group(2)} {m.group(3).strip()}"
                outer_table.append({'plane': plane, 'alignment': alignment})
                continue
            m = re.match(r'^(.*?)\s+(Lawful|Chaotic|Neutral)$', line)
            if m:
                plane = fix_plane_name(m.group(1).strip())
                alignment = m.group(2).strip()
                outer_table.append({'plane': plane, 'alignment': alignment})
            continue

        match = re.match(r'^([A-Z][A-Za-z\s\-’\']+?)\s*\.\s+(.*)$', line)
        if match and current_section:
            if current:
                planes.append(current)
            name = match.group(1).strip()
            name = fix_plane_name(name)
            if name == 'Other Outer Planes':
                current = None
                continue
            current = {
                'name': name,
                'category': current_section,
                'description': match.group(2).strip()
            }
        elif current and current_section:
            current['description'] += ' ' + line

    if current:
        planes.append(current)

    with open('data_sets/D&D/multiverse_planes.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'category', 'description'])
        writer.writeheader()
        writer.writerows(planes)

    with open('data_sets/D&D/outer_planes_alignments.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['plane', 'alignment'])
        writer.writeheader()
        writer.writerows(outer_table)

    print(f"Planes parsed: {len(planes)}")
    print(f"Outer plane alignments parsed: {len(outer_table)}")


if __name__ == '__main__':
    main()
