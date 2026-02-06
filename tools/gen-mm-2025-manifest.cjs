const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const docsDir = path.join(rootDir, 'docs');
const mmDir = path.join(docsDir, 'mm-2025');
const outPath = path.join(mmDir, 'mm-2025.manifest.json');

const scanDir = (dir, type) => {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const shards = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const absPath = path.join(dir, entry.name);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    } catch (err) {
      console.warn(`[mm-2025] skip ${entry.name}: ${err.message}`);
      continue;
    }
    if (!data?.id) {
      console.warn(`[mm-2025] missing id: ${entry.name}`);
      continue;
    }
    const relPath = path.relative(docsDir, absPath).replace(/\\/g, '/');
    shards.push({ id: data.id, type, path: relPath });
  }
  return shards.sort((a, b) => a.id.localeCompare(b.id));
};

const shards = [
  ...scanDir(path.join(mmDir, 'animals'), 'animal'),
  ...scanDir(path.join(mmDir, 'monsters'), 'monster'),
];

const manifest = {
  schema_version: '0.4.0',
  title: 'Monster Manual (2025)',
  generated_at: new Date().toISOString().slice(0, 10),
  paths: {
    animals_dir: 'mm-2025/animals',
    monsters_dir: 'mm-2025/monsters',
  },
  shards,
};

fs.mkdirSync(mmDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`[mm-2025] wrote ${shards.length} shards to ${path.relative(rootDir, outPath)}`);
