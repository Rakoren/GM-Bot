import fs from 'fs';
import path from 'path';

const DEFAULT_DOCS_DIR = 'docs';

const TABLE_TO_TYPE = {
  classes: 'class',
  subclasses: 'subclass',
  species: 'species',
  backgrounds: 'background',
  feats: 'feat',
  spells: 'spell',
  monsters: 'monster',
  animals: 'animal',
};

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeAlias(value) {
  const base = normalizeName(value);
  if (!base) return '';
  return base
    .replace(/\b(armor|armour|weapon|weapons)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findManifestPaths(rootDir) {
  const docsRoot = path.join(rootDir, DEFAULT_DOCS_DIR);
  const results = [];
  const stack = [docsRoot];

  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.manifest.json')) {
        results.push(fullPath);
      }
    }
  }

  return results.sort();
}

function loadJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function getShardName(shardData) {
  if (!shardData || typeof shardData !== 'object') return null;
  return shardData.name || shardData.title || shardData.label || null;
}

export function createRulesRegistry({ rootDir } = {}) {
  const root = rootDir || process.cwd();
  const docsRoot = path.join(root, DEFAULT_DOCS_DIR);
  const manifestPaths = findManifestPaths(root);
  const byId = new Map();
  const byType = new Map();
  const byName = new Map();
  const itemAliases = new Map();
  const errors = [];

  for (const manifestPath of manifestPaths) {
    let manifest = null;
    try {
      manifest = loadJsonFile(manifestPath);
    } catch (err) {
      errors.push({ type: 'manifest_parse', file: manifestPath, message: err?.message || String(err) });
      continue;
    }

    const shards = Array.isArray(manifest?.shards) ? manifest.shards : [];
    for (const shard of shards) {
      const shardId = shard?.id;
      const shardType = shard?.type || null;
      const shardRelPath = shard?.path;
      if (!shardId || !shardRelPath) continue;

      const shardPath = path.join(docsRoot, shardRelPath);
      if (!fs.existsSync(shardPath)) {
        errors.push({ type: 'missing_shard', id: shardId, path: shardPath });
        continue;
      }

      let data = null;
      try {
        data = loadJsonFile(shardPath);
      } catch (err) {
        errors.push({ type: 'shard_parse', id: shardId, path: shardPath, message: err?.message || String(err) });
        continue;
      }

      const name = getShardName(data);
      const entry = {
        id: shardId,
        type: shardType,
        path: shardRelPath,
        absPath: shardPath,
        name: name || null,
        name_norm: name ? normalizeName(name) : null,
        data,
      };

      byId.set(shardId, entry);
      if (shardType) {
        if (!byType.has(shardType)) byType.set(shardType, []);
        byType.get(shardType).push(entry);
      }
      if (entry.name_norm) {
        const key = `${shardType || 'unknown'}:${entry.name_norm}`;
        if (!byName.has(key)) byName.set(key, entry);
      }

      if (shardType === 'item') {
        const rawName = String(entry.name || '').trim();
        const rawNorm = entry.name_norm || (rawName ? normalizeName(rawName) : '');
        const rawAlias = rawName ? normalizeAlias(rawName) : '';
        if (rawName) itemAliases.set(rawName.toLowerCase(), entry);
        if (rawNorm) itemAliases.set(rawNorm, entry);
        if (rawAlias) itemAliases.set(rawAlias, entry);
        if (shardId) itemAliases.set(shardId, entry);
      }
    }
  }

  const lookupById = (id) => byId.get(id) || null;

  const lookupByName = (typeOrTable, name) => {
    const type = TABLE_TO_TYPE[typeOrTable] || typeOrTable;
    if (!type) return null;
    const key = normalizeName(name);
    if (!key) return null;
    return byName.get(`${type}:${key}`) || null;
  };

  const searchByName = (typeOrTable, query, limit = 8) => {
    const type = TABLE_TO_TYPE[typeOrTable] || typeOrTable;
    if (!type) return [];
    const needle = normalizeName(query);
    if (!needle) return [];
    const list = byType.get(type) || [];
    const matches = list.filter(entry => entry.name_norm && entry.name_norm.includes(needle));
    return matches.slice(0, Number(limit) || 8);
  };

  const formatResults = (typeOrTable, entries) => {
    if (!entries?.length) return 'No matches found.';
    const type = TABLE_TO_TYPE[typeOrTable] || typeOrTable;
    const lines = [];
    for (const entry of entries) {
      const label = entry.name || entry.id;
      if (type === 'spell' && entry.data?.level != null) {
        lines.push(`- ${label} (Lv ${entry.data.level}, ${entry.data.school || 'Unknown'})`);
      } else {
        lines.push(`- ${label} (${entry.id})`);
      }
    }
    return lines.join('\n');
  };

  return {
    byId,
    byType,
    byName,
    itemAliases,
    errors,
    lookupById,
    lookupByName,
    searchByName,
    formatResults,
    getItemByAlias: (value) => {
      const raw = String(value || '').trim();
      if (!raw) return null;
      const direct = byId.get(raw) || itemAliases.get(raw);
      if (direct) return direct;
      const norm = normalizeName(raw);
      const alias = normalizeAlias(raw);
      return (
        itemAliases.get(norm) ||
        itemAliases.get(alias) ||
        itemAliases.get(raw.toLowerCase()) ||
        null
      );
    },
  };
}
