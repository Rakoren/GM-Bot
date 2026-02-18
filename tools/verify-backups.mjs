import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.join(ROOT, 'data', 'backups');

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fail(`Backup directory not found: ${BACKUP_DIR}`);
}

const entries = fs.readdirSync(BACKUP_DIR)
  .filter(name => name.toLowerCase().endsWith('.sqlite'))
  .map(name => {
    const fullPath = path.join(BACKUP_DIR, name);
    const stat = fs.statSync(fullPath);
    return { name, path: fullPath, mtime: stat.mtimeMs, size: stat.size };
  })
  .sort((a, b) => b.mtime - a.mtime);

if (!entries.length) {
  fail(`No backup files found in ${BACKUP_DIR}`);
}

const latest = entries[0];
if (!latest.size || latest.size < 100) {
  fail(`Latest backup is too small: ${latest.name} (${latest.size} bytes)`);
}

const header = fs.readFileSync(latest.path, { encoding: 'utf8', flag: 'r' }).slice(0, 16);
if (!header.startsWith('SQLite format 3')) {
  fail(`Latest backup does not look like SQLite: ${latest.name}`);
}

console.log(`Backup OK: ${latest.name} (${latest.size} bytes)`);
