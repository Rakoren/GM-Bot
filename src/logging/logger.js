import fs from 'fs';
import path from 'path';

const LEVELS = ['debug', 'info', 'warn', 'error'];

function ensureDir(dirPath) {
  if (!dirPath) return;
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function toLevel(value) {
  const lowered = String(value || '').toLowerCase();
  return LEVELS.includes(lowered) ? lowered : 'info';
}

function shouldLog(level, threshold) {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(threshold);
}

function rotateIfNeeded(filePath, maxBytes, maxFiles) {
  if (!fs.existsSync(filePath)) return;
  const stats = fs.statSync(filePath);
  if (stats.size < maxBytes) return;
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const rotated = path.join(dir, `${base}.${stamp}.log`);
  fs.renameSync(filePath, rotated);
  const entries = fs.readdirSync(dir)
    .filter(name => name.startsWith(base + '.') && name.endsWith('.log'))
    .map(name => ({
      name,
      path: path.join(dir, name),
      mtime: fs.statSync(path.join(dir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
  entries.slice(maxFiles).forEach(entry => {
    try {
      fs.unlinkSync(entry.path);
    } catch {}
  });
}

export function createLogger({
  logDir,
  fileName,
  level = 'info',
  maxBytes = 5 * 1024 * 1024,
  maxFiles = 5,
} = {}) {
  const threshold = toLevel(level);
  ensureDir(logDir);
  const filePath = path.join(logDir, fileName);

  function write(levelName, message, meta) {
    const lvl = toLevel(levelName);
    if (!shouldLog(lvl, threshold)) return;
    const payload = {
      ts: new Date().toISOString(),
      level: lvl,
      msg: String(message || ''),
    };
    if (meta && typeof meta === 'object') payload.meta = meta;
    const line = JSON.stringify(payload);
    try {
      rotateIfNeeded(filePath, maxBytes, maxFiles);
      fs.appendFileSync(filePath, line + '\n', 'utf8');
    } catch {}
  }

  return {
    filePath,
    level: threshold,
    debug: (msg, meta) => write('debug', msg, meta),
    info: (msg, meta) => write('info', msg, meta),
    warn: (msg, meta) => write('warn', msg, meta),
    error: (msg, meta) => write('error', msg, meta),
  };
}
