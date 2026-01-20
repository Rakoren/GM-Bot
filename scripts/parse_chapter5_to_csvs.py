import re
import csv
from pathlib import Path

base = Path(__file__).resolve().parents[1]
chapter = base / 'PHB 2024' / 'Chapter 5.txt'
out = base / 'data_sets' / 'D&D' / 'feats_new.csv'
text = chapter.read_text(encoding='utf-8')

# Normalize spaces (already done) but ensure newlines between feats by inserting marker after 'Feat (' occurrences
# Find all ' Feat' occurrences and split by a pattern that captures the feat name before ' Feat'
pattern = re.compile(r"([A-Z][A-Za-z' \-]+?) Feat(?![a-zA-Z])")
matches = list(pattern.finditer(text))

feats = []
for i,m in enumerate(matches):
    name = m.group(1).strip()
    start = m.start()
    end = matches[i+1].start() if i+1 < len(matches) else len(text)
    block = text[start:end].strip()
    # Extract prerequisite if present
    prereq_m = re.search(r'Prerequisit[e|es|es:]* ?:(.+?)(?:You gain|Benefit|You\ gain|Repeatable|$)', block)
    prereq = prereq_m.group(1).strip() if prereq_m else ''
    # Extract benefits summary (text after 'You gain the following benefits.' up to next capitalized heading)
    benefit = ''
    ben_m = re.search(r'You gain the following benefits\.|You gain the following benefits', block)
    if ben_m:
        bstart = ben_m.end()
        # stop at 'Repeatable.' or next sentence with two newlines or next '.' followed by Capitalized Word and 'Feat'
        bstop = re.search(r'(Repeatable\.|Repeatable|\n[A-Z][a-z]+\.|$)', block[bstart:])
        if bstop:
            benefit = block[bstart:bstart+bstop.start()].strip()
        else:
            benefit = block[bstart:].strip()
    # fallback: first 200 chars as summary
    if not benefit:
        benefit = block[:200].strip()
    desc = block
    feats.append({'name':name,'prerequisites':prereq,'benefit_summary':benefit,'description':desc})

# write CSV
with out.open('w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['name','prerequisites','benefit_summary','description','source','version'])
    writer.writeheader()
    for row in feats:
        row['source']='PHB (2024)'
        row['version']='2024'
        writer.writerow(row)

print('Wrote', out, 'with', len(feats), 'feats')
