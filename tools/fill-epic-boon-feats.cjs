const fs = require('fs');
const path = require('path');

const sourceText =
  'docs/sources/phb2024/06-chapter 5/07-Feats - Player’s Handbook - Dungeons & Dragons - Sources - D&D Beyond.txt';
const sourceFile =
  'docs/sources/phb2024/06-chapter 5/07-Feats - Player’s Handbook - Dungeons & Dragons - Sources - D&D Beyond.pdf';
const featsDir = path.join('docs', 'chapter-05', 'feats');

const raw = fs.readFileSync(sourceText, 'utf8');
const lines = raw.split(/\r?\n/);

const startIdx = lines.findIndex((l) => l.trim() === 'Epic Boon Feats');
if (startIdx === -1) {
  console.error('Epic Boon Feats section not found.');
  process.exit(1);
}

const sectionLines = lines.slice(startIdx);

let currentPage = null;
const sectionWithPages = sectionLines.map((line) => {
  const pageMatch = line.match(/^--\s+(\d+)\s+of\s+\d+\s+--$/);
  if (pageMatch) currentPage = Number(pageMatch[1]);
  return { line, page: currentPage };
});

const featFiles = fs.readdirSync(featsDir).filter((f) => f.endsWith('.json'));
const epicFeats = featFiles
  .map((file) => {
    const p = path.join(featsDir, file);
    const data = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
    return { file, data };
  })
  .filter(({ data }) => data.category === 'Epic Boon');

const featNames = epicFeats.map(({ data }) => data.name);

const lineIndexByFeat = new Map();
for (let i = 0; i < sectionWithPages.length; i += 1) {
  const l = sectionWithPages[i].line.trim();
  if (featNames.includes(l)) lineIndexByFeat.set(l, i);
}

const sorted = Array.from(lineIndexByFeat.entries())
  .map(([name, idx]) => ({ name, idx }))
  .sort((a, b) => a.idx - b.idx);

const getBlock = (idx, nextIdx) => sectionWithPages.slice(idx, nextIdx);

const parsePrereq = (block) => {
  for (const { line } of block) {
    const m = line.match(/^Epic Boon Feat\s*\(([^)]+)\)/);
    if (m) return [m[1].trim()];
  }
  return [];
};

const isBenefitHeader = (line) => {
  if (!line) return false;
  if (!line.includes('. ')) return false;
  const head = line.split('. ')[0];
  return /^[A-Z][A-Za-z0-9'’()\-\s/]+$/.test(head);
};

const parseBenefits = (block) => {
  const benefitLines = block
    .map(({ line }) => line)
    .filter(
      (l) =>
        l &&
        !l.startsWith('--') &&
        l.trim() !== 'Epic Boon Feats' &&
        l.trim() !== 'These feats are in the Epic Boon category.'
    );

  while (benefitLines.length && benefitLines[0].trim() === '')
    benefitLines.shift();
  if (benefitLines.length) benefitLines.shift(); // feat name
  if (benefitLines[0] && benefitLines[0].startsWith('Epic Boon Feat'))
    benefitLines.shift();
  if (benefitLines[0] === 'You gain the following benefits.')
    benefitLines.shift();

  const benefits = [];
  let current = null;

  for (const line of benefitLines) {
    if (!line.trim()) continue;
    if (line.startsWith('--')) continue;

    if (isBenefitHeader(line)) {
      if (current) benefits.push(current);
      const sepIdx = line.indexOf('. ');
      const head = sepIdx === -1 ? line : line.slice(0, sepIdx);
      const rest = sepIdx === -1 ? '' : line.slice(sepIdx + 2);
      current = {
        name: head.trim(),
        action_type: 'none',
        trigger: 'passive',
        effects: [rest ? rest.trim() : ''],
      };
    } else if (current) {
      current.effects[current.effects.length - 1] += ` ${line.trim()}`;
    } else {
      current = {
        name: 'Benefit',
        action_type: 'none',
        trigger: 'passive',
        effects: [line.trim()],
      };
    }
  }

  if (current) benefits.push(current);

  for (const b of benefits) {
    b.effects = b.effects
      .map((e) => e.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  return benefits;
};

for (let i = 0; i < sorted.length; i += 1) {
  const { name, idx } = sorted[i];
  const nextIdx =
    i + 1 < sorted.length ? sorted[i + 1].idx : sectionWithPages.length;
  const block = getBlock(idx, nextIdx);
  const pages = Array.from(new Set(block.map((b) => b.page).filter(Boolean)));

  const prerequisites = parsePrereq(block);
  const benefits = parseBenefits(block);

  const featEntry = epicFeats.find((f) => f.data.name === name);
  if (!featEntry) continue;

  const data = featEntry.data;
  data.status = 'complete';
  data.sourceRef = {
    file: sourceFile,
    pages: pages.length ? pages : [12],
    section: name,
  };
  data.prerequisites = prerequisites;
  data.benefits = benefits;
  if (!data.notes) data.notes = [];
  data.notes = data.notes.filter((n) => !n.startsWith('Placeholder'));

  fs.writeFileSync(
    path.join(featsDir, featEntry.file),
    JSON.stringify(data, null, 2) + '\n',
    'utf8'
  );
}

console.log('Epic Boon feats updated:', sorted.length);
