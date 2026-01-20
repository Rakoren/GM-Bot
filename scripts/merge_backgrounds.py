import csv
import re
from pathlib import Path

base = Path(__file__).resolve().parents[1]
indir = base / 'data_sets' / 'D&D'
new_bg = indir / 'backgrounds_new.csv'
bg_csv = indir / 'backgrounds.csv'

# load existing names
existing = set()
rows = []
with bg_csv.open(encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for r in reader:
        existing.add(r['name'])
        rows.append(r)

added = []
with new_bg.open(encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for r in reader:
        name = r['background']
        raw = r['raw']
        if name in existing:
            continue
        # parse ability scores
        m_abil = re.search(r'^(.*?) Feat:', raw)
        ability = m_abil.group(1).strip() if m_abil else ''
        # feat
        m_feat = re.search(r'Feat: (.*?) Skill', raw)
        feat = m_feat.group(1).strip() if m_feat else ''
        # skills
        m_skill = re.search(r'Skill Pr oﬁciencies: (.*?) Tool Pr oﬁciency:', raw)
        skills = m_skill.group(1).strip() if m_skill else ''
        # tools
        m_tool = re.search(r'Tool Pr oﬁciency: (.*?) Equipment:', raw)
        tools = m_tool.group(1).strip() if m_tool else ''
        # equipment
        m_equip = re.search(r'Equipment: (.*)', raw)
        equip = m_equip.group(1).strip() if m_equip else ''
        bg_id = 'BG_' + name.upper()
        new_row = {
            'background_id': bg_id,
            'name': name,
            'ability_scores': ability,
            'skill_proficiencies': skills.replace(' and ', ', '),
            'tool_proficiencies': tools,
            'languages': '',
            'equipment': equip,
            'feat_granted': feat,
            'source': 'PHB (2024)',
            'version': '2024'
        }
        rows.append(new_row)
        added.append(name)

# write back CSV (preserve header order)
fieldnames = ['background_id','name','ability_scores','skill_proficiencies','tool_proficiencies','languages','equipment','feat_granted','source','version']
with bg_csv.open('w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for r in rows:
        writer.writerow(r)

print('Added backgrounds:', added)
