import csv
import re


def clean_text(text: str) -> list[str]:
    replacements = {
        '\xa0': ' ',
        'â€™': "'",
        'â€“': '-',
        'â€”': '-',
        'â€œ': '"',
        'â€': '"',
        'â€˜': "'",
        'ï¬': 'fi',
        'ï¬': 'fl',
        'ï¬': 'ffi',
        'ï¬': 'ffl',
        'ï¬‚': 'fl',
        'ï¬€': 'ff',
        'ﬁ': 'fi',
        'ﬂ': 'fl',
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    lines = text.replace('\r', '\n').split('\n')
    cleaned = []
    for line in lines:
        line = re.sub(r'([a-z])([A-Z])', r'\1 \2', line)
        line = re.sub(r'\s+', ' ', line).strip()
        if line:
            cleaned.append(line)
    return cleaned


def is_title_line(line: str) -> bool:
    if not line:
        return False
    if line.endswith('.'):
        return False
    if line.startswith('Rules Glossary') or line.startswith('Glossary Conventions'):
        return False
    if line.startswith('Rules Definitions'):
        return False
    if line.startswith('Here are definitions'):
        return False
    if line[0].islower():
        return False
    if len(line) > 60:
        return False
    if ':' in line:
        return False
    if ',' in line:
        return False
    if line.isupper():
        return False
    # Allow brackets in tags like "Attack [Action]"
    return bool(re.match(r'^[A-Z0-9][A-Za-z0-9\s\-\[\]\'\",/]+$', line))


def parse_glossary(lines: list[str]) -> list[dict]:
    entries = []
    current_title = None
    current_desc = []

    for i, line in enumerate(lines):
        if is_title_line(line):
            # Check if this is a new title and the next line isn't another title
            next_line = lines[i + 1] if i + 1 < len(lines) else ''
            if current_title:
                description = ' '.join(current_desc).strip()
                if description:
                    entries.append({'term': current_title, 'definition': description})
            current_title = line
            current_desc = []
            if is_title_line(next_line):
                # Likely a list item with no definition; keep title but allow overwrite
                continue
            continue

        if current_title:
            current_desc.append(line)

    if current_title:
        description = ' '.join(current_desc).strip()
        if description:
            entries.append({'term': current_title, 'definition': description})

    return entries


def main():
    with open('PHB 2024/Chapter 11_raw.txt', 'r', encoding='utf-8', errors='ignore') as f:
        raw = f.read()

    lines = clean_text(raw)

    # Start parsing after Rules Definitions line
    start_idx = 0
    for i, line in enumerate(lines):
        if 'Rules Definitions' in line or 'Rules De' in line:
            start_idx = i + 1
            break

    glossary_lines = lines[start_idx:]

    entries = parse_glossary(glossary_lines)

    with open('data_sets/D&D/rules_glossary.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['term', 'definition'])
        writer.writeheader()
        writer.writerows(entries)

    print(f"Glossary entries parsed: {len(entries)}")


if __name__ == '__main__':
    main()
