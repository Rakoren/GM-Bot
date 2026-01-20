import csv
import re

def clean_text(text):
    # Clean OCR artifacts
    text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces with single
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)  # Add space between lowercase and uppercase
    text = re.sub(r'(\d)([a-zA-Z])', r'\1 \2', text)  # Add space between number and letter
    text = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', text)  # Add space between letter and number
    return text

def parse_spells(text):
    spells = []
    lines = text.split('\n')
    print(f"Total lines: {len(lines)}")
    print(f"First 10 lines: {lines[:10]}")
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        # Look for level line
        if re.match(r'^(cantrip|\d+\s*(?:st|nd|rd|th))$', line, re.IGNORECASE):
            level = line
            i += 1
            if i >= len(lines):
                break
            name = lines[i].strip()
            i += 1
            if i >= len(lines):
                break
            school_components = lines[i].strip()
            # Parse school and components
            match = re.match(r'(.*?)\s+•\s+(.*)', school_components)
            if match:
                school = match.group(1)
                components = match.group(2)
            else:
                school = school_components
                components = ''
            i += 1
            if i >= len(lines):
                break
            casting_time = lines[i].strip()
            i += 1
            if i >= len(lines):
                break
            duration = lines[i].strip()
            i += 1
            if i >= len(lines):
                break
            range_ = lines[i].strip()
            i += 1
            if i >= len(lines):
                break
            damage_effect = lines[i].strip()
            i += 1
            # Now collect description until View Details Page
            description = ''
            while i < len(lines) and 'View Details Page' not in lines[i]:
                stripped = lines[i].strip()
                if stripped and not stripped.startswith('Level') and not stripped.startswith('Casting Time') and not stripped.startswith('Range/Area') and not stripped.startswith('Components') and not stripped.startswith('Duration') and not stripped.startswith('School') and not stripped.startswith('Attack/Save') and not stripped.startswith('Damage/Effect'):
                    description += stripped + ' '
                i += 1
            # Skip View Details Page
            if i < len(lines) and 'View Details Page' in lines[i]:
                i += 1
            
            # Clean description
            description = re.sub(r'Tags:.*', '', description, flags=re.DOTALL).strip()
            description = re.sub(r'Available For:.*', '', description, flags=re.DOTALL).strip()
            
            spells.append({
                'name': name,
                'level': level,
                'school': school,
                'casting_time': casting_time,
                'range': range_,
                'components': components,
                'duration': duration,
                'description': description
            })
            print(f"Added spell: {name}")
        else:
            i += 1
    return spells

def main():
    with open('data_sets/D&D/spell dump.txt', 'r', encoding='utf-8') as f:
        text = f.read()
    
    # text = clean_text(text)  # Remove this to keep newlines
    
    spells = parse_spells(text)
    
    print(f"Parsed {len(spells)} spells")
    
    # Write CSV
    with open('data_sets/D&D/spells.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'level', 'school', 'casting_time', 'range', 'components', 'duration', 'description'])
        writer.writeheader()
        writer.writerows(spells)

if __name__ == "__main__":
    main()