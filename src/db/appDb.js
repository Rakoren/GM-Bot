import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

function ensureDir(dirPath) {
  if (!dirPath) return;
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function execToRows(result) {
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    for (let i = 0; i < columns.length; i += 1) obj[columns[i]] = row[i];
    return obj;
  });
}

export async function initAppDb({
  rootDir,
  dbPath,
  legacyPaths = {},
} = {}) {
  if (!rootDir) throw new Error('initAppDb requires rootDir');
  const resolvedPath = dbPath
    ? path.resolve(dbPath)
    : path.join(rootDir, 'data', 'app.sqlite');
  ensureDir(path.dirname(resolvedPath));

  const SQL = await initSqlJs({
    locateFile: file => path.join(rootDir, 'node_modules', 'sql.js', 'dist', file),
  });

  const db = fs.existsSync(resolvedPath)
    ? new SQL.Database(new Uint8Array(fs.readFileSync(resolvedPath)))
    : new SQL.Database();

  db.exec(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      json TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      name TEXT PRIMARY KEY,
      json TEXT,
      updated_at TEXT
    );
  `);

  function saveDb() {
    const data = db.export();
    fs.writeFileSync(resolvedPath, Buffer.from(data));
  }

  function getJson(key, fallback = null) {
    const stmt = db.prepare('SELECT json FROM kv_store WHERE key = ? LIMIT 1');
    stmt.bind([key]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    if (!row?.json) return fallback;
    try {
      return JSON.parse(row.json);
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    const payload = JSON.stringify(value ?? null);
    db.run(
      `INSERT INTO kv_store (key, json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
      [key, payload, new Date().toISOString()]
    );
    saveDb();
  }

  function deleteKey(key) {
    db.run(`DELETE FROM kv_store WHERE key = ?`, [key]);
    saveDb();
  }

  function listCampaigns() {
    const result = db.exec(`SELECT name FROM campaigns ORDER BY name`);
    return execToRows(result).map(r => r.name);
  }

  function getCampaign(name) {
    const stmt = db.prepare('SELECT json FROM campaigns WHERE name = ? LIMIT 1');
    stmt.bind([name]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    if (!row?.json) return null;
    try {
      return JSON.parse(row.json);
    } catch {
      return null;
    }
  }

  function setCampaign(name, payload) {
    if (!name) return;
    const json = JSON.stringify(payload ?? null);
    db.run(
      `INSERT INTO campaigns (name, json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
      [String(name).trim(), json, new Date().toISOString()]
    );
    saveDb();
  }

  function deleteCampaign(name) {
    if (!name) return;
    db.run(`DELETE FROM campaigns WHERE name = ?`, [String(name).trim()]);
    saveDb();
  }

  function importJsonIfMissing(key, filePath, fallback) {
    const existing = getJson(key, undefined);
    if (existing !== undefined) return;
    if (!filePath || !fs.existsSync(filePath)) {
      if (fallback !== undefined) setJson(key, fallback);
      return;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      setJson(key, parsed);
    } catch {
      if (fallback !== undefined) setJson(key, fallback);
    }
  }

  function importCampaignFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return;
    try {
      const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const name = payload?.name || path.basename(filePath, path.extname(filePath));
      if (!name) return;
      if (getCampaign(name)) return;
      setCampaign(name, payload);
    } catch {
      // ignore bad campaign file
    }
  }

  function migrateLegacyFiles() {
    importJsonIfMissing('profiles', legacyPaths.profiles, {});
    importJsonIfMissing('character_bank', legacyPaths.characters, {});
    importJsonIfMissing('npc_personas', legacyPaths.npcPersonas, {});
    importJsonIfMissing('trades', legacyPaths.trades, []);
    importJsonIfMissing('campaign_autosave', legacyPaths.campaignAutosave, null);

    const campaignDir = legacyPaths.campaignDir;
    if (campaignDir && fs.existsSync(campaignDir)) {
      const entries = fs.readdirSync(campaignDir);
      entries.filter(name => name.toLowerCase().endsWith('.json')).forEach(name => {
        importCampaignFile(path.join(campaignDir, name));
      });
    }
  }

  migrateLegacyFiles();

  return {
    dbPath: resolvedPath,
    getJson,
    setJson,
    deleteKey,
    listCampaigns,
    getCampaign,
    setCampaign,
    deleteCampaign,
    saveDb,
  };
}
