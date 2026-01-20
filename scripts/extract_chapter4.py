from pathlib import Path
from PyPDF2 import PdfReader
import re

pdf_path = Path(__file__).resolve().parents[1] / "PHB 2024" / "Chapter 4.pdf"
out_path = pdf_path.with_suffix('.txt')

reader = PdfReader(str(pdf_path))
text_parts = []
for p in reader.pages:
    try:
        txt = p.extract_text()
    except Exception:
        txt = None
    if txt:
        # replace non-printable/control chars with spaces
        cleaned = ''.join(ch if ord(ch) >= 32 else ' ' for ch in txt)
        # normalize whitespace
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        text_parts.append(cleaned)

all_text = "\n\n".join(text_parts)
out_path.write_text(all_text, encoding='utf-8')
print(f"Wrote text to: {out_path}")
