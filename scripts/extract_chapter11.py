import PyPDF2


def extract_chapter11():
    with open('PHB 2024/Chapter 11.pdf', 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        print(f"Number of pages: {len(reader.pages)}")
        text = ''
        for i, page in enumerate(reader.pages):
            print(f"Extracting page {i+1}")
            page_text = page.extract_text()
            print(f"Page {i+1} text length: {len(page_text)}")
            text += page_text + '\n---PAGE BREAK---\n'

    with open('PHB 2024/Chapter 11_raw.txt', 'w', encoding='utf-8') as f:
        f.write(text)


if __name__ == "__main__":
    extract_chapter11()
