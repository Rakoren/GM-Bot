const fs = require('fs');
const path = require('path');
function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}
function clean(value) {
  return String(value || '').trim();
}
function loadCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map(clean);
  return lines.slice(1).map(line => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      row[header] = clean(cols[idx]);
    });
    return row;
  });
}
function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
}
const classes = loadCsv(path.join('data_sets', 'D&D', 'classes.csv'));
const arrays = loadCsv(path.join('data_sets', 'D&D', 'standard_array_by_class.csv'));
const standardArrayByClass = arrays.reduce((acc, row) => {
  const name = row.class;
  if (!name) return acc;
  acc[name] = {
    str: row.str,
    dex: row.dex,
    con: row.con,
    int: row.int,
    wis: row.wis,
    cha: row.cha,
  };
  return acc;
}, {});
const classIdByName = new Map(classes.map(row => [normalizeName(row.name), row.class_id]));
const standardArrayByClassId = Object.entries(standardArrayByClass).reduce((acc, [name, values]) => {
  const classId = classIdByName.get(normalizeName(name));
  if (!classId) return acc;
  acc[classId] = values;
  return acc;
}, {});
const standardArrayByClassNormalized = Object.entries(standardArrayByClass).reduce((acc, [name, values]) => {
  acc[normalizeName(name)] = values;
  return acc;
}, {});
function getStandardArrayEntry(classValue) {
  const normalized = normalizeName(classValue);
  const row = classes.find(
    item =>
      String(item.class_id || '').toLowerCase() === String(classValue || '').toLowerCase() ||
      normalizeName(item.name) === normalized
  );
  const lookups = [
    row?.class_id && standardArrayByClassId[row.class_id],
    row?.name && standardArrayByClass[row.name],
    normalized && standardArrayByClassNormalized[normalized],
    row?.name && standardArrayByClassNormalized[normalizeName(row.name)],
  ];
  return lookups.find(Boolean) || null;
}
['Barbarian', 'Druid', 'CLS_DRUID', 'CLS_BARD'].forEach(val => {
  console.log(val, getStandardArrayEntry(val));
});
