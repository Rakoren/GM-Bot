from pathlib import Path
text = Path('admin/public/wizard.js').read_text()
print('Spent ${' in text)
