import fs from 'fs';
import path from 'path';

function ensureDir(dirPath) {
  if (!dirPath) return;
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function buildTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

export function backupSqliteDb({ dbPath, backupDir, keep = 10 } = {}) {
  if (!dbPath) return { ok: false, error: 'db-path-missing' };
  if (!fs.existsSync(dbPath)) return { ok: false, error: 'db-path-not-found' };
  if (!backupDir) return { ok: false, error: 'backup-dir-missing' };
  ensureDir(backupDir);

  const timestamp = buildTimestamp();
  const baseName = path.basename(dbPath, path.extname(dbPath));
  const target = path.join(backupDir, `${baseName}.${timestamp}.sqlite`);
  fs.copyFileSync(dbPath, target);

  const entries = fs.readdirSync(backupDir)
    .map(name => ({ name, path: path.join(backupDir, name) }))
    .filter(entry => entry.name.startsWith(baseName) && entry.name.endsWith('.sqlite'))
    .map(entry => ({
      ...entry,
      mtime: fs.statSync(entry.path).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  const maxKeep = Number.isFinite(keep) ? keep : 10;
  const toDelete = entries.slice(maxKeep);
  toDelete.forEach(entry => {
    try {
      fs.unlinkSync(entry.path);
    } catch {}
  });

  return { ok: true, file: target, pruned: toDelete.length };
}
