from pathlib import Path
text = Path('admin/public/wizard.js').read_text()
lines = text.splitlines()
for i, line in enumerate(lines, 1):
    if 'parseGoldCost' in line or 'showMessage' in line:
        print(i, repr(line))
