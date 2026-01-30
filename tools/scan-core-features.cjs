const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const repoRoot = process.cwd();
const pdfDir = path.join(repoRoot, 'docs', 'sources', 'phb2024', '04-chapter 3');

const pdfNames = fs.readdirSync(pdfDir).filter((name) => name.toLowerCase().endsWith('.pdf'));
const classPdfs = pdfNames.filter((name) => name.includes('Character Classes'));
if (classPdfs.length === 0) {
  throw new Error(`No Character Classes PDFs found in ${pdfDir}`);
}

const pdfPaths = classPdfs.map((name) => path.join(pdfDir, name));

const tablesDir = path.join(repoRoot, 'docs', 'chapter-03', 'tables');
const tableFiles = fs
  .readdirSync(tablesDir)
  .filter((name) => name.endsWith('.class_features.json'));

const featureToClasses = new Map();

for (const tableFile of tableFiles) {
  const tablePath = path.join(tablesDir, tableFile);
  const table = JSON.parse(fs.readFileSync(tablePath, 'utf8'));
  const classId = table.id || tableFile.replace(/\.json$/, '');
  const perClass = new Set();

  for (const entry of table.entries || []) {
    for (const featureId of entry.class_features || []) {
      perClass.add(featureId);
    }
  }

  for (const featureId of perClass) {
    if (!featureToClasses.has(featureId)) {
      featureToClasses.set(featureId, new Set());
    }
    featureToClasses.get(featureId).add(classId);
  }
}

const coreFeaturesFile = path.join(
  repoRoot,
  'docs',
  'chapter-03',
  'core',
  '03-core.features.json'
);
const coreFeaturesData = JSON.parse(fs.readFileSync(coreFeaturesFile, 'utf8'));
const coreFeatureRefs = new Set(coreFeaturesData.feature_refs || []);

const coreFeatureFilesDir = path.join(repoRoot, 'docs', 'chapter-03', 'core', 'features');
const coreFeatureFiles = fs
  .readdirSync(coreFeatureFilesDir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(fs.readFileSync(path.join(coreFeatureFilesDir, name), 'utf8')));
const coreFeatureIds = new Set(coreFeatureFiles.map((feat) => feat.id));

const toTitle = (value) =>
  value
    .split('_')
    .map((chunk) => (chunk.length ? chunk[0].toUpperCase() + chunk.slice(1) : chunk))
    .join(' ');

const candidates = [];

for (const [featureId, classSet] of featureToClasses.entries()) {
  if (classSet.size < 2) continue;
  candidates.push({
    featureId,
    displayName: toTitle(featureId),
    classCount: classSet.size,
    classes: Array.from(classSet).sort(),
    coreRef: coreFeatureRefs.has(`feat.${featureId}`) || coreFeatureRefs.has(featureId),
    coreFile: coreFeatureIds.has(`feat.${featureId}`) || coreFeatureIds.has(featureId),
  });
}

const main = async () => {
  const texts = [];
  for (const pdfPath of pdfPaths) {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const parsed = await parser.getText();
    await parser.destroy();
    texts.push(parsed.text || '');
  }

  const corpus = texts.join('\n').toLowerCase();
  const results = candidates
    .map((item) => {
      const needle = item.displayName.toLowerCase();
      const regex = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'g');
      const matches = corpus.match(regex);
      return {
        ...item,
        pdfHits: matches ? matches.length : 0,
      };
    })
    .sort((a, b) => b.classCount - a.classCount || a.featureId.localeCompare(b.featureId));

  console.log('Core feature candidates (appear in 2+ class tables):');
  for (const item of results) {
    console.log(
      `- ${item.featureId} | classes: ${item.classCount} | pdfHits: ${item.pdfHits} | coreRef: ${item.coreRef} | coreFile: ${item.coreFile}`
    );
  }

  console.log('');
  console.log('Source PDFs:');
  for (const pdfPath of pdfPaths) {
    console.log(`- ${pdfPath}`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
