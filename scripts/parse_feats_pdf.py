import re
import csv
from pathlib import Path

base = Path(__file__).resolve().parents[1]
pdf_path = next((base / 'PHB 2024').glob('Feats - *.pdf'))
raw_path = base / 'PHB 2024' / 'Feats_raw.txt'
out_path = base / 'data_sets' / 'D&D' / 'feats.csv'

CATEGORY_PATTERN = re.compile(r'^(Origin|General|Fighting Style|Epic Boon) Feat(?: \(Prerequisite: (.+)\))?$')
SECTION_HEADERS = {
    'Origin Feats',
    'General Feats',
    'Fighting Style Feats',
    'Epic Boon Feats',
}


def extract_raw_text():
    import pdfplumber
    text = ''
    with pdfplumber.open(pdf_path) as pdf:
        text = '\n'.join((page.extract_text() or '') for page in pdf.pages)
    raw_path.write_text(text, encoding='utf-8')
    return text


def normalize_type(category):
    return category


def build_feat_id(name, feat_type):
    suffix = feat_type.upper().replace(' ', '_')
    fid = 'FEAT_' + re.sub(r'[^A-Za-z0-9]+', '_', name).upper() + '_' + suffix
    return fid


def find_start_index(lines):
    for i in range(len(lines) - 1):
        if lines[i] == 'Origin Feats' and 'Origin category' in lines[i + 1]:
            return i + 2
    return 0


def is_category_line(line):
    return CATEGORY_PATTERN.match(line or '')


def is_feat_header(lines, idx):
    if idx + 1 >= len(lines):
        return False
    if lines[idx] in SECTION_HEADERS:
        return False
    return bool(is_category_line(lines[idx + 1]))


def clean_lines(text):
    lines = [line.strip() for line in text.splitlines()]
    return [line for line in lines if line]


def parse_feats(text):
    lines = clean_lines(text)
    start = find_start_index(lines)
    feats = []
    idx = start
    while idx < len(lines) - 1:
        if not is_feat_header(lines, idx):
            idx += 1
            continue
        name = lines[idx]
        category_line = lines[idx + 1]
        match = CATEGORY_PATTERN.match(category_line)
        category = match.group(1)
        prereq = match.group(2) or ''
        body_lines = []
        idx += 2
        while idx < len(lines) and not is_feat_header(lines, idx):
            line = lines[idx]
            if line in SECTION_HEADERS:
                idx += 1
                continue
            if line.startswith('ARTIST:'):
                idx += 1
                continue
            if line.startswith('These feats are in the'):
                idx += 1
                continue
            body_lines.append(line)
            idx += 1
        body = ' '.join(body_lines).strip()
        desc = f"{name}{f' (Prerequisite: {prereq})' if prereq else ''} {body}".strip()
        benefit_summary = desc[:200].strip()
        level_requirement = ''
        level_match = re.search(r'Level\s*(\d+)', prereq)
        if level_match:
            level_requirement = level_match.group(1)
        feat_type = normalize_type(category)
        feats.append({
            'feat_id': build_feat_id(name, feat_type),
            'name': name,
            'prerequisites': prereq,
            'type': feat_type,
            'level_requirement': level_requirement,
            'benefit_summary': benefit_summary,
            'description': desc,
            'tags': '',
            'source': 'PHB (2024)',
            'version': '2024',
        })
    return feats


if __name__ == '__main__':
    if raw_path.exists():
        raw_text = raw_path.read_text(encoding='utf-8')
    else:
        raw_text = extract_raw_text()

    feats = parse_feats(raw_text)
    if not feats:
        raise SystemExit('No feats parsed. Check the PDF text extraction.')

    fieldnames = [
        'feat_id',
        'name',
        'prerequisites',
        'type',
        'level_requirement',
        'benefit_summary',
        'description',
        'tags',
        'source',
        'version',
    ]
    with out_path.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in feats:
            writer.writerow(row)

    print(f'Wrote {out_path} with {len(feats)} feats')
