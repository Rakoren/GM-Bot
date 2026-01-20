import PyPDF2
import re

def extract_text_from_pdf(pdf_path, output_txt_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ''
        for page in reader.pages:
            text += page.extract_text() + '\n'

    # Clean up text: normalize whitespace, remove control chars
    text = re.sub(r'\s+', ' ', text)  # Replace multiple whitespace with single space
    text = re.sub(r'[^\x20-\x7E\n]', '', text)  # Remove non-printable chars except newline
    text = re.sub(r'\n+', '\n', text)  # Normalize newlines

    with open(output_txt_path, 'w', encoding='utf-8') as f:
        f.write(text)

    print(f"Wrote text to: {output_txt_path}")

if __name__ == '__main__':
    pdf_path = 'PHB 2024/Chapter 6.pdf'
    output_txt_path = 'PHB 2024/Chapter 6.txt'
    extract_text_from_pdf(pdf_path, output_txt_path)