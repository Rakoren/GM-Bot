import csv
import json
import pathlib
import re
from typing import List, Dict, Optional


ROOT = pathlib.Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / 'data_sets' / 'D&D' / 'classes.csv'
OUTPUT_PATH = ROOT / 'data_sets' / 'D&D' / 'classes_normalized.json'


def parse_gold_value(text: str) -> float:
    if not text:
        return 0.0
    match = re.search(r'\(B\)[^0-9]*(\d+)\s*gp', text, re.IGNORECASE)
    if match:
        return float(match.group(1))
    match = re.search(r'(\d+)\s*gp', text, re.IGNORECASE)
    if match:
        return float(match.group(1))
    return 0.0


def parse_items(segment: str) -> List[str]:
    cleaned = re.sub(r'choose[^:]+:', '', segment, flags=re.IGNORECASE)
    tokens = re.split(r',|\band\b|\bor\b', cleaned, flags=re.IGNORECASE)
    items = []
    for token in tokens:
        item = token.strip()
        if not item:
            continue
        if re.search(r'\d+\s*gp', item, re.IGNORECASE):
            continue
        items.append(item)
    return items


def parse_equipment_options(notes: str, source: str) -> List[Dict[str, Optional[str]]]:
    if not notes:
        return []
    segments = re.findall(r'\((A|B)\)\s*([^;]+)', notes, flags=re.IGNORECASE)
    choices = []
    for label, body in segments:
        items = parse_items(body)
        choices.append(
            {
                'option': label.upper(),
                'description': body.strip(),
                'items': items,
                'gold': parse_gold_value(body),
                'source': source,
            }
        )
    return choices


def _build_starting_equipment_notes(row: Dict[str, str]) -> str:
    option_a = (row.get('starting_equipment_a') or '').strip()
    option_b = (row.get('starting_equipment_b') or '').strip()
    option_c = (row.get('starting_equipment_c') or '').strip()
    parts = []
    if option_a:
        parts.append(f'(A) {option_a}')
    if option_b:
        parts.append(f'(B) {option_b}')
    if option_c:
        parts.append(f'(C) {option_c}')
    if not parts:
        return ''
    return 'Choose: ' + '; '.join(parts)


def _build_equipment_options_from_fields(row: Dict[str, str]) -> List[Dict[str, Optional[str]]]:
    options = []
    for label in ('A', 'B', 'C'):
        field = f'starting_equipment_{label.lower()}'
        raw = (row.get(field) or '').strip()
        if not raw:
            continue
        options.append(
            {
                'option': label,
                'description': raw,
                'items': parse_items(raw),
                'gold': parse_gold_value(raw),
                'source': 'class',
            }
        )
    return options


def normalize_row(row: Dict[str, str]) -> Dict[str, object]:
    starting_notes = (row.get('starting_equipment_notes') or '').strip()
    if not starting_notes:
        starting_notes = _build_starting_equipment_notes(row)
    normalized = {
        'class_id': row.get('class_id', '').strip(),
        'name': row.get('name', '').strip(),
        'primary_ability': row.get('primary_ability', '').strip(),
        'hit_die': row.get('hit_die', '').strip(),
        'armor_proficiencies': row.get('armor_proficiencies', '').strip(),
        'weapon_proficiencies': row.get('weapon_proficiencies', '').strip(),
        'tool_proficiencies': row.get('tool_proficiencies', '').strip(),
        'saving_throws': [save.strip() for save in row.get('saving_throws', '').split(',') if save.strip()],
        'skill_choices': row.get('skill_choices', '').strip(),
        'starting_equipment_notes': starting_notes,
        'spellcasting': row.get('spellcasting', '').strip(),
        'description': row.get('description', '').strip(),
        'core_traits': row.get('core_traits', '').strip(),
        'features_table': row.get('features_table', '').strip(),
        'class_features': row.get('class_features', '').strip(),
        'multiclassing': row.get('multiclassing', '').strip(),
        'subclasses': [sub.strip() for sub in row.get('subclasses', '').split(',') if sub.strip()],
        'source': row.get('source', '').strip(),
        'version': row.get('version', '').strip(),
    }
    normalized['option_b_gold'] = parse_gold_value(normalized['starting_equipment_notes'])
    options = _build_equipment_options_from_fields(row)
    if not options:
        options = parse_equipment_options(normalized['starting_equipment_notes'], 'class')
    normalized['equipment_options'] = options
    return normalized


def main() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f'Missing classes CSV at {CSV_PATH}')
    rows = []
    with CSV_PATH.open(newline='', encoding='utf-8-sig') as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(normalize_row(row))
    OUTPUT_PATH.write_text(json.dumps(rows, indent=2), encoding='utf-8')
    print(f'Normalized classes written to {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
