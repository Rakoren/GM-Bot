import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { createRulesRegistry } from '../src/rules/registry.js';
import { initAppDb } from '../src/db/appDb.js';
import { backupSqliteDb } from '../src/db/backup.js';
import { APP_DB_PATH } from '../src/config/runtime.js';
import { createLogger } from '../src/logging/logger.js';
import { validateEnv } from '../src/config/validateEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATASET_GROUP = process.env.DATASET_GROUP || 'D&D';
const DATASET_DIR = path.join(ROOT_DIR, 'data_sets', DATASET_GROUP);
const HOMEBREW_DIR = path.join(DATASET_DIR, 'homebrew_uploads');
const ADMIN_CONFIG_PATH = process.env.ADMIN_CONFIG_PATH
  ? path.resolve(process.env.ADMIN_CONFIG_PATH)
  : path.join(ROOT_DIR, 'admin_config.json');
const WIZARD_DATA_PATH = path.join(DATASET_DIR, 'wizard_data.json');
const CLASSES_NORMALIZED_PATH = path.join(DATASET_DIR, 'classes_normalized.json');

const ADMIN_HOST = process.env.ADMIN_HOST || '0.0.0.0';
const ADMIN_PORT = Number(process.env.ADMIN_PORT || 3001);
const BASE_URL = process.env.ADMIN_BASE_URL || `http://${ADMIN_HOST}:${ADMIN_PORT}`;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_OAUTH_REDIRECT =
  process.env.DISCORD_OAUTH_REDIRECT || `${BASE_URL}/auth/discord/callback`;
const DISCORD_OAUTH_REDIRECT_PLAYER =
  process.env.DISCORD_OAUTH_REDIRECT_PLAYER || `${BASE_URL}/auth/discord/player/callback`;
const ADMIN_GUILD_ID = process.env.ADMIN_GUILD_ID || process.env.GUILD_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
const ADMIN_PERMISSION = 0x8n;
const MANAGE_GUILD_PERMISSION = 0x20n;
const PLAYER_ROLE_NAME = (process.env.PLAYER_ROLE_NAME || 'player').toLowerCase();
const ADMIN_ROLE_IDS = (process.env.ADMIN_ROLE_IDS || '')
  .split(',')
  .map(id => String(id).trim())
  .filter(Boolean);
const ONLINE_PLAYER_TTL_MS = 2 * 60 * 1000;
const onlinePlayers = new Map();
const ADMIN_COOKIE_SECURE =
  process.env.ADMIN_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
const ADMIN_SESSION_STORE = (process.env.ADMIN_SESSION_STORE || 'memory').toLowerCase();
const ADMIN_SESSION_FILE =
  process.env.ADMIN_SESSION_FILE || path.join(ROOT_DIR, 'admin_sessions.json');
const ADMIN_SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS || 1000 * 60 * 60 * 24 * 7);
const ADMIN_SESSION_IDLE_MS = Number(process.env.ADMIN_SESSION_IDLE_MS || 1000 * 60 * 60 * 2);
const ADMIN_CSRF_ENABLED = process.env.ADMIN_CSRF_ENABLED !== 'false';
const ADMIN_RATE_LIMIT_WINDOW_MS = Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS || 60 * 1000);
const ADMIN_RATE_LIMIT_MAX = Number(process.env.ADMIN_RATE_LIMIT_MAX || 120);
const ADMIN_AUTH_RATE_LIMIT_MAX = Number(process.env.ADMIN_AUTH_RATE_LIMIT_MAX || 30);
const ADMIN_UPLOAD_MAX_MB = Number(process.env.ADMIN_UPLOAD_MAX_MB || 15);
const ADMIN_GZIP_ENABLED = process.env.ADMIN_GZIP_ENABLED !== 'false';
const ADMIN_GZIP_MIN_BYTES = Number(process.env.ADMIN_GZIP_MIN_BYTES || 512);
const ADMIN_CORS_ORIGINS = (process.env.ADMIN_CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const DISCORD_OAUTH_SCOPES_ADMIN = 'identify guilds';
const DISCORD_OAUTH_SCOPES_PLAYER = 'identify guilds';

const DEFAULT_ADMIN_ORIGINS = (() => {
  const origins = new Set();
  origins.add(`http://localhost:${ADMIN_PORT}`);
  origins.add(`http://127.0.0.1:${ADMIN_PORT}`);
  if (ADMIN_HOST && ADMIN_HOST !== '0.0.0.0') {
    origins.add(`http://${ADMIN_HOST}:${ADMIN_PORT}`);
  }
  return origins;
})();
const BASE_ORIGIN = (() => {
  try {
    return new URL(BASE_URL).origin;
  } catch {
    return null;
  }
})();
const ADMIN_CORS_ORIGIN_SET = new Set([
  ...DEFAULT_ADMIN_ORIGINS,
  ...(BASE_ORIGIN ? [BASE_ORIGIN] : []),
  ...ADMIN_CORS_ORIGINS,
]);

const ADMIN_CSP = [
  "default-src 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
].join('; ');

const APP_VERSION = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
})();
const BUILD_ID = process.env.BUILD_ID || process.env.GIT_SHA || APP_VERSION || 'dev';
const LOG_DIR = process.env.LOG_DIR || path.join(ROOT_DIR, 'logs');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_MAX_BYTES = Number(process.env.LOG_MAX_BYTES || 5 * 1024 * 1024);
const LOG_MAX_FILES = Number(process.env.LOG_MAX_FILES || 5);

const logger = createLogger({
  logDir: LOG_DIR,
  fileName: 'admin.log',
  level: LOG_LEVEL,
  maxBytes: LOG_MAX_BYTES,
  maxFiles: LOG_MAX_FILES,
});

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
console.log = (...args) => {
  originalConsole.log(...args);
  logger.info(args.join(' '));
};
console.info = (...args) => {
  originalConsole.info(...args);
  logger.info(args.join(' '));
};
console.warn = (...args) => {
  originalConsole.warn(...args);
  logger.warn(args.join(' '));
};
console.error = (...args) => {
  originalConsole.error(...args);
  logger.error(args.join(' '));
};

process.on('uncaughtException', err => {
  logger.error('uncaughtException', { message: err?.message, stack: err?.stack });
});
process.on('unhandledRejection', err => {
  logger.error('unhandledRejection', { message: err?.message, stack: err?.stack });
});
const COMBAT_STATE_PATH = path.join(ROOT_DIR, 'combat_state.json');
const LOOT_STATE_PATH = path.join(ROOT_DIR, 'loot_state.json');
const NPC_PERSONAS_PATH = path.join(ROOT_DIR, 'npc_personas.json');
const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.join(ROOT_DIR, 'data', 'backups');
const BACKUP_KEEP = Number(process.env.BACKUP_KEEP || 10);
const BACKUP_INTERVAL_MIN = Number(process.env.BACKUP_INTERVAL_MIN || 1440);

const appDb = await initAppDb({
  rootDir: ROOT_DIR,
  dbPath: APP_DB_PATH,
  legacyPaths: {
    profiles: path.join(ROOT_DIR, 'profiles.json'),
    characters: path.join(ROOT_DIR, 'characters.json'),
    npcPersonas: NPC_PERSONAS_PATH,
    trades: path.join(ROOT_DIR, 'trades.json'),
  },
});

function canManageGuild(guild) {
  if (!guild) return false;
  if (guild.owner) return true;
  try {
    const permissions = BigInt(guild.permissions || 0);
    return (permissions & ADMIN_PERMISSION) === ADMIN_PERMISSION
      || (permissions & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION;
  } catch {
    return false;
  }
}

function ensureJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.warn(`Failed to read ${path.basename(filePath)}:`, err?.message || err);
    return fallback;
  }
}

function loadProfiles() {
  return appDb.getJson('profiles', {});
}

function saveProfiles(profiles) {
  appDb.setJson('profiles', profiles || {});
}

function loadCharacterBank() {
  return appDb.getJson('character_bank', {});
}

function saveCharacterBank(bank) {
  appDb.setJson('character_bank', bank || {});
}

function loadTrades() {
  return appDb.getJson('trades', []);
}

function saveTrades(trades) {
  appDb.setJson('trades', trades || []);
}

const COMMAND_MANIFEST = [
  { name: 'status', description: 'Show bot status' },
  { name: 'check', description: 'Roll an ability or skill check' },
  { name: 'percent', description: 'Roll a percentile check' },
  { name: 'rolltable', description: 'Roll a random table die' },
  { name: 'mode', description: 'Set DM mode' },
  { name: 'setchar', description: 'Link your Discord user to a character name' },
  { name: 'turn', description: 'Set the active turn to a user' },
  { name: 'roll', description: 'Roll dice' },
  { name: 'campaign-setup', description: 'Set campaign name, theme, and setting' },
  { name: 'character-setup', description: 'Start character intake for players' },
  { name: 'start', description: 'Start full campaign and character setup flow' },
  { name: 'test', description: 'Jump to a setup step (testing)' },
  { name: 'lookup', description: 'Search rules reference data' },
  { name: 'data', description: 'Reference data tools' },
  { name: 'import', description: 'Import data by pasting a block' },
  { name: 'homebrew', description: 'Add homebrew reference data' },
  { name: 'sheet', description: 'Show a character sheet summary' },
  { name: 'save', description: 'Save campaign by name' },
  { name: 'reset', description: 'Reset in-memory campaign state' },
  { name: 'clear', description: 'Clear current campaign' },
  { name: 'help', description: 'Show available commands' },
  { name: 'load', description: 'Load campaign by name' },
  { name: 'delete', description: 'Delete a saved campaign' },
  { name: 'bank', description: 'Character bank' },
  { name: 'npc', description: 'NPC manager' },
  { name: 'log-in', description: 'Mark yourself as logged in' },
  { name: 'log-out', description: 'Remove manual logged-in status' },
  { name: 'say', description: 'Speak a test line in the voice channel' },
  { name: 'profile', description: 'Show your character profile card' },
  { name: 'profile-clear', description: 'Clear your saved character profile' },
  { name: 'xp', description: 'Set your XP (testing only)' },
  { name: 'wizard', description: 'Open the web character creation wizard' },
];

const DEFAULT_FEATURE_FLAGS = {
  enableSlashCommands: true,
  enableMessageCommands: true,
  enableAutoReplies: true,
  enableTts: true,
  enableVoice: true,
  enableHomebrew: true,
  enableImports: true,
  enableDataReload: true,
  enableUploads: true,
};
const DEFAULT_AI_MODE = 'active';

function buildDefaultConfig() {
  const commands = {};
  for (const cmd of COMMAND_MANIFEST) {
    commands[cmd.name] = { enabled: true, access: 'everyone', roles: [] };
  }
  return {
    version: 1,
    aiMode: DEFAULT_AI_MODE,
    features: { ...DEFAULT_FEATURE_FLAGS },
    commands,
    commandRegistry: {
      groups: {
        core: true,
        setup: true,
        play: true,
        bank: true,
        npc: true,
        profile: true,
        save: true,
        voice: true,
        homebrew: true,
      },
    },
    commandPoliciesByGuild: {},
  };
}

function normalizeConfig(raw) {
  const base = buildDefaultConfig();
  const config = typeof raw === 'object' && raw ? raw : {};
  const commandRegistry =
    config.commandRegistry && typeof config.commandRegistry === 'object'
      ? config.commandRegistry
      : null;
  const commandPoliciesByGuild =
    config.commandPoliciesByGuild && typeof config.commandPoliciesByGuild === 'object'
      ? config.commandPoliciesByGuild
      : null;
  const aiMode =
    typeof config.aiMode === 'string' ? config.aiMode.trim().toLowerCase() : '';
  if (aiMode === 'active' || aiMode === 'passive') {
    base.aiMode = aiMode;
  }
  if (config.features && typeof config.features === 'object') {
    for (const [key, value] of Object.entries(config.features)) {
      if (typeof value === 'boolean') base.features[key] = value;
    }
  }
  if (config.commands && typeof config.commands === 'object') {
    for (const name of Object.keys(base.commands)) {
      const entry = config.commands[name];
      if (typeof entry === 'boolean') {
        base.commands[name].enabled = entry;
        continue;
      }
      if (typeof entry === 'object' && entry) {
        if (typeof entry.enabled === 'boolean') base.commands[name].enabled = entry.enabled;
        if (typeof entry.access === 'string') base.commands[name].access = entry.access;
        if (Array.isArray(entry.roles)) {
          base.commands[name].roles = entry.roles.map(id => String(id)).filter(Boolean);
        }
      }
    }
  }
  if (commandRegistry && typeof commandRegistry.groups === 'object') {
    base.commandRegistry = {
      groups: { ...base.commandRegistry.groups, ...commandRegistry.groups },
    };
  }
  if (commandPoliciesByGuild) {
    base.commandPoliciesByGuild = { ...commandPoliciesByGuild };
  }
  return base;
}

function loadConfig() {
  if (!fs.existsSync(ADMIN_CONFIG_PATH)) return buildDefaultConfig();
  try {
    const raw = JSON.parse(fs.readFileSync(ADMIN_CONFIG_PATH, 'utf8'));
    return normalizeConfig(raw);
  } catch (err) {
    console.warn('Failed to read admin_config.json:', err?.message || err);
    return buildDefaultConfig();
  }
}

function saveConfig(config) {
  fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return raw && typeof raw === 'object' ? raw : fallback;
  } catch (err) {
    console.warn(`Failed to read ${path.basename(filePath)}:`, err?.message || err);
    return fallback;
  }
}

function createFileSessionStore(sessionModule) {
  const { Store } = sessionModule;
  let cache = {};

  function loadFromDisk() {
    if (!fs.existsSync(ADMIN_SESSION_FILE)) return;
    try {
      const data = JSON.parse(fs.readFileSync(ADMIN_SESSION_FILE, 'utf8'));
      if (data && typeof data === 'object') cache = data;
    } catch (err) {
      console.warn('Failed to read admin session store:', err?.message || err);
    }
  }

  function saveToDisk() {
    try {
      fs.writeFileSync(ADMIN_SESSION_FILE, JSON.stringify(cache || {}, null, 2), 'utf8');
    } catch (err) {
      console.warn('Failed to write admin session store:', err?.message || err);
    }
  }

  function isExpired(sess) {
    const expires = sess?.cookie?.expires;
    if (!expires) return false;
    const exp = new Date(expires).getTime();
    if (!Number.isFinite(exp)) return false;
    return exp <= Date.now();
  }

  class FileStore extends Store {
    get(sid, callback) {
      const entry = cache[sid];
      if (!entry) return callback(null, null);
      if (isExpired(entry)) {
        delete cache[sid];
        saveToDisk();
        return callback(null, null);
      }
      return callback(null, entry);
    }

    set(sid, sessionData, callback) {
      cache[sid] = sessionData;
      saveToDisk();
      callback?.(null);
    }

    destroy(sid, callback) {
      delete cache[sid];
      saveToDisk();
      callback?.(null);
    }

    touch(sid, sessionData, callback) {
      cache[sid] = sessionData;
      saveToDisk();
      callback?.(null);
    }
  }

  loadFromDisk();
  setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [sid, sess] of Object.entries(cache)) {
      const expires = sess?.cookie?.expires;
      if (!expires) continue;
      const exp = new Date(expires).getTime();
      if (Number.isFinite(exp) && exp <= now) {
        delete cache[sid];
        changed = true;
      }
    }
    if (changed) saveToDisk();
  }, 30 * 60 * 1000);

  return new FileStore();
}

function listDatasetFiles() {
  if (!fs.existsSync(DATASET_DIR)) return [];
  return fs
    .readdirSync(DATASET_DIR, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .filter(name => ['.csv', '.json', '.txt'].includes(path.extname(name).toLowerCase()))
    .sort();
}

function normalizeLine(value) {
  return String(value || '').trim();
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function toTitleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[\s_]+/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function stripLabel(value) {
  return normalizeLine(value).replace(/:\s*$/, '').toLowerCase();
}

function extractField(lines, label) {
  const target = label.toLowerCase();
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (stripLabel(lines[i]) === target) return normalizeLine(lines[i + 1]);
  }
  return '';
}

function findLabelIndex(lines, label) {
  const target = label.toLowerCase();
  for (let i = 0; i < lines.length; i += 1) {
    if (stripLabel(lines[i]) === target) return i;
  }
  return -1;
}

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

function csvEscape(value) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function cleanCsvCell(value) {
  return String(value ?? '').trim();
}

function loadCsvRows(filePath) {
  if (!fs.existsSync(filePath)) return { headers: [], rows: [] };
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map(cleanCsvCell);
  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      row[header] = cleanCsvCell(cols[idx]);
    });
    rows.push(row);
  }
  return { headers, rows };
}

function buildClassIdLookup() {
  const rows = loadCsvRows(path.join(DATASET_DIR, 'classes.csv')).rows;
  const map = new Map();
  for (const row of rows) {
    const nameKey = normalizeName(row.name);
    const classId = String(row.class_id || '').trim();
    if (nameKey && classId) {
      map.set(nameKey, classId);
    }
  }
  return map;
}

let wizardDataCache = null;
let wizardDataMTime = 0;
let rulesRegistryCache = null;

function loadWizardDataArtifact() {
  if (!fs.existsSync(WIZARD_DATA_PATH)) return null;
  try {
    const stats = fs.statSync(WIZARD_DATA_PATH);
    const mtime = stats.mtimeMs;
    if (wizardDataCache && wizardDataMTime === mtime) {
      return wizardDataCache;
    }
    const content = fs.readFileSync(WIZARD_DATA_PATH, 'utf8');
    wizardDataCache = JSON.parse(content);
    wizardDataMTime = mtime;
    return wizardDataCache;
  } catch (err) {
    console.warn('Failed to load wizard_data.json:', err?.message || err);
    wizardDataCache = null;
    wizardDataMTime = 0;
    return null;
  }
}

function getRulesRegistry() {
  if (rulesRegistryCache) return rulesRegistryCache;
  try {
    rulesRegistryCache = createRulesRegistry({ rootDir: ROOT_DIR });
    return rulesRegistryCache;
  } catch (err) {
    console.warn('Failed to build rules registry:', err?.message || err);
    rulesRegistryCache = null;
    return null;
  }
}

function checkAppDbReady() {
  try {
    const payload = { ts: new Date().toISOString() };
    appDb.setJson('healthcheck', payload);
    const readBack = appDb.getJson('healthcheck', null);
    if (!readBack || readBack.ts !== payload.ts) {
      return { ok: false, error: 'db-readback-mismatch' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'db-error' };
  }
}

function checkRulesReady() {
  const registry = getRulesRegistry();
  if (!registry) return { ok: false, error: 'rules-registry-missing' };
  if (Array.isArray(registry.errors) && registry.errors.length) {
    return { ok: false, error: `rules-registry-errors:${registry.errors.length}` };
  }
  return { ok: true };
}

function getRulesByType(registry, type) {
  if (!registry?.byType) return [];
  const entries = registry.byType.get(type);
  return Array.isArray(entries) ? entries : [];
}

function getRulesById(registry, id) {
  if (!registry?.byId) return null;
  return registry.byId.get(id) || null;
}

function getRuleName(entry) {
  return entry?.data?.name || entry?.name || entry?.data?.title || entry?.data?.label || entry?.id || '';
}

function normalizeListId(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getPackNameById(packId, packsById) {
  if (!packId) return '';
  const entry = packsById.get(packId);
  if (!entry) return '';
  return String(entry.pack || entry.name || '').trim();
}

function parsePackItemName(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const match = text.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return { name: match[2].trim(), qty: Number(match[1]) || 1 };
  }
  return { name: text, qty: 1 };
}

function buildEquipmentDescription(items, gp) {
  const parts = (items || []).filter(Boolean);
  if (Number.isFinite(Number(gp)) && Number(gp) > 0) {
    parts.push(`${gp} gp`);
  }
  return parts.join(' + ');
}

function buildClassProgressionFromTable(tableData, classId) {
  if (!tableData || !Array.isArray(tableData.entries)) return [];
  return tableData.entries.map(entry => {
    const row = {
      class_id: classId,
      level: entry.level,
      proficiency_bonus: entry.proficiency_bonus,
    };
    if (Array.isArray(entry.class_features)) {
      row.class_features = entry.class_features.join(', ');
    } else if (entry.class_features != null) {
      row.class_features = String(entry.class_features);
    }
    if (entry.spell_slots && typeof entry.spell_slots === 'object') {
      Object.entries(entry.spell_slots).forEach(([slot, value]) => {
        row[`spell_slots_level_${slot}`] = value;
      });
    }
    Object.entries(entry).forEach(([key, value]) => {
      if (['level', 'proficiency_bonus', 'class_features', 'spell_slots'].includes(key)) return;
      if (value === null || value === undefined || value === '') return;
      row[key] = value;
    });
    return row;
  });
}

function buildWizardDataFromRules() {
  const registry = getRulesRegistry();
  if (!registry) return null;

  const tableStandardArray = getRulesById(registry, 'table.ability_score.standard_array')?.data || null;
  const tableStandardArrayByClass = getRulesById(registry, 'table.ability_score.standard_array_by_class')?.data || null;
  const tablePointBuy = getRulesById(registry, 'table.ability_score.point_buy')?.data || null;
  const standardArrayGlobal = Array.isArray(tableStandardArray?.entries)
    ? tableStandardArray.entries.map(entry => Number(entry?.score)).filter(Number.isFinite)
    : [];
  const pointBuyCosts = Array.isArray(tablePointBuy?.entries)
    ? tablePointBuy.entries.reduce((acc, entry) => {
        const score = Number(entry?.score);
        const cost = Number(entry?.cost);
        if (!Number.isFinite(score) || !Number.isFinite(cost)) return acc;
        acc[String(score)] = cost;
        return acc;
      }, {})
    : {};

  const classEntries = getRulesByType(registry, 'class');
  const classIdByName = {};
  const classes = classEntries.map(entry => {
    const data = entry.data || {};
    const name = String(data.name || entry.name || entry.id || '').trim();
    const armorProfs = Array.isArray(data.proficiencies?.armor)
      ? data.proficiencies.armor.join(', ')
      : '';
    const weaponProfs = Array.isArray(data.proficiencies?.weapons)
      ? data.proficiencies.weapons.join(', ')
      : '';
    const skillChoice = data.proficiencies?.skills_choose;
    const skillChoices = skillChoice && Array.isArray(skillChoice.from) && skillChoice.from.length
      ? `Choose ${Number(skillChoice.count) || skillChoice.from.length}: ${skillChoice.from.map(toTitleCase).join(', ')}`
      : '';
    if (name) classIdByName[normalizeName(name)] = entry.id;
    return {
      class_id: entry.id,
      name,
      primary_ability: data.primary_ability || '',
      hit_die: data.hit_die || '',
      saving_throws: Array.isArray(data.saving_throws) ? data.saving_throws.join(', ') : data.saving_throws || '',
      skill_choices: skillChoices,
      armor_proficiencies: armorProfs,
      weapon_proficiencies: weaponProfs,
      starting_equipment_notes: Array.isArray(data.starting_equipment?.notes)
        ? data.starting_equipment.notes.join(' ')
        : '',
    };
  });

  const normalizedClasses = classes.map(entry => ({
    name: entry.name,
    hit_die: entry.hit_die || '',
    armor_proficiencies: entry.armor_proficiencies,
    weapon_proficiencies: entry.weapon_proficiencies,
  }));

  const classNameById = new Map(classes.map(entry => [entry.class_id, entry.name]));
  const classIdByNameNormalized = new Map(classes.map(entry => [normalizeName(entry.name), entry.class_id]));
  const standardArrayByClass = Array.isArray(tableStandardArrayByClass?.entries)
    ? tableStandardArrayByClass.entries.reduce((acc, row) => {
        const name = String(row?.class || '').trim();
        if (!name) return acc;
        acc[name] = {
          str: Number(row.str),
          dex: Number(row.dex),
          con: Number(row.con),
          int: Number(row.int),
          wis: Number(row.wis),
          cha: Number(row.cha),
        };
        return acc;
      }, {})
    : {};
  const standardArrayByClassNormalized = Object.entries(standardArrayByClass).reduce((acc, [name, values]) => {
    acc[normalizeName(name)] = values;
    return acc;
  }, {});
  const standardArrayByClassId = Object.entries(standardArrayByClass).reduce((acc, [name, values]) => {
    const classId = classIdByNameNormalized.get(normalizeName(name));
    if (!classId) return acc;
    acc[classId] = values;
    return acc;
  }, {});

  const subclassEntries = getRulesByType(registry, 'subclass').map(entry => {
    const data = entry.data || {};
    const name = String(data.title || data.name || entry.name || entry.id || '').trim();
    const classId = String(data.parent_class || data.class_id || data.class || '').trim();
    const levels = Array.isArray(data.feature_levels) ? data.feature_levels : [];
    const minLevel = levels.length ? Math.min(...levels.map(value => Number(value)).filter(Number.isFinite)) : 3;
    return {
      id: entry.id,
      name,
      class_id: classId,
      class_name: classNameById.get(classId) || '',
      level_required: Number.isFinite(minLevel) ? minLevel : 3,
      feature_levels: levels,
      features_by_level: data.features_by_level || {},
    };
  });

  const featById = new Map(
    getRulesByType(registry, 'origin_feat').map(entry => [entry.id, getRuleName(entry)])
  );
  const backgroundEntries = getRulesByType(registry, 'background').map(entry => {
    const data = entry.data || {};
    const name = String(data.name || entry.name || entry.id || '').trim();
    const featId = data.origin_feat_ref;
    const featName = featId ? (featById.get(featId) || featId) : '';
    const skills = Array.isArray(data.skill_proficiencies)
      ? data.skill_proficiencies.join(', ')
      : data.skill_proficiencies || '';
    const equipmentOptions = Array.isArray(data.equipment_options) ? data.equipment_options : [];
    const optionA = equipmentOptions.find(opt => String(opt?.option || '').toUpperCase() === 'A') || equipmentOptions[0];
    const optionB = equipmentOptions.find(opt => String(opt?.option || '').toUpperCase() === 'B') || equipmentOptions[1];
    const optionAText = optionA
      ? buildEquipmentDescription(optionA.items || [], optionA.gp)
      : '';
    const optionBText = optionB
      ? buildEquipmentDescription(optionB.items || [], optionB.gp)
      : '';
    return {
      name,
      feat_granted: featName,
      skill_proficiencies: skills,
      starting_equipment_a: optionAText,
      starting_equipment_b: optionBText,
      languages: '',
      language_info: { base: [], count: 0 },
    };
  });

  const speciesEntries = getRulesByType(registry, 'species').map(entry => {
    const data = entry.data || {};
    const name = String(data.name || entry.name || entry.id || '').trim();
    return {
      name,
      species_id: entry.id,
      languages: '',
      language_info: { base: [], count: 0 },
      special_traits: Array.isArray(data.traits)
        ? data.traits.map(trait => trait?.name).filter(Boolean).join(', ')
        : '',
    };
  });

  const lineageTables = [
    { id: 'table.species.elven_lineages', species: 'species.elf' },
    { id: 'table.species.fiendish_legacies', species: 'species.tiefling' },
    { id: 'table.species.gnomish_lineages', species: 'species.gnome' },
    { id: 'table.species.draconic_ancestors', species: 'species.dragonborn' },
  ];
  const lineages = [];
  lineageTables.forEach(tableInfo => {
    const tableEntry = getRulesById(registry, tableInfo.id);
    const tableData = tableEntry?.data;
    if (!tableData || !Array.isArray(tableData.entries)) return;
    tableData.entries.forEach(entry => {
      const name = String(entry.lineage || entry.legacy || entry.ancestry || entry.name || '').trim();
      if (!name) return;
      lineages.push({ name, species_id: tableInfo.species });
    });
  });

  const packsTable = getRulesById(registry, 'table.adventuring_packs');
  const packsById = new Map();
  const adventuringPacks = {};
  if (packsTable?.data?.entries) {
    packsTable.data.entries.forEach(entry => {
      if (entry?.pack_id) packsById.set(entry.pack_id, entry);
      const name = String(entry.pack || '').trim();
      if (!name) return;
      const items = Array.isArray(entry.items) ? entry.items.map(item => parsePackItemName(item)).filter(Boolean) : [];
      adventuringPacks[normalizeName(name)] = { name, items };
    });
  }

  const equipmentOptions = {};
  classEntries.forEach(entry => {
    const data = entry.data || {};
    const name = String(data.name || entry.name || entry.id || '').trim();
    if (!name) return;
    const options = Array.isArray(data.starting_equipment?.options) ? data.starting_equipment.options : [];
    equipmentOptions[normalizeName(name)] = options.map(option => {
      const items = Array.isArray(option.items) ? [...option.items] : [];
      const packName = getPackNameById(option.pack_ref, packsById);
      if (packName) items.push(packName);
      return {
        option: option.option,
        items,
        gp: option.gp,
        description: buildEquipmentDescription(items, option.gp),
      };
    });
  });

  const adventuringGearTable = getRulesById(registry, 'table.adventuring_gear');
  const adventuringGear = Array.isArray(adventuringGearTable?.data?.entries)
    ? adventuringGearTable.data.entries.map(entry => ({
        name: entry.item,
        weight: entry.weight,
        cost: entry.cost,
      }))
    : [];

  const itemEntries = getRulesByType(registry, 'item');
  const armor = itemEntries
    .filter(entry => String(entry.data?.item_type || '').toLowerCase() === 'armor')
    .map(entry => ({
      name: entry.data?.name || entry.name || entry.id,
      ac: entry.data?.armor_class ?? entry.data?.ac ?? '',
      strength: entry.data?.strength ?? '',
      stealth: entry.data?.stealth ?? '',
      weight: entry.data?.weight ?? '',
      cost: entry.data?.cost ?? '',
      category: entry.data?.armor_category ?? entry.data?.category ?? '',
    }));
  const weapons = itemEntries
    .filter(entry => String(entry.data?.item_type || '').toLowerCase() === 'weapon')
    .map(entry => {
      const props = Array.isArray(entry.data?.properties) ? entry.data.properties : [];
      return {
        name: entry.data?.name || entry.name || entry.id,
        category: entry.data?.weapon_category ?? entry.data?.category ?? '',
        damage: entry.data?.damage ?? '',
        mastery: entry.data?.mastery ?? '',
        properties: props.join(', '),
        properties_1: props[0] || '',
        properties_2: props[1] || '',
        properties_3: props[2] || '',
        properties_4: props[3] || '',
      };
    });

  const classProgression = [];
  classEntries.forEach(entry => {
    const data = entry.data || {};
    const tables = Array.isArray(data.tables) ? data.tables : [];
    const tableId = tables.find(id => String(id || '').includes('class_features'));
    if (!tableId) return;
    const tableEntry = getRulesById(registry, tableId);
    const rows = buildClassProgressionFromTable(tableEntry?.data, entry.id);
    classProgression.push(...rows);
  });

  const monsterEntries = [
    ...getRulesByType(registry, 'monster'),
    ...getRulesByType(registry, 'animal'),
  ];
  const creatures = monsterEntries
    .filter(entry => String(entry.data?.creature_type || entry.data?.size_type_alignment || '').toLowerCase().includes('beast'))
    .map(entry => ({
      name: entry.data?.name || entry.name || entry.id,
      type: entry.data?.creature_type || entry.data?.size_type_alignment || '',
      cr: entry.data?.cr || '',
      speed: entry.data?.speed || '',
      ac: entry.data?.armor_class || '',
      hp: entry.data?.hit_points || '',
      actions_text: Array.isArray(entry.data?.actions)
        ? entry.data.actions.map(action => `${action?.name || 'Action'}. ${action?.text || ''}`).join(' ')
        : entry.data?.actions_text || entry.data?.raw_text || '',
    }));

  const languageTable = getRulesById(registry, 'table.languages.core');
  const languageEntries = Array.isArray(languageTable?.data?.entries) ? languageTable.data.entries : [];
  const standardLanguages = languageEntries
    .filter(entry => String(entry.category || '').toLowerCase() === 'standard')
    .map(entry => ({ language: String(entry.language || '').trim() }))
    .filter(entry => entry.language);
  const rareLanguages = languageEntries
    .filter(entry => String(entry.category || '').toLowerCase() === 'rare')
    .map(entry => ({ language: String(entry.language || '').trim() }))
    .filter(entry => entry.language);

  const featureChoices = [];
  const druidEntry = classEntries.find(entry => normalizeName(getRuleName(entry)) === 'druid');
  if (druidEntry?.id) {
    featureChoices.push({
      class_id: druidEntry.id,
      level: 1,
      feature: 'primal_order',
      options: [
        {
          key: 'magician',
          label: 'Magician',
          effects: {
            cantrips_bonus: 1,
            skill_choice: ['Arcana', 'Nature'],
            skill_bonus: 'Add your Wisdom modifier (min +1) to the chosen skill.',
          },
        },
        {
          key: 'warden',
          label: 'Warden',
          effects: {
            armor_training_add: ['medium'],
            weapon_training_add: ['martial'],
          },
        },
      ],
    });
  }

  return {
    classes,
    subclasses: subclassEntries,
    backgrounds: backgroundEntries,
    species: speciesEntries,
    lineages,
    equipmentOptions,
    adventuringPacks,
    normalizedClasses,
    armor,
    weapons,
    adventuringGear,
    classProgression,
    classIdByName,
    creatures,
    standardLanguages,
    rareLanguages,
    featureChoices,
    standardArrayByClass,
    standardArrayByClassNormalized,
    standardArrayByClassId,
    standardArrayGlobal,
    pointBuyCosts,
  };
}

function loadNameSet(filePath, column = 'name') {
  const { rows } = loadCsvRows(filePath);
  const set = new Set();
  for (const row of rows) {
    const name = normalizeName(row[column]);
    if (name) set.add(name);
  }
  return set;
}

function loadNormalizedClasses() {
  if (!fs.existsSync(CLASSES_NORMALIZED_PATH)) return [];
  try {
    const content = fs.readFileSync(CLASSES_NORMALIZED_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.warn('Failed to load normalized classes:', err?.message || err);
    return [];
  }
}

function parseLanguageSource(value) {
  const raw = String(value || '').trim();
  if (!raw) return { base: [], count: 0 };
  const lower = raw.toLowerCase();
  if (lower.includes('choose') || lower.includes('any')) {
    return { base: [], count: 2 };
  }
  const base = raw
    .split(/[,&/]/g)
    .map(part => part.trim())
    .filter(Boolean);
  return { base, count: 0 };
}

const EQUIPMENT_OPTIONS_BY_CLASS = {
  barbarian: ['Greataxe + explorer\'s pack', 'Two handaxes + explorer\'s pack'],
  bard: ['Rapier + diplomat\'s pack + lute', 'Longsword + entertainer\'s pack + flute'],
  cleric: ['Mace + scale mail + shield + priest\'s pack', 'Warhammer + chain mail + shield + priest\'s pack'],
  druid: ['Wooden shield + scimitar + explorer\'s pack', 'Quarterstaff + explorer\'s pack'],
  fighter: ['Chain mail + martial weapon + shield + explorer\'s pack', 'Leather + longbow + 20 arrows + dungeoneer\'s pack'],
  monk: ['Shortsword + dungeoneer\'s pack', 'Simple weapon + explorer\'s pack'],
  paladin: ['Martial weapon + shield + priest\'s pack', 'Two martial weapons + explorer\'s pack'],
  ranger: ['Scale mail + two shortswords + dungeoneer\'s pack', 'Leather + two simple weapons + explorer\'s pack'],
  rogue: ['Rapier + shortbow + 20 arrows + burglar\'s pack', 'Shortsword + shortbow + 20 arrows + burglar\'s pack'],
  sorcerer: ['Light crossbow + 20 bolts + dungeoneer\'s pack', 'Simple weapon + explorer\'s pack'],
  warlock: ['Light crossbow + 20 bolts + scholar\'s pack', 'Simple weapon + dungeoneer\'s pack'],
  wizard: ['Quarterstaff + scholar\'s pack', 'Dagger + scholar\'s pack'],
};

function rollStandardLanguages() {
  const artifact = loadWizardDataArtifact();
  const table =
    (artifact?.standardLanguages || [])
      .map(r => ({
        min: Number(r.roll_min),
        max: Number(r.roll_max),
        language: String(r.language || '').trim(),
      }))
      .filter(r => Number.isFinite(r.min) && Number.isFinite(r.max) && r.language);
  const picks = [];
  const seen = new Set();
  let safety = 0;
  while (picks.length < 2 && safety < 20) {
    safety += 1;
    const roll = Math.floor(Math.random() * 12) + 1;
    const row = table.find(r => roll >= r.min && roll <= r.max);
    if (!row) continue;
    const key = row.language.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push({ roll, language: row.language });
  }
  return picks;
}

function loadCsvIndex(csvPath, idColumn) {
  if (!fs.existsSync(csvPath)) {
    return { header: [], nameSet: new Set(), idSet: new Set() };
  }
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length);
  if (!lines.length) return { header: [], nameSet: new Set(), idSet: new Set() };
  const header = parseCsvLine(lines[0]);
  const nameIndex = header.indexOf('name');
  const idIndex = idColumn ? header.indexOf(idColumn) : -1;
  const nameSet = new Set();
  const idSet = new Set();
  for (const line of lines.slice(1)) {
    const row = parseCsvLine(line);
    if (nameIndex >= 0 && row[nameIndex]) nameSet.add(row[nameIndex].trim().toLowerCase());
    if (idIndex >= 0 && row[idIndex]) idSet.add(row[idIndex].trim().toUpperCase());
  }
  return { header, nameSet, idSet };
}

function loadSubclassKeySet(csvPath) {
  if (!fs.existsSync(csvPath)) return new Set();
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length);
  if (!lines.length) return new Set();
  const header = parseCsvLine(lines[0]);
  const nameIndex = header.indexOf('name');
  const classIndex = header.indexOf('class_id');
  const set = new Set();
  if (nameIndex < 0 || classIndex < 0) return set;
  for (const line of lines.slice(1)) {
    const row = parseCsvLine(line);
    const name = row[nameIndex] || '';
    const classId = row[classIndex] || '';
    if (!name || !classId) continue;
    set.add(`${classId}|${name}`.toLowerCase());
  }
  return set;
}

function makeSpellId(name) {
  const slug = String(name || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return slug ? `SPL_${slug}` : '';
}

function parseSpellBlock(raw) {
  const lines = String(raw || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  let name = '';
  let levelText = '';
  let concentration = lines.some(line => line.toLowerCase() === 'concentration');

  if (lines[0].toLowerCase() === 'cantrip' && lines[1]) {
    levelText = 'Cantrip';
    name = lines[1];
  }

  const levelField = extractField(lines, 'Level');
  if (levelField) levelText = levelField;

  if (!name) {
    const labelSet = new Set([
      'level',
      'casting time',
      'range/area',
      'range',
      'components',
      'duration',
      'school',
      'attack/save',
      'damage/effect',
      'tags',
      'available for',
    ]);
    name = lines.find(line => !labelSet.has(stripLabel(line)) && line.toLowerCase() !== 'cantrip' && line.toLowerCase() !== 'concentration') || '';
  }

  const castingTime = extractField(lines, 'Casting Time');
  const range = extractField(lines, 'Range/Area') || extractField(lines, 'Range');
  let components = extractField(lines, 'Components');
  const duration = extractField(lines, 'Duration');
  let school = extractField(lines, 'School');
  const attackSave = extractField(lines, 'Attack/Save');
  const damageEffect = extractField(lines, 'Damage/Effect');

  if (duration.toLowerCase().includes('concentration')) concentration = true;

  if (!components) {
    const bullet = lines.find(line => line.includes('•'));
    if (bullet) {
      const parts = bullet.split('•').map(part => part.trim());
      if (!school && parts[0]) school = parts[0];
      if (parts[1]) components = parts[1];
    }
  }

  const levelLower = levelText.toLowerCase();
  const cantrip = levelLower.includes('cantrip') ? 'Yes' : 'No';
  const level = cantrip === 'Yes' ? 0 : Number.parseInt(levelText, 10);
  const levelValue = Number.isFinite(level) ? level : '';

  const compUpper = components.toUpperCase();
  const verbal = compUpper.includes('V') ? 'Yes' : 'No';
  const somatic = compUpper.includes('S') ? 'Yes' : 'No';
  const material = compUpper.includes('M') ? 'Yes' : 'No';
  const ritual = lines.some(line => line.toLowerCase().includes('ritual')) ? 'Yes' : 'No';

  const labelIndices = [
    findLabelIndex(lines, 'Level'),
    findLabelIndex(lines, 'Casting Time'),
    findLabelIndex(lines, 'Range/Area'),
    findLabelIndex(lines, 'Range'),
    findLabelIndex(lines, 'Components'),
    findLabelIndex(lines, 'Duration'),
    findLabelIndex(lines, 'School'),
    findLabelIndex(lines, 'Attack/Save'),
    findLabelIndex(lines, 'Damage/Effect'),
  ].filter(idx => idx >= 0);
  const lastLabel = labelIndices.length ? Math.max(...labelIndices) : -1;
  const stopIndex = [findLabelIndex(lines, 'Tags'), findLabelIndex(lines, 'Available For')]
    .filter(idx => idx >= 0)
    .sort((a, b) => a - b)[0];
  const descStart = lastLabel >= 0 ? lastLabel + 2 : 0;
  const descEnd = stopIndex >= 0 ? stopIndex : lines.length;
  const description = lines.slice(descStart, descEnd).join(' ').trim();

  const sourceLine = [...lines].reverse().find(line =>
    /(handbook|guide|manual|compendium|sourcebook|core rulebook)/i.test(line)
  );

  return {
    spell_id: makeSpellId(name),
    name,
    level: levelValue,
    cantrip,
    school,
    casting_time: castingTime,
    range,
    components,
    verbal,
    somatic,
    material,
    duration,
    concentration: concentration ? 'Yes' : 'No',
    ritual,
    attack_save: attackSave,
    damage_type: damageEffect,
    short_effect: description || damageEffect,
    source: sourceLine || '',
    version: '',
  };
}

function parseSpellsFromText(text) {
  const chunks = String(text || '')
    .split(/View Details Page/i)
    .map(chunk => chunk.trim())
    .filter(Boolean);
  return chunks.map(parseSpellBlock).filter(Boolean);
}

function makeFeatId(name) {
  const slug = String(name || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return slug ? `FEAT_${slug}` : '';
}

function parseFeatBlock(raw) {
  const lines = String(raw || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const name = lines[0] || '';
  if (name.toLowerCase().startsWith('tags')) return null;
  const source = lines[1] || '';
  const benefitSummary = lines.find(line => line.includes('+')) || '';
  const typeLine = lines.find(line => /feat/i.test(line) && /prerequisite/i.test(line));
  const type = lines.find(line => /general|origin|epic|fighting/i.test(line)) || '';
  let prerequisites = '';
  let levelRequirement = '';
  if (typeLine) {
    const match = typeLine.match(/\(([^)]+)\)/);
    if (match) {
      prerequisites = match[1].trim();
      const levelMatch = prerequisites.match(/Level\s*([0-9]+)\+?/i);
      if (levelMatch) levelRequirement = levelMatch[1];
    }
  }

  const tagsIndex = findLabelIndex(lines, 'Tags');
  const tags = tagsIndex >= 0 ? lines.slice(tagsIndex + 1) : [];
  const tagText = tags.join('; ');

  const benefitStartIndex = lines.findIndex(line => /you gain the following benefits/i.test(line));
  const descriptionStart = benefitStartIndex >= 0 ? benefitStartIndex + 1 : 0;
  const descriptionEnd = tagsIndex >= 0 ? tagsIndex : lines.length;
  const description = lines.slice(descriptionStart, descriptionEnd).join(' ').trim();

  return {
    feat_id: makeFeatId(name),
    name,
    prerequisites,
    type: type.replace(/Feat/i, '').trim() || type,
    level_requirement: levelRequirement,
    benefit_summary: benefitSummary,
    description,
    tags: tagText,
    source,
    version: '',
  };
}

function parseFeatsFromText(text) {
  const chunks = String(text || '')
    .split(/View Details Page/i)
    .map(chunk => chunk.trim())
    .filter(Boolean);
  return chunks.map(parseFeatBlock).filter(Boolean);
}

function makeClassId(name) {
  const slug = String(name || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return slug ? `CLS_${slug}` : '';
}

function parseTraitLines(lines, startIndex) {
  const traits = {};
  let endIndex = startIndex;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) {
      endIndex = i;
      break;
    }
    if (/^Barbarians?\s|^Becoming\s|^Level\s|^.+\s+Features$/i.test(line)) {
      endIndex = i - 1;
      break;
    }
    const parts = line.split(/\t+/).filter(Boolean);
    if (parts.length < 2) {
      const spaced = line.split(/\s{2,}/).filter(Boolean);
      if (spaced.length >= 2) {
        traits[spaced[0]] = spaced.slice(1).join(' ').trim();
        endIndex = i;
      }
      continue;
    }
    traits[parts[0]] = parts.slice(1).join(' ').trim();
    endIndex = i;
  }
  return { traits, endIndex };
}

function sliceSection(lines, startLabel, endLabels) {
  const start = findLabelIndex(lines, startLabel);
  if (start < 0) return '';
  const end = endLabels
    .map(label => findLabelIndex(lines, label))
    .filter(idx => idx >= 0)
    .sort((a, b) => a - b)[0];
  const sliceEnd = typeof end === 'number' ? end : lines.length;
  return lines.slice(start + 1, sliceEnd).join('\n').trim();
}

function parseClassBlock(raw) {
  const lines = String(raw || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const detailLine = lines.find(line => /class details/i.test(line));
  const name =
    (detailLine ? detailLine.replace(/class details/i, '').trim() : '') ||
    lines[0];
  if (!name) return null;

  const coreIndex = lines.findIndex(line => /core .* traits/i.test(line));
  const traitResult = coreIndex >= 0 ? parseTraitLines(lines, coreIndex) : { traits: {}, endIndex: coreIndex };
  const traits = traitResult.traits || {};

  const descStart = coreIndex >= 0 ? traitResult.endIndex + 1 : 0;
  const descEnd = lines.findIndex(line =>
    /^Becoming\s|^As a Multiclass Character$|^.+\s+Features$|^.+\s+Class Features$|^.+\s+Subclasses$/i.test(line)
  );
  const description = lines
    .slice(descStart, descEnd >= 0 ? descEnd : lines.length)
    .join('\n')
    .trim();

  const featuresTable = sliceSection(lines, `${name} Features`, [
    `${name} Class Features`,
    'Class Features',
    `${name} Subclasses`,
    'Subclasses',
  ]);
  const classFeatures = sliceSection(lines, `${name} Class Features`, [
    `${name} Subclasses`,
    'Subclasses',
  ]);
  let subclasses = sliceSection(lines, `${name} Subclasses`, []);
  if (!subclasses) subclasses = sliceSection(lines, 'Subclasses', []);
  const subclassEntries = subclasses
    ? parseSubclassesFromSection(subclasses, name)
    : [];
  const multiclassing = sliceSection(lines, 'As a Multiclass Character', [
    `${name} Features`,
    `${name} Class Features`,
    'Class Features',
  ]);

  const primaryAbility = traits['Primary Ability'] || '';
  const hitDie = traits['Hit Point Die'] || '';
  const savingThrows = traits['Saving Throw Proficiencies'] || '';
  const skillChoices = traits['Skill Proficiencies'] || '';
  const weaponProficiencies = traits['Weapon Proficiencies'] || '';
  const armorTraining = traits['Armor Training'] || traits['Armor Proficiencies'] || '';
  const toolProficiencies = traits['Tool Proficiencies'] || '';
  const startingEquipment = traits['Starting Equipment'] || '';

  const spellcasting = /spellcasting|spells/i.test(raw) ? 'Yes' : 'No';

  return {
    class_id: makeClassId(name),
    name,
    primary_ability: primaryAbility,
    hit_die: hitDie,
    armor_proficiencies: armorTraining,
    weapon_proficiencies: weaponProficiencies,
    tool_proficiencies: toolProficiencies,
    saving_throws: savingThrows,
    skill_choices: skillChoices,
    starting_equipment_notes: startingEquipment,
    spellcasting,
    description,
    core_traits: JSON.stringify(traits),
    features_table: featuresTable,
    class_features: classFeatures,
    multiclassing,
    subclasses,
    subclass_entries: subclassEntries,
    source: '',
    version: '',
  };
}

function parseClassesFromText(text) {
  const blocks = String(text || '')
    .split(/(?=^[^\n]*Class Details)/gim)
    .map(chunk => chunk.trim())
    .filter(Boolean);
  if (!blocks.length) return [];
  return blocks.map(parseClassBlock).filter(Boolean);
}

function makeSubclassId(className, subclassName) {
  const classSlug = String(className || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  const subSlug = String(subclassName || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  if (!classSlug || !subSlug) return '';
  return `SUB_${classSlug}_${subSlug}`;
}

function extractSubclassBlocks(sectionText) {
  const lines = String(sectionText || '')
    .split(/\r?\n/)
    .map(line => line.trim());
  const blocks = [];
  let current = null;

  const isHeading = (line, nextLine) => {
    if (!line) return false;
    if (line.includes(':')) return false;
    if (line.length > 80) return false;
    const lower = line.toLowerCase();
    if (lower.includes('subclasses')) return false;
    if (!nextLine || nextLine.startsWith('Level')) return false;
    if (nextLine.length > 90) return false;
    return true;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    if (isHeading(line, nextLine)) {
      if (current) blocks.push(current);
      current = { name: line, tagline: nextLine, lines: [] };
      i += 1;
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) blocks.push(current);
  return blocks;
}

function parseSubclassesFromSection(sectionText, className) {
  const blocks = extractSubclassBlocks(sectionText);
  return blocks.map(block => {
    const body = block.lines.filter(Boolean).join(' ').trim();
    const levelMatch = body.match(/Level\s+(\d+)/i);
    const levelGained = levelMatch ? levelMatch[1] : '3';
    const summary = block.tagline || body.split('. ')[0] || '';
    return {
      subclass_id: makeSubclassId(className, block.name),
      class_id: makeClassId(className),
      name: block.name,
      level_gained: levelGained,
      summary,
      source: '',
      version: '',
    };
  });
}

function detectType(text) {
  const lower = String(text || '').toLowerCase();
  if (
    lower.includes('casting time') &&
    lower.includes('range/area') &&
    lower.includes('components') &&
    lower.includes('duration')
  ) {
    return 'spells';
  }
  if (lower.includes('feat') && lower.includes('prerequisite')) {
    return 'feats';
  }
  if (lower.includes('class details') && lower.includes('core') && lower.includes('traits')) {
    return 'classes';
  }
  return '';
}

async function exchangeCodeForToken(code, redirectOverride = null) {
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID || '',
    client_secret: DISCORD_CLIENT_SECRET || '',
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectOverride || DISCORD_OAUTH_REDIRECT,
  });
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) {
    throw new Error(`Discord token exchange failed (${response.status})`);
  }
  return response.json();
}

async function fetchDiscordJson(url, token, tokenType = 'Bearer') {
  const response = await fetch(url, {
    headers: { Authorization: `${tokenType} ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Discord API request failed (${response.status})`);
  }
  return response.json();
}

const app = express();
if (ADMIN_COOKIE_SECURE) {
  app.set('trust proxy', 1);
}
if (ADMIN_SESSION_STORE === 'memory' && process.env.NODE_ENV === 'production') {
  console.warn('ADMIN_SESSION_STORE is memory in production. Consider ADMIN_SESSION_STORE=file.');
}

if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SESSION_SECRET) {
  throw new Error('ADMIN_SESSION_SECRET must be set in production.');
}
const sessionSecret = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.ADMIN_SESSION_SECRET) {
  console.warn('ADMIN_SESSION_SECRET not set; using a random value for this session.');
}

app.use(
  session({
    store: ADMIN_SESSION_STORE === 'file' ? createFileSessionStore(session) : undefined,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: 'lax',
      httpOnly: true,
      secure: ADMIN_COOKIE_SECURE,
      maxAge: ADMIN_SESSION_TTL_MS,
    },
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', ADMIN_CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    if (ADMIN_CORS_ORIGIN_SET.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, X-CSRF-Token, Authorization'
      );
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
    } else if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      res.status(403).json({ error: 'cors' });
      return;
    }
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

function createRateLimiter({ windowMs, max }) {
  const bucket = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const entry = bucket.get(key) || [];
    const cutoff = now - windowMs;
    const recent = entry.filter(ts => ts > cutoff);
    recent.push(now);
    bucket.set(key, recent);
    if (recent.length > max) {
      res.status(429).json({ error: 'rate-limit' });
      return;
    }
    next();
  };
}

const apiLimiter = createRateLimiter({
  windowMs: ADMIN_RATE_LIMIT_WINDOW_MS,
  max: ADMIN_RATE_LIMIT_MAX,
});
const authLimiter = createRateLimiter({
  windowMs: ADMIN_RATE_LIMIT_WINDOW_MS,
  max: ADMIN_AUTH_RATE_LIMIT_MAX,
});

app.use('/api', apiLimiter);
app.use('/auth', authLimiter);

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    const entry = {
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      ms: Number(elapsedMs.toFixed(2)),
    };
    logger.info('request', entry);
  });
  next();
});

app.use((req, res, next) => {
  if (!ADMIN_GZIP_ENABLED) return next();
  const accept = String(req.headers['accept-encoding'] || '');
  if (!accept.includes('gzip')) return next();
  if (/\.(css|js|png|jpg|jpeg|svg|webp|ico)$/.test(req.path)) return next();

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  const chunks = [];

  res.write = (chunk, encoding, cb) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    if (typeof cb === 'function') cb();
    return true;
  };

  res.end = (chunk, encoding, cb) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    const body = Buffer.concat(chunks);
    const type = String(res.getHeader('Content-Type') || '');
    const compressible = /(text|json|javascript|css|svg)/i.test(type);
    if (!compressible || body.length < ADMIN_GZIP_MIN_BYTES) {
      res.setHeader('Content-Length', body.length);
      return originalEnd(body, cb);
    }
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('Content-Encoding', 'gzip');
    zlib.gzip(body, (err, gzipped) => {
      if (err) {
        res.removeHeader('Content-Encoding');
        res.setHeader('Content-Length', body.length);
        return originalEnd(body, cb);
      }
      res.setHeader('Content-Length', gzipped.length);
      return originalEnd(gzipped, cb);
    });
    return undefined;
  };

  next();
});

function getCookieValue(req, name) {
  const raw = req.headers?.cookie || '';
  const parts = raw.split(';').map(part => part.trim());
  for (const part of parts) {
    if (!part) continue;
    const [key, ...rest] = part.split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  if (options.secure) parts.push('Secure');
  if (options.httpOnly) parts.push('HttpOnly');
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  res.append('Set-Cookie', parts.join('; '));
}

function ensureCsrfToken(req, res) {
  if (!req.session) return null;
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  const existing = getCookieValue(req, 'csrf_token');
  if (existing !== req.session.csrfToken) {
    setCookie(res, 'csrf_token', req.session.csrfToken, {
      sameSite: 'Lax',
      secure: ADMIN_COOKIE_SECURE,
      httpOnly: false,
    });
  }
  return req.session.csrfToken;
}

app.use((req, res, next) => {
  if (req.session?.user?.authorized && ADMIN_SESSION_IDLE_MS > 0) {
    const now = Date.now();
    const last = Number(req.session.lastActive || 0);
    if (last && now - last > ADMIN_SESSION_IDLE_MS) {
      req.session.destroy(() => {});
      const acceptsHtml = String(req.headers.accept || '').includes('text/html');
      if (acceptsHtml || req.path.endsWith('.html')) {
        res.redirect('/');
      } else {
        res.status(401).json({ error: 'session-idle-timeout' });
      }
      return;
    }
    req.session.lastActive = now;
  }
  next();
});

app.use((req, res, next) => {
  if (!ADMIN_CSRF_ENABLED) return next();
  ensureCsrfToken(req, res);
  const safeMethod = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  if (safeMethod) return next();
  const token = req.get('x-csrf-token') || '';
  if (!req.session?.csrfToken || token !== req.session.csrfToken) {
    res.status(403).json({ error: 'csrf' });
    return;
  }
  next();
});

const ADMIN_PAGES = new Set([
  '/admin.html',
  '/dashboard.html',
  '/npcs.html',
  '/features.html',
  '/commands.html',
  '/datasets.html',
  '/homebrew.html',
  '/paste.html',
]);

app.use((req, res, next) => {
  if (ADMIN_PAGES.has(req.path) && !req.session?.user?.authorized) {
    res.redirect('/');
    return;
  }
  next();
});

app.get('*.html', (req, res, next) => {
  const safePath = `.${req.path}`;
  const filePath = path.resolve(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    return next();
  }
  if (!fs.existsSync(filePath)) {
    return next();
  }
  const html = fs
    .readFileSync(filePath, 'utf8')
    .replace(/\/styles\.css(\?v=[^"]*)?/g, `/styles.css?v=${BUILD_ID}`);
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(html);
});

app.use(express.static(PUBLIC_DIR, {
  setHeaders: (res, filePath) => {
    if (/\.(css|js|png|jpg|jpeg|svg|webp|ico)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.max(1, ADMIN_UPLOAD_MAX_MB) * 1024 * 1024 },
});

async function assertAdminRole(req, res) {
  if (!ADMIN_ROLE_IDS.length) return { ok: true };
  const guildId = getSelectedGuildId(req);
  if (!guildId) {
    res.status(400).json({ error: 'guild-id-missing' });
    return null;
  }
  if (!DISCORD_BOT_TOKEN) {
    res.status(500).json({ error: 'bot-token-missing' });
    return null;
  }
  const member = await fetchDiscordJson(
    `https://discord.com/api/guilds/${guildId}/members/${req.session.user.id}`,
    DISCORD_BOT_TOKEN,
    'Bot'
  );
  const memberRoles = Array.isArray(member?.roles) ? member.roles : [];
  const hasRole = ADMIN_ROLE_IDS.some(roleId => memberRoles.includes(roleId));
  if (!hasRole) {
    res.status(403).json({ error: 'not-admin' });
    return null;
  }
  return { ok: true };
}

async function requireAuth(req, res, next) {
  if (!req.session?.user?.authorized) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const ok = await assertAdminRole(req, res);
  if (!ok) return;
  next();
}

function requirePlayerAuth(req, res, next) {
  ensurePlayerSessionFromAdmin(req);
  if (!req.session?.player?.authorized) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

function cleanupOnlinePlayers() {
  const cutoff = Date.now() - ONLINE_PLAYER_TTL_MS;
  for (const [id, data] of onlinePlayers.entries()) {
    if (data.lastSeen < cutoff) onlinePlayers.delete(id);
  }
}

function ensurePlayerSessionFromAdmin(req) {
  if (req.session?.player?.authorized) return;
  if (!req.session?.user?.authorized) return;
  const user = req.session.user;
  req.session.player = {
    authorized: true,
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    guildId: user.guildId || null,
    guilds: Array.isArray(user.guilds) ? user.guilds : [],
  };
}

function getSelectedGuildId(req) {
  return req.session?.user?.guildId || ADMIN_GUILD_ID || null;
}

function getSelectedPlayerGuildId(req) {
  return req.session?.player?.guildId || null;
}

async function assertPlayerRole(req, res) {
  ensurePlayerSessionFromAdmin(req);
  const guildId = getSelectedPlayerGuildId(req);
  if (!guildId) {
    res.status(400).json({ error: 'guild-id-missing' });
    return null;
  }
  if (!DISCORD_BOT_TOKEN) {
    res.status(500).json({ error: 'bot-token-missing' });
    return null;
  }
  const roles = await fetchDiscordJson(
    `https://discord.com/api/guilds/${guildId}/roles`,
    DISCORD_BOT_TOKEN,
    'Bot'
  );
  const roleList = Array.isArray(roles) ? roles : [];
  const playerRole = roleList.find(role => role?.name?.toLowerCase() === PLAYER_ROLE_NAME);
  if (!playerRole) {
    res.status(403).json({ error: 'player-role-missing' });
    return null;
  }
  const member = await fetchDiscordJson(
    `https://discord.com/api/guilds/${guildId}/members/${req.session.player.id}`,
    DISCORD_BOT_TOKEN,
    'Bot'
  );
  const memberRoles = Array.isArray(member?.roles) ? member.roles : [];
  if (!memberRoles.includes(playerRole.id)) {
    res.status(403).json({ error: 'not-player' });
    return null;
  }
  return { guildId };
}

app.get('/api/me', (req, res) => {
  if (!req.session?.user?.authorized) {
    res.json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, user: req.session.user });
});

app.get('/api/guilds', requireAuth, (req, res) => {
  const guilds = Array.isArray(req.session?.user?.guilds) ? req.session.user.guilds : [];
  res.json({
    guilds,
    selectedGuildId: req.session?.user?.guildId || null,
  });
});

app.post('/api/select-guild', requireAuth, (req, res) => {
  const guildId = String(req.body.guildId || '').trim();
  const guilds = Array.isArray(req.session?.user?.guilds) ? req.session.user.guilds : [];
  const match = guilds.find(guild => guild.id === guildId);
  if (!match) {
    res.status(400).json({ error: 'guild-not-found' });
    return;
  }
  req.session.user.guildId = match.id;
  res.json({ ok: true, guildId: match.id });
});

app.get('/api/command-manifest', requireAuth, (req, res) => {
  res.json(COMMAND_MANIFEST);
});

app.get('/api/combat/state', requireAuth, (req, res) => {
  const payload = loadJsonSafe(COMBAT_STATE_PATH, { active: false, updatedAt: null });
  res.json(payload);
});

app.get('/api/loot', requireAuth, (req, res) => {
  const payload = loadJsonSafe(LOOT_STATE_PATH, { items: [], updatedAt: null });
  res.json(payload);
});

app.get('/api/npcs', requireAuth, (req, res) => {
  const personas = appDb.getJson('npc_personas', {});
  const list = Object.entries(personas).map(([id, persona]) => ({
    id,
    name: persona?.name || 'Unknown',
    role: persona?.role || '',
    personality: persona?.personality || '',
    motive: persona?.motive || '',
    voice: persona?.voice || '',
    quirk: persona?.quirk || '',
    appearance: persona?.appearance || '',
    updatedAt: persona?.updatedAt || null,
  }));
  list.sort((a, b) => {
    const at = Date.parse(a.updatedAt || '') || 0;
    const bt = Date.parse(b.updatedAt || '') || 0;
    return bt - at;
  });
  res.json({ npcs: list });
});

app.get('/api/npcs/:id', requireAuth, (req, res) => {
  const personas = appDb.getJson('npc_personas', {});
  const npc = personas?.[String(req.params.id)] || null;
  if (!npc) {
    res.status(404).json({ error: 'not-found' });
    return;
  }
  res.json({ id: String(req.params.id), ...npc });
});


app.get('/api/config', requireAuth, (req, res) => {
  res.json(loadConfig());
});

app.put('/api/config', requireAuth, (req, res) => {
  const nextConfig = normalizeConfig(req.body);
  saveConfig(nextConfig);
  res.json({ ok: true, config: nextConfig });
});

app.get('/api/datasets', requireAuth, (req, res) => {
  res.json({ files: listDatasetFiles() });
});

app.post('/api/paste-import', requireAuth, (req, res) => {
  const config = loadConfig();
  if (!config.features.enableUploads) {
    res.status(403).json({ error: 'imports-disabled' });
    return;
  }
  const typeInput = String(req.body.type || '').trim().toLowerCase();
  const text = String(req.body.text || '').trim();
  if (!text) {
    res.status(400).json({ error: 'missing-text' });
    return;
  }
  const resolvedType = typeInput === 'auto' ? detectType(text) : typeInput;
  if (resolvedType !== 'spells' && resolvedType !== 'feats' && resolvedType !== 'classes') {
    res.status(400).json({ error: 'unsupported-type', type: resolvedType || 'unknown' });
    return;
  }

  const csvPath =
    resolvedType === 'spells'
      ? path.join(DATASET_DIR, 'spells.csv')
      : resolvedType === 'feats'
        ? path.join(DATASET_DIR, 'feats.csv')
        : path.join(DATASET_DIR, 'classes.csv');
  if (!fs.existsSync(csvPath)) {
    res.status(500).json({ error: 'missing-csv', path: csvPath });
    return;
  }

  const idColumn =
    resolvedType === 'spells' ? 'spell_id' : resolvedType === 'feats' ? 'feat_id' : 'class_id';
  const { header, nameSet, idSet } = loadCsvIndex(csvPath, idColumn);
  const incoming =
    resolvedType === 'spells'
      ? parseSpellsFromText(text)
      : resolvedType === 'feats'
        ? parseFeatsFromText(text)
        : parseClassesFromText(text);
  const added = [];
  const duplicates = [];
  const errors = [];

  for (const spell of incoming) {
    if (!spell?.name) {
      errors.push({ reason: 'missing-name', raw: spell });
      continue;
    }
    const nameKey = spell.name.trim().toLowerCase();
    if (nameSet.has(nameKey) || (spell.spell_id && idSet.has(spell.spell_id))) {
      duplicates.push(spell.name);
      continue;
    }
    nameSet.add(nameKey);
    if (spell.spell_id) idSet.add(spell.spell_id);
    added.push(spell);
  }

  if (added.length) {
    const rows = added.map(spell =>
      header.map(col => {
        const value = spell[col] ?? '';
        return csvEscape(value);
      })
    );
    const payload = rows.map(row => row.join(',')).join('\n');
    fs.appendFileSync(csvPath, `\n${payload}`, 'utf8');
  }

  if (resolvedType === 'classes') {
    const subclassCsv = path.join(DATASET_DIR, 'subclasses.csv');
    if (fs.existsSync(subclassCsv)) {
      const { header: subHeader, nameSet: subNameSet, idSet: subIdSet } = loadCsvIndex(
        subclassCsv,
        'subclass_id'
      );
      const existingByClass = loadSubclassKeySet(subclassCsv);
      const subclassRows = [];
      for (const entry of added) {
        const subclasses = entry.subclass_entries || [];
        for (const subclass of subclasses) {
          const nameKey = `${subclass.class_id}|${subclass.name}`.toLowerCase();
          if (subIdSet.has(subclass.subclass_id) || existingByClass.has(nameKey)) continue;
          existingByClass.add(nameKey);
          if (subclass.subclass_id) subIdSet.add(subclass.subclass_id);
          subclassRows.push(subclass);
        }
      }
      if (subclassRows.length) {
        const payload = subclassRows
          .map(row =>
            subHeader.map(col => {
              const value = row[col] ?? '';
              return csvEscape(value);
            })
          )
          .map(cols => cols.join(','))
          .join('\n');
        fs.appendFileSync(subclassCsv, `\n${payload}`, 'utf8');
      }
    }
  }

  res.json({
    ok: true,
    type: resolvedType,
    added: added.map(spell => spell.name),
    duplicates,
    errors,
  });
});

app.get('/api/roles', requireAuth, async (req, res) => {
  const guildId = getSelectedGuildId(req);
  if (!guildId) {
    res.status(500).json({ error: 'guild-id-missing' });
    return;
  }
  if (!DISCORD_BOT_TOKEN) {
    res.status(500).json({ error: 'bot-token-missing' });
    return;
  }
  try {
    const roles = await fetchDiscordJson(
      `https://discord.com/api/guilds/${guildId}/roles`,
      DISCORD_BOT_TOKEN,
      'Bot'
    );
    const cleaned = Array.isArray(roles)
      ? roles
          .filter(role => role && role.id !== guildId)
          .map(role => ({
            id: role.id,
            name: role.name,
            color: role.color,
            position: role.position,
          }))
          .sort((a, b) => b.position - a.position)
      : [];
    res.json(cleaned);
  } catch (err) {
    console.error('Role fetch failed:', err);
    res.status(500).json({ error: 'role-fetch-failed' });
  }
});

app.post('/api/uploads/dataset', requireAuth, upload.single('file'), (req, res) => {
  const config = loadConfig();
  if (!config.features.enableUploads) {
    res.status(403).json({ error: 'uploads-disabled' });
    return;
  }
  const target = String(req.body.target || '').trim();
  if (!target || !req.file) {
    res.status(400).json({ error: 'missing-file' });
    return;
  }
  const files = listDatasetFiles();
  if (!files.includes(target)) {
    res.status(400).json({ error: 'unknown-target' });
    return;
  }
  const safeName = path.basename(target);
  ensureDir(DATASET_DIR);
  fs.writeFileSync(path.join(DATASET_DIR, safeName), req.file.buffer);
  res.json({ ok: true, file: safeName });
});

app.post('/api/uploads/homebrew', requireAuth, upload.single('file'), (req, res) => {
  const config = loadConfig();
  if (!config.features.enableUploads || !config.features.enableHomebrew) {
    res.status(403).json({ error: 'uploads-disabled' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'missing-file' });
    return;
  }
  const original = req.file.originalname || 'homebrew.txt';
  const safeName = path.basename(original).replace(/[^a-zA-Z0-9._-]/g, '_');
  ensureDir(HOMEBREW_DIR);
  const filePath = path.join(HOMEBREW_DIR, safeName);
  fs.writeFileSync(filePath, req.file.buffer);
  res.json({ ok: true, file: safeName });
});

app.get('/auth/discord', (req, res) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    res.status(500).send('Discord OAuth is not configured.');
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_OAUTH_REDIRECT,
    response_type: 'code',
    scope: DISCORD_OAUTH_SCOPES_ADMIN,
    state,
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

app.get('/auth/discord/player', (req, res) => {
  res.redirect('/auth/discord');
});

app.get('/auth/discord/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!code || !state || state !== req.session.oauthState) {
      res.status(400).send('Invalid OAuth state.');
      return;
    }
    const token = await exchangeCodeForToken(code);
    const user = await fetchDiscordJson('https://discord.com/api/users/@me', token.access_token);
    const guilds = await fetchDiscordJson('https://discord.com/api/users/@me/guilds', token.access_token);
    const manageableGuilds = Array.isArray(guilds)
      ? guilds.filter(canManageGuild).map(guild => ({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          owner: guild.owner,
          permissions: guild.permissions,
        }))
      : [];
    const visibleGuilds = Array.isArray(guilds)
      ? guilds.map(guild => ({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          owner: guild.owner,
          permissions: guild.permissions,
        }))
      : [];
    const preferredGuild = ADMIN_GUILD_ID
      ? manageableGuilds.find(guild => guild.id === ADMIN_GUILD_ID)
      : null;
    await new Promise((resolve, reject) => {
      req.session.regenerate(err => (err ? reject(err) : resolve()));
    });
    if (manageableGuilds.length) {
      req.session.user = {
        authorized: true,
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        guildId: preferredGuild ? preferredGuild.id : null,
        guilds: manageableGuilds,
      };
    }
    req.session.player = {
      authorized: true,
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      guildId: preferredGuild ? preferredGuild.id : null,
      guilds: visibleGuilds,
    };
    res.redirect(manageableGuilds.length ? '/' : '/player.html');
  } catch (err) {
    console.error('OAuth error:', err);
    res.status(500).send('OAuth failed.');
  }
});

app.get('/auth/discord/player/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!code || !state || state !== req.session.playerState) {
      res.status(400).send('Invalid OAuth state.');
      return;
    }
    const token = await exchangeCodeForToken(code, DISCORD_OAUTH_REDIRECT_PLAYER);
    const user = await fetchDiscordJson('https://discord.com/api/users/@me', token.access_token);
    const guilds = await fetchDiscordJson('https://discord.com/api/users/@me/guilds', token.access_token);
    const visibleGuilds = Array.isArray(guilds)
      ? guilds.map(guild => ({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          owner: guild.owner,
          permissions: guild.permissions,
        }))
      : [];
    await new Promise((resolve, reject) => {
      req.session.regenerate(err => (err ? reject(err) : resolve()));
    });
    req.session.player = {
      authorized: true,
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      guildId: null,
      guilds: visibleGuilds,
    };
    res.redirect('/player.html');
  } catch (err) {
    console.error('Player OAuth error:', err);
    res.status(500).send('OAuth failed.');
  }
});

app.get('/api/player/me', (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  if (!req.session?.player?.authorized) {
    res.json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, user: req.session.player });
});

app.get('/api/player/guilds', requirePlayerAuth, (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  const guilds = Array.isArray(req.session?.player?.guilds) ? req.session.player.guilds : [];
  res.json({
    guilds,
    selectedGuildId: req.session?.player?.guildId || null,
  });
});

app.post('/api/player/select-guild', requirePlayerAuth, (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  const guildId = String(req.body.guildId || '').trim();
  const guilds = Array.isArray(req.session?.player?.guilds) ? req.session.player.guilds : [];
  const match = guilds.find(guild => guild.id === guildId);
  if (!match) {
    res.status(400).json({ error: 'guild-not-found' });
    return;
  }
  req.session.player.guildId = match.id;
  res.json({ ok: true, guildId: match.id });
});

app.get('/api/player/profile', requirePlayerAuth, async (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const roleCheck = await assertPlayerRole(req, res);
    if (!roleCheck) return;
    const profiles = loadProfiles();
    const profile = profiles?.[req.session.player.id] || null;
    res.json({ profile });
  } catch (err) {
    console.error('Player profile fetch failed:', err);
    res.status(500).json({ error: 'player-profile-failed' });
  }
});

app.get('/api/player/characters/list', requirePlayerAuth, async (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const roleCheck = await assertPlayerRole(req, res);
    if (!roleCheck) return;
    const bank = loadCharacterBank();
    const entries = bank?.[req.session.player.id] || {};
    const list = Object.values(entries)
      .filter(entry => entry && entry.name)
      .map(entry => ({
        id: entry.id,
        name: entry.name,
        art: entry?.payload?.art
          || entry?.payload?.image
          || entry?.payload?.art_url
          || entry?.payload?.character_art
          || entry?.payload?.portrait
          || entry?.payload?.avatar
          || '',
        updatedAt: entry.updatedAt,
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    res.json({ characters: list });
  } catch (err) {
    console.error('Character list failed:', err);
    res.status(500).json({ error: 'character-list-failed' });
  }
});

app.post('/api/player/characters/save-as', requirePlayerAuth, async (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const roleCheck = await assertPlayerRole(req, res);
    if (!roleCheck) return;
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const name = String(body.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'name-required' });
      return;
    }
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
    const bank = loadCharacterBank();
    const playerId = req.session.player.id;
    const entries = bank[playerId] || {};
    const key = normalizeName(name);
    const existing = entries[key];
    const id = existing?.id || crypto.randomUUID();
    entries[key] = {
      id,
      name,
      payload,
      updatedAt: new Date().toISOString(),
    };
    bank[playerId] = entries;
    saveCharacterBank(bank);
    res.json({ ok: true, id });
  } catch (err) {
    console.error('Character save-as failed:', err);
    res.status(500).json({ error: 'character-save-failed' });
  }
});

app.post('/api/player/characters/load', requirePlayerAuth, async (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const roleCheck = await assertPlayerRole(req, res);
    if (!roleCheck) return;
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const id = String(body.id || '').trim();
    const name = String(body.name || '').trim();
    const bank = loadCharacterBank();
    const entries = bank?.[req.session.player.id] || {};
    let match = null;
    if (id) {
      match = Object.values(entries).find(entry => entry?.id === id) || null;
    }
    if (!match && name) {
      const key = normalizeName(name);
      match = entries[key] || null;
    }
    if (!match) {
      res.status(404).json({ error: 'character-not-found' });
      return;
    }
    res.json({ character: match.payload || null, name: match.name, id: match.id });
  } catch (err) {
    console.error('Character load failed:', err);
    res.status(500).json({ error: 'character-load-failed' });
  }
});

app.post('/api/player/characters/delete', requirePlayerAuth, async (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const roleCheck = await assertPlayerRole(req, res);
    if (!roleCheck) return;
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const id = String(body.id || '').trim();
    const name = String(body.name || '').trim();
    if (!id && !name) {
      res.status(400).json({ error: 'missing-id' });
      return;
    }
    const bank = loadCharacterBank();
    const entries = bank?.[req.session.player.id] || {};
    let keyToDelete = '';
    if (id) {
      const match = Object.entries(entries).find(([, entry]) => entry?.id === id);
      if (match) keyToDelete = match[0];
    }
    if (!keyToDelete && name) {
      const key = normalizeName(name);
      if (entries[key]) keyToDelete = key;
    }
    if (!keyToDelete) {
      res.status(404).json({ error: 'character-not-found' });
      return;
    }
    delete entries[keyToDelete];
    bank[req.session.player.id] = entries;
    saveCharacterBank(bank);
    res.json({ ok: true });
  } catch (err) {
    console.error('Character delete failed:', err);
    res.status(500).json({ error: 'character-delete-failed' });
  }
});

app.get('/api/player/wizard-data', requirePlayerAuth, async (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const roleCheck = await assertPlayerRole(req, res);
    if (!roleCheck) return;
    const artifact = loadWizardDataArtifact() || {};
    const rulesData = buildWizardDataFromRules();
    if (rulesData) {
      const standardLanguages = Array.isArray(artifact.standardLanguages) && artifact.standardLanguages.length
        ? artifact.standardLanguages
        : rulesData.standardLanguages || [];
      const rareLanguages = Array.isArray(artifact.rareLanguages) && artifact.rareLanguages.length
        ? artifact.rareLanguages
        : rulesData.rareLanguages || [];
      res.json({
        ...rulesData,
        standardArrayByClass: Object.keys(artifact.standardArrayByClass || {}).length
          ? artifact.standardArrayByClass
          : rulesData.standardArrayByClass || {},
        standardArrayByClassNormalized: Object.keys(artifact.standardArrayByClassNormalized || {}).length
          ? artifact.standardArrayByClassNormalized
          : rulesData.standardArrayByClassNormalized || {},
        standardArrayByClassId: Object.keys(artifact.standardArrayByClassId || {}).length
          ? artifact.standardArrayByClassId
          : rulesData.standardArrayByClassId || {},
        standardArrayGlobal: Array.isArray(artifact.standardArrayGlobal) && artifact.standardArrayGlobal.length
          ? artifact.standardArrayGlobal
          : rulesData.standardArrayGlobal || [],
        pointBuyCosts: Object.keys(artifact.pointBuyCosts || {}).length
          ? artifact.pointBuyCosts
          : rulesData.pointBuyCosts || {},
        trinkets: artifact.trinkets || [],
        abilityModifiers: artifact.abilityModifiers || [],
        abilityScoreRanges: artifact.abilityScoreRanges || [],
        startingEquipmentHigherLevels: artifact.startingEquipmentHigherLevels || [],
        featureChoices: Array.isArray(artifact.featureChoices) && artifact.featureChoices.length
          ? artifact.featureChoices
          : rulesData.featureChoices || [],
        standardLanguages,
        rareLanguages,
      });
      return;
    }
    if (artifact && Object.keys(artifact).length) {
      const equipmentOptions = {};
      if (Array.isArray(artifact.normalizedClasses)) {
        artifact.normalizedClasses.forEach(entry => {
          const nameKey = normalizeName(entry?.name);
          if (!nameKey) return;
          const options = Array.isArray(entry.equipment_options) ? entry.equipment_options : [];
          if (options.length) equipmentOptions[nameKey] = options;
        });
      }
      res.json({
        classes: artifact.classes || [],
        backgrounds: artifact.backgrounds || [],
        species: artifact.species || [],
        lineages: artifact.lineages || [],
        subclasses: artifact.subclasses || [],
        equipmentOptions: Object.keys(equipmentOptions).length ? equipmentOptions : EQUIPMENT_OPTIONS_BY_CLASS,
        standardArrayByClass: artifact.standardArrayByClass || {},
        standardArrayByClassNormalized: artifact.standardArrayByClassNormalized || {},
        standardArrayByClassId: artifact.standardArrayByClassId || {},
        standardArrayGlobal: Array.isArray(artifact.standardArrayGlobal) ? artifact.standardArrayGlobal : [],
        pointBuyCosts: artifact.pointBuyCosts || {},
        adventuringGear: artifact.adventuringGear || [],
        trinkets: artifact.trinkets || [],
        adventuringPacks: artifact.adventuringPacks || {},
        creatures: artifact.creatures || [],
        normalizedClasses: artifact.normalizedClasses || [],
        armor: artifact.shopInventory?.armor || [],
        weapons: artifact.shopInventory?.weapons || [],
        abilityModifiers: artifact.abilityModifiers || [],
        abilityScoreRanges: artifact.abilityScoreRanges || [],
        startingEquipmentHigherLevels: artifact.startingEquipmentHigherLevels || [],
        classProgression: artifact.classProgression || [],
        featureChoices: artifact.featureChoices || [],
        classIdByName: artifact.classIdByName || {},
        standardLanguages: artifact.standardLanguages || [],
        rareLanguages: artifact.rareLanguages || [],
      });
      return;
    }
    const classes = loadCsvRows(path.join(DATASET_DIR, 'classes.csv')).rows.map(row => ({
      class_id: row.class_id,
      name: row.name,
      primary_ability: row.primary_ability,
      saving_throws: row.saving_throws,
      starting_equipment_notes: row.starting_equipment_notes,
    }));
    const backgrounds = loadCsvRows(path.join(DATASET_DIR, 'backgrounds.csv')).rows.map(row => ({
      name: row.name,
      feat_granted: row.feat_granted,
      languages: row.languages,
      language_info: parseLanguageSource(row.languages),
    }));
    const species = loadCsvRows(path.join(DATASET_DIR, 'species.csv')).rows.map(row => ({
      name: row.name,
      species_id: row.species_id,
      languages: row.languages,
      language_info: parseLanguageSource(row.languages),
    }));
    const lineages = loadCsvRows(path.join(DATASET_DIR, 'species_lineages.csv')).rows.map(row => ({
      name: row.name,
      species_id: row.species_id,
    }));
    const subclasses = loadCsvRows(path.join(DATASET_DIR, 'subclasses.csv')).rows.map(row => ({
      name: row.name,
      class_id: row.class_id,
    }));
    const standardArrayRows = loadCsvRows(path.join(DATASET_DIR, 'standard_array_by_class.csv')).rows;
    const pointBuyRows = loadCsvRows(path.join(DATASET_DIR, 'ability_score_point_costs.csv')).rows;
    const classMap = new Map(classes.map(row => [row.class_id || row.name, row.name]));
    const subclassesWithClass = subclasses.map(row => ({
      ...row,
      class_name: classMap.get(row.class_id) || '',
    }));
    const standardArrayByClass = standardArrayRows.reduce((acc, row) => {
      const name = row.class_name || row.class;
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
    const standardArrayByClassNormalized = Object.entries(standardArrayByClass).reduce((acc, [name, values]) => {
      acc[normalizeName(name)] = values;
      return acc;
    }, {});
    const classIdByName = new Map(classes.map(row => [normalizeName(row.name), row.class_id]));
    const standardArrayByClassId = Object.entries(standardArrayByClass).reduce((acc, [name, values]) => {
      const classId = classIdByName.get(normalizeName(name));
      if (!classId) return acc;
      acc[classId] = values;
      return acc;
    }, {});
    const pointBuyCosts = pointBuyRows.reduce((acc, row) => {
      if (!row.score) return acc;
      acc[String(row.score)] = Number(row.cost) || 0;
      return acc;
    }, {});

    const adventuringGear = loadCsvRows(path.join(DATASET_DIR, 'adventuring_gear.csv')).rows.map(row => ({
      name: row.name,
      weight: row.weight,
      cost: row.cost,
    }));
    const trinkets = loadCsvRows(path.join(DATASET_DIR, 'trinkets.csv')).rows
      .map(row => row.trinket)
      .filter(Boolean);
    const normalizedClasses = loadNormalizedClasses();
    const armor = loadCsvRows(path.join(DATASET_DIR, 'armor.csv')).rows.map(row => ({
      name: row.name,
      ac: row.ac,
      strength: row.strength,
      stealth: row.stealth,
      weight: row.weight,
      cost: row.cost,
      category: row.category,
    }));
    res.json({
      classes,
      backgrounds,
      species,
      lineages,
      subclasses: subclassesWithClass,
      equipmentOptions: EQUIPMENT_OPTIONS_BY_CLASS,
      standardArrayByClass,
      standardArrayByClassNormalized,
      standardArrayByClassId,
      pointBuyCosts,
      adventuringGear,
      trinkets,
      adventuringPacks: (() => {
        const rows = loadCsvRows(path.join(DATASET_DIR, 'adventuring_packs.csv')).rows;
        const packs = {};
        rows.forEach(row => {
          const name = String(row.name || '').trim();
          if (!name) return;
          const items = [];
          for (let i = 1; i <= 14; i += 1) {
            const key = `item_${i}`;
            const raw = String(row[key] || '').trim();
            if (!raw) continue;
            const match = raw.match(/^(\\d+)\\s+(.*)$/);
            const qty = match ? Number(match[1]) : 1;
            const itemName = (match ? match[2] : raw).replace(/\\.$/, '').trim();
            if (itemName) items.push({ name: itemName, qty });
          }
          packs[normalizeName(name)] = {
            name,
            items,
          };
        });
        return packs;
      })(),
      normalizedClasses,
      armor,
      weapons: loadCsvRows(path.join(DATASET_DIR, 'weapons.csv')).rows.map(row => ({
        name: row.name,
        category: row.category,
        damage: row.damage,
        properties_1: row.properties_1,
        properties_2: row.properties_2,
        properties_3: row.properties_3,
        properties_4: row.properties_4,
      })),
      abilityModifiers: loadCsvRows(path.join(DATASET_DIR, 'ability_modifiers.csv')).rows,
      abilityScoreRanges: loadCsvRows(path.join(DATASET_DIR, 'ability_score_ranges.csv')).rows,
      startingEquipmentHigherLevels: loadCsvRows(path.join(DATASET_DIR, 'starting_equipment_higher_levels.csv')).rows,
      classProgression: loadCsvRows(path.join(DATASET_DIR, 'class_progression.csv')).rows,
      classIdByName: (() => {
        const rows = loadCsvRows(path.join(DATASET_DIR, 'classes.csv')).rows;
        const lookup = {};
        for (const row of rows) {
          const name = normalizeName(row.name);
          if (name && row.class_id) lookup[name] = row.class_id;
        }
        return lookup;
      })(),
      creatures: loadCsvRows(path.join(DATASET_DIR, 'creature_stat_blocks.csv')).rows,
      standardLanguages: loadCsvRows(path.join(DATASET_DIR, 'standard_languages.csv')).rows,
      rareLanguages: loadCsvRows(path.join(DATASET_DIR, 'rare_languages.csv')).rows,
    });
  } catch (err) {
    console.error('Wizard data failed:', err);
    res.status(500).json({ error: 'wizard-data-failed' });
  }
});

app.post('/api/player/wizard/roll-languages', requirePlayerAuth, async (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const roleCheck = await assertPlayerRole(req, res);
    if (!roleCheck) return;
    const picks = rollStandardLanguages();
    res.json({ picks });
  } catch (err) {
    console.error('Wizard roll languages failed:', err);
    res.status(500).json({ error: 'wizard-roll-failed' });
  }
});

app.post('/api/player/wizard/save', requirePlayerAuth, async (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const roleCheck = await assertPlayerRole(req, res);
    if (!roleCheck) return;
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const profiles = loadProfiles();
    const existing = profiles?.[req.session.player.id] || {};
    const payload = {
      name: String(body.name || existing.name || '').trim(),
      class: String(body.class || existing.class || '').trim(),
      level: String(body.level || existing.level || '').trim(),
      background: String(body.background || existing.background || '').trim(),
      species: String(body.species || existing.species || '').trim(),
      lineage: String(body.lineage || existing.lineage || '').trim(),
      feat: String(body.feat || existing.feat || '').trim(),
      languages: String(body.languages || existing.languages || '').trim(),
      stats: String(body.stats || existing.stats || '').trim(),
      alignment: String(body.alignment || existing.alignment || '').trim(),
      trait: String(body.trait || existing.trait || '').trim(),
      goal: String(body.goal || existing.goal || '').trim(),
      notes: String(body.notes || existing.notes || '').trim(),
      background_notes: String(body.background_notes || existing.background_notes || '').trim(),
      personality_notes: String(body.personality_notes || existing.personality_notes || '').trim(),
      class_skill_choices: String(body.class_skill_choices || existing.class_skill_choices || '').trim(),
      equipment: String(body.equipment || existing.equipment || '').trim(),
      instruments: String(body.instruments || existing.instruments || '').trim(),
      subclass: String(body.subclass || existing.subclass || '').trim(),
      cantrips: String(body.cantrips || existing.cantrips || '').trim(),
      spells: String(body.spells || existing.spells || '').trim(),
      currency: String(body.currency || existing.currency || '').trim(),
      feature_choices: String(body.feature_choices || existing.feature_choices || '').trim(),
      wild_shape_forms: String(body.wild_shape_forms || existing.wild_shape_forms || '').trim(),
      wild_shape_spent: String(body.wild_shape_spent || existing.wild_shape_spent || '').trim(),
      wild_companion_active: String(body.wild_companion_active || existing.wild_companion_active || '').trim(),
      wild_companion_source: String(body.wild_companion_source || existing.wild_companion_source || '').trim(),
        spell_slot_expended: String(body.spell_slot_expended || existing.spell_slot_expended || '').trim(),
        manual_inventory: String(body.manual_inventory || existing.manual_inventory || '').trim(),
        inventory_items: String(body.inventory_items || existing.inventory_items || '').trim(),
        equipped_items: String(body.equipped_items || existing.equipped_items || '').trim(),
        hand_equip: String(body.hand_equip || existing.hand_equip || '').trim(),
        equipped_armor_key: String(body.equipped_armor_key || existing.equipped_armor_key || '').trim(),
        combat_ac: String(body.combat_ac || existing.combat_ac || '').trim(),
        combat_max_hp: String(body.combat_max_hp || existing.combat_max_hp || '').trim(),
        combat_current_hp: String(body.combat_current_hp || existing.combat_current_hp || '').trim(),
        combat_temp_hp: String(body.combat_temp_hp || existing.combat_temp_hp || '').trim(),
      };
    profiles[req.session.player.id] = payload;
    saveProfiles(profiles);
    res.json({ ok: true });
  } catch (err) {
    console.error('Wizard save failed:', err);
    res.status(500).json({ error: 'wizard-save-failed' });
  }
});

app.post('/api/player/wizard/validate', requirePlayerAuth, async (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const roleCheck = await assertPlayerRole(req, res);
    if (!roleCheck) return;
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const errors = [];

    const className = String(body.class || '').trim();
    const backgroundName = String(body.background || '').trim();
    const speciesName = String(body.species || '').trim();
    const lineageName = String(body.lineage || '').trim();
    const subclassName = String(body.subclass || '').trim();
    let featName = String(body.feat || '').trim();
    const languages = String(body.languages || '').trim();
    const cantrips = String(body.cantrips || '').trim();
    const spells = String(body.spells || '').trim();
    const stats = String(body.stats || '').trim();

    if (!className) errors.push('Class is required.');
    if (!backgroundName) errors.push('Background is required.');
    if (!speciesName) errors.push('Species is required.');
    if (!stats) errors.push('Ability scores are required.');

    const classSet = loadNameSet(path.join(DATASET_DIR, 'classes.csv'));
    if (className && !classSet.has(normalizeName(className))) {
      errors.push('Class not found.');
    }

    const backgroundSet = loadNameSet(path.join(DATASET_DIR, 'backgrounds.csv'));
    if (backgroundName && !backgroundSet.has(normalizeName(backgroundName))) {
      errors.push('Background not found.');
    }

    const speciesRows = loadCsvRows(path.join(DATASET_DIR, 'species.csv')).rows;
    const speciesRow = speciesRows.find(row => normalizeName(row.name) === normalizeName(speciesName));
    if (speciesName && !speciesRow) {
      errors.push('Species not found.');
    }

    if (lineageName) {
      const lineages = loadCsvRows(path.join(DATASET_DIR, 'species_lineages.csv')).rows;
      const lineageRow = lineages.find(row => normalizeName(row.name) === normalizeName(lineageName));
      if (!lineageRow) {
        errors.push('Lineage not found.');
      } else if (speciesRow && lineageRow.species_id && lineageRow.species_id !== speciesRow.species_id) {
        errors.push('Lineage does not match species.');
      }
    }

    if (subclassName) {
      const classes = loadCsvRows(path.join(DATASET_DIR, 'classes.csv')).rows;
      const classRow = classes.find(row => normalizeName(row.name) === normalizeName(className));
      const subclasses = loadCsvRows(path.join(DATASET_DIR, 'subclasses.csv')).rows;
      const subclassRow = subclasses.find(row => normalizeName(row.name) === normalizeName(subclassName));
      if (!subclassRow) {
        errors.push('Subclass not found.');
      } else if (classRow && subclassRow.class_id && subclassRow.class_id !== classRow.class_id) {
        errors.push('Subclass does not match class.');
      }
    }

    if (featName) {
      featName = featName.replace(/\(see[^)]*\)/gi, '').trim();
      const featSet = loadNameSet(path.join(DATASET_DIR, 'feats.csv'));
      if (!featSet.has(normalizeName(featName))) {
        errors.push('Feat not found.');
      }
    }

    if (languages) {
      const languageSet = new Set([
        ...loadCsvRows(path.join(DATASET_DIR, 'standard_languages.csv')).rows.map(r => normalizeName(r.language)),
        ...loadCsvRows(path.join(DATASET_DIR, 'rare_languages.csv')).rows.map(r => normalizeName(r.language)),
      ].filter(Boolean));
      const selected = languages.split(',').map(item => item.trim()).filter(Boolean);
      const backgroundRow = loadCsvRows(path.join(DATASET_DIR, 'backgrounds.csv')).rows
        .find(row => normalizeName(row.name) === normalizeName(backgroundName));
      const backgroundLang = parseLanguageSource(backgroundRow?.languages || '');
      const speciesLang = parseLanguageSource(speciesRow?.languages || '');
      const base = [...new Set([...(backgroundLang.base || []), ...(speciesLang.base || [])])];
      const additional = selected.filter(lang => !base.some(baseLang => normalizeName(baseLang) === normalizeName(lang)));

      for (const lang of selected) {
        if (!languageSet.has(normalizeName(lang))) {
          errors.push(`Unknown language: ${lang}.`);
        }
      }
      if (additional.length && additional.length !== 2) {
        errors.push('Choose exactly 2 additional languages (base languages do not count).');
      }
    }

    if (stats) {
      const statMap = {};
      const matches = stats.toUpperCase().match(/(STR|DEX|CON|INT|WIS|CHA)[^0-9]*([0-9]{1,2})/g) || [];
      for (const m of matches) {
        const parts = m.match(/(STR|DEX|CON|INT|WIS|CHA)[^0-9]*([0-9]{1,2})/);
        if (!parts) continue;
        statMap[parts[1]] = Number(parts[2]);
      }
      if (Object.keys(statMap).length < 6) {
        errors.push('Ability scores must include STR, DEX, CON, INT, WIS, CHA.');
      }
    }

    if (cantrips || spells) {
      const spellRows = loadCsvRows(path.join(DATASET_DIR, 'spells.csv')).rows;
      const spellMap = new Map(spellRows.map(row => [normalizeName(row.name), row]));
      const validateList = (value, kind) => {
        const list = value.split(',').map(item => item.trim()).filter(Boolean);
        for (const name of list) {
          const row = spellMap.get(normalizeName(name));
          if (!row) {
            errors.push(`${kind} not found: ${name}.`);
            continue;
          }
          const level = String(row.level || '').toLowerCase();
          const isCantrip = level.includes('cantrip') || level.startsWith('0') || Number(row.level) === 0;
          if (kind === 'Cantrip' && !isCantrip) errors.push(`${name} is not a cantrip.`);
          if (kind === 'Spell' && isCantrip) errors.push(`${name} is a cantrip, not a spell.`);
        }
      };
      if (cantrips) validateList(cantrips, 'Cantrip');
      if (spells) validateList(spells, 'Spell');
    }

    res.json({ ok: errors.length === 0, errors });
  } catch (err) {
    console.error('Wizard validate failed:', err);
    res.status(500).json({ error: 'wizard-validate-failed' });
  }
});

app.get('/api/player/wizard/spell-options', requirePlayerAuth, async (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const roleCheck = await assertPlayerRole(req, res);
    if (!roleCheck) return;
    const className = String(req.query.class || '').trim();
    if (!className) {
      res.json({ cantrips: [], spells: [] });
      return;
    }
    const classes = loadCsvRows(path.join(DATASET_DIR, 'classes.csv')).rows;
    const classRow = classes.find(row => normalizeName(row.name) === normalizeName(className)
      || String(row.class_id || '') === String(className));
    if (!classRow?.class_id) {
      res.json({ cantrips: [], spells: [] });
      return;
    }
    const spellRows = loadCsvRows(path.join(DATASET_DIR, 'spells.csv')).rows;
    const toSpellId = name => `SPL_${String(name || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
    const nameFromId = spellId =>
      String(spellId || '')
        .replace(/^SPL_/, '')
        .toLowerCase()
        .split('_')
        .map(part => part ? part[0].toUpperCase() + part.slice(1) : '')
        .join(' ');
    const spellMap = new Map();
    for (const row of spellRows) {
      const spellId = row.spell_id || toSpellId(row.name);
      if (spellId) spellMap.set(spellId, row);
    }
    const listRows = loadCsvRows(path.join(DATASET_DIR, 'class_spell_lists.csv')).rows;
    const classSpells = listRows.filter(row => row.class_id === classRow.class_id);
    const cantrips = [];
    const spells = [];
    for (const row of classSpells) {
      const spellId = row.spell_id;
      if (!spellId) continue;
      const spell = spellMap.get(spellId);
      const name = spell?.name || row.name || nameFromId(spellId);
      const listLevel = String(row.spell_level || '').trim();
      const levelText = String(spell?.level || '').toLowerCase();
      const isCantrip = listLevel
        ? listLevel === '0' || listLevel.toLowerCase().includes('cantrip')
        : (levelText.includes('cantrip') || levelText.startsWith('0'));
      if (isCantrip) cantrips.push(name);
      else spells.push(name);
    }
    res.json({
      cantrips: cantrips.sort((a, b) => a.localeCompare(b)),
      spells: spells.sort((a, b) => a.localeCompare(b)),
    });
  } catch (err) {
    console.error('Wizard spell options failed:', err);
    res.status(500).json({ error: 'wizard-spell-options-failed' });
  }
});

app.post('/api/player/online/ping', requirePlayerAuth, (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  cleanupOnlinePlayers();
  const player = req.session.player;
  onlinePlayers.set(player.id, {
    id: player.id,
    username: player.username,
    guildId: player.guildId || null,
    lastSeen: Date.now(),
  });
  res.json({ ok: true });
});

app.get('/api/player/online', requirePlayerAuth, (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  cleanupOnlinePlayers();
  const guildId = req.session.player?.guildId || null;
  const list = Array.from(onlinePlayers.values())
    .filter(entry => !guildId || entry.guildId === guildId)
    .map(entry => ({ id: entry.id, username: entry.username }));
  res.json({ players: list });
});

app.post('/api/player/trade/request', requirePlayerAuth, (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const toPlayerId = String(body.toPlayerId || '').trim();
    const item = String(body.item || '').trim();
    const qty = Math.max(1, Number(body.qty) || 1);
    if (!toPlayerId || !item) {
      res.status(400).json({ error: 'missing-fields' });
      return;
    }
    const trades = loadTrades();
    const trade = {
      id: crypto.randomUUID(),
      fromId: req.session.player.id,
      fromName: req.session.player.username,
      toId: toPlayerId,
      item,
      qty,
      status: 'pending',
      createdAt: new Date().toISOString(),
      guildId: req.session.player.guildId || null,
    };
    trades.push(trade);
    saveTrades(trades);
    res.json({ ok: true, trade });
  } catch (err) {
    console.error('Trade request failed:', err);
    res.status(500).json({ error: 'trade-request-failed' });
  }
});

app.get('/api/player/trade/inbox', requirePlayerAuth, (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const trades = loadTrades();
    const list = trades.filter(trade =>
      trade.toId === req.session.player.id && trade.status === 'pending'
    );
    res.json({ trades: list });
  } catch (err) {
    console.error('Trade inbox failed:', err);
    res.status(500).json({ error: 'trade-inbox-failed' });
  }
});

app.post('/api/player/trade/respond', requirePlayerAuth, (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const tradeId = String(body.tradeId || '').trim();
    const action = String(body.action || '').trim();
    if (!tradeId || !['accept', 'reject'].includes(action)) {
      res.status(400).json({ error: 'invalid-request' });
      return;
    }
    const trades = loadTrades();
    const trade = trades.find(entry => entry.id === tradeId);
    if (!trade || trade.toId !== req.session.player.id) {
      res.status(404).json({ error: 'trade-not-found' });
      return;
    }
    if (trade.status !== 'pending') {
      res.status(400).json({ error: 'trade-not-pending' });
      return;
    }
    trade.status = action === 'accept' ? 'accepted' : 'rejected';
    trade.respondedAt = new Date().toISOString();
    saveTrades(trades);
    res.json({ ok: true, trade });
  } catch (err) {
    console.error('Trade respond failed:', err);
    res.status(500).json({ error: 'trade-respond-failed' });
  }
});

app.get('/api/player/wizard/class-spells', requirePlayerAuth, async (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const roleCheck = await assertPlayerRole(req, res);
    if (!roleCheck) return;
      const rawClass = String(req.query.class || '').trim();
      if (!rawClass) {
        res.json({ spells: [] });
        return;
      }
      const registry = getRulesRegistry();
      const resolveClassName = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (registry) {
          const direct = getRulesById(registry, raw);
          const name = direct?.data?.name || direct?.name;
          if (name) return String(name).trim();
        }
        return raw;
      };
      const className = resolveClassName(rawClass);
      if (registry) {
        const listId = `list.spells.class_${normalizeListId(className)}`;
        const listEntry = getRulesById(registry, listId);
      if (listEntry?.data?.items) {
        const spells = listEntry.data.items
          .map(spellId => {
            const spellEntry = getRulesById(registry, spellId);
            const spell = spellEntry?.data;
            if (!spell) return null;
            const components = spell.components;
            let componentText = '';
            if (typeof components === 'string') {
              componentText = components;
            } else if (components && typeof components === 'object') {
              const flags = Array.isArray(components.flags) ? components.flags.join(', ') : '';
              const material = components.material ? ` (${components.material})` : '';
              componentText = `${flags}${material}`.trim();
            }
            const description = Array.isArray(spell.description)
              ? spell.description.join(' ')
              : String(spell.description || '');
            return {
              spell_id: spell.id || spellEntry.id,
              name: spell.name || spellEntry.name || spellEntry.id,
              level: Number.isFinite(Number(spell.level)) ? Number(spell.level) : null,
              casting_time: spell.casting_time || '',
              range: spell.range || '',
              components: componentText,
              duration: spell.duration || '',
              description,
            };
          })
          .filter(Boolean)
          .sort((a, b) => {
            if (a.level === b.level) return a.name.localeCompare(b.name);
            if (a.level === null) return 1;
            if (b.level === null) return -1;
            return a.level - b.level;
          });
        res.json({ spells });
        return;
      }
    }
      const classes = loadCsvRows(path.join(DATASET_DIR, 'classes.csv')).rows;
      const classRow = classes.find(row => normalizeName(row.name) === normalizeName(className)
        || String(row.class_id || '') === String(className));
      if (!classRow?.class_id) {
        res.json({ spells: [] });
        return;
      }
    const spellRows = loadCsvRows(path.join(DATASET_DIR, 'spells.csv')).rows;
    const toSpellId = name => `SPL_${String(name || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
    const nameFromId = spellId =>
      String(spellId || '')
        .replace(/^SPL_/, '')
        .toLowerCase()
        .split('_')
        .map(part => part ? part[0].toUpperCase() + part.slice(1) : '')
        .join(' ');
    const spellMap = new Map();
    for (const row of spellRows) {
      const spellId = row.spell_id || toSpellId(row.name);
      if (spellId) spellMap.set(spellId, row);
    }
    const listRows = loadCsvRows(path.join(DATASET_DIR, 'class_spell_lists.csv')).rows;
    const classSpells = listRows.filter(row => row.class_id === classRow.class_id);
    const spells = classSpells
      .map(row => {
        const spellId = row.spell_id;
        if (!spellId) return null;
        const spell = spellMap.get(spellId);
        const name = spell?.name || row.name || nameFromId(spellId);
        const listLevel = String(row.spell_level || '').trim();
        const levelText = String(spell?.level || '').toLowerCase();
        let level = null;
        if (listLevel) {
          level = Number(listLevel);
        } else if (levelText.includes('cantrip') || levelText.startsWith('0')) {
          level = 0;
        } else {
          const parsed = Number(spell?.level);
          level = Number.isFinite(parsed) ? parsed : null;
        }
        return {
          spell_id: spellId,
          name,
          level,
          casting_time: spell?.casting_time || '',
          range: spell?.range || '',
          components: spell?.components || '',
          duration: spell?.duration || '',
          description: spell?.description || '',
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.level === b.level) return a.name.localeCompare(b.name);
        if (a.level === null) return 1;
        if (b.level === null) return -1;
        return a.level - b.level;
      });
    res.json({ spells });
  } catch (err) {
    console.error('Wizard class spells failed:', err);
    res.status(500).json({ error: 'wizard-class-spells-failed' });
  }
});

app.get('/api/player/wizard/spell-level', requirePlayerAuth, async (req, res) => {
  ensurePlayerSessionFromAdmin(req);
  try {
    const roleCheck = await assertPlayerRole(req, res);
    if (!roleCheck) return;
    const className = String(req.query.class || '').trim();
    const level = Number(req.query.level || 0);
    if (!className || !Number.isFinite(level) || level < 1) {
      res.json({ maxSpellLevel: null });
      return;
    }
    const registry = getRulesRegistry();
    if (registry) {
      const classEntries = getRulesByType(registry, 'class');
      const classEntry = classEntries.find(entry => {
        const name = getRuleName(entry);
        return normalizeName(name) === normalizeName(className) || String(entry.id) === String(className);
      });
      if (classEntry?.data?.tables) {
        const tableId = classEntry.data.tables.find(id => String(id || '').includes('class_features'));
        const tableEntry = tableId ? getRulesById(registry, tableId) : null;
        const row = Array.isArray(tableEntry?.data?.entries)
          ? tableEntry.data.entries.find(entry => Number(entry.level) === level)
          : null;
        if (row?.spell_slots && typeof row.spell_slots === 'object') {
          let max = null;
          Object.entries(row.spell_slots).forEach(([slot, value]) => {
            const count = Number(value);
            const slotLevel = Number(slot);
            if (Number.isFinite(count) && count > 0 && Number.isFinite(slotLevel)) {
              if (!Number.isFinite(max) || slotLevel > max) max = slotLevel;
            }
          });
          res.json({ maxSpellLevel: Number.isFinite(max) ? max : null });
          return;
        }
        res.json({ maxSpellLevel: null });
        return;
      }
    }
    const classes = loadCsvRows(path.join(DATASET_DIR, 'classes.csv')).rows;
    const classRow = classes.find(row => normalizeName(row.name) === normalizeName(className)
      || String(row.class_id || '') === String(className));
    if (!classRow?.class_id) {
      res.json({ maxSpellLevel: null });
      return;
    }
    const progressionRows = loadCsvRows(path.join(DATASET_DIR, 'class_progression.csv')).rows;
    const row = progressionRows.find(entry =>
      entry.class_id === classRow.class_id && String(entry.level) === String(level)
    );
    const raw = row?.spell_level ?? '';
    const parsed = Number(raw);
    res.json({ maxSpellLevel: Number.isFinite(parsed) ? parsed : null });
  } catch (err) {
    console.error('Wizard spell level failed:', err);
    res.status(500).json({ error: 'wizard-spell-level-failed' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/healthz', (req, res) => {
  res.json({ ok: true, service: 'admin', time: new Date().toISOString() });
});

app.get('/version', (req, res) => {
  res.json({
    name: 'mimic-admin',
    version: APP_VERSION,
    build: BUILD_ID,
    time: new Date().toISOString(),
  });
});

app.get('/readyz', async (req, res) => {
  const dbStatus = checkAppDbReady();
  const rulesStatus = checkRulesReady();
  const ok = dbStatus.ok && rulesStatus.ok;
  if (!ok) {
    res.status(503).json({
      ok: false,
      db: dbStatus,
      rules: rulesStatus,
    });
    return;
  }
  res.json({
    ok: true,
    db: dbStatus,
    rules: rulesStatus,
    time: new Date().toISOString(),
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(ADMIN_PORT, ADMIN_HOST, () => {
  ensureDir(DATASET_DIR);
  ensureDir(HOMEBREW_DIR);
  const registry = getRulesRegistry();
  const issueCount = registry?.errors?.length || 0;
  console.log(`Admin UI listening on ${ADMIN_HOST}:${ADMIN_PORT}`);
  console.log(`Admin UI dataset: ${DATASET_GROUP} (${DATASET_DIR})`);
  console.log(`Admin DB: ${appDb.dbPath || 'app.sqlite'}`);
  console.log(`Rules registry issues: ${issueCount}`);

  if (BACKUP_INTERVAL_MIN > 0) {
    const runBackup = () => {
      const result = backupSqliteDb({
        dbPath: appDb.dbPath || APP_DB_PATH,
        backupDir: BACKUP_DIR,
        keep: BACKUP_KEEP,
      });
      if (result.ok) {
        console.log(`DB backup saved: ${result.file} (pruned ${result.pruned})`);
      } else {
        console.warn(`DB backup skipped: ${result.error}`);
      }
    };
    runBackup();
    setInterval(runBackup, BACKUP_INTERVAL_MIN * 60 * 1000);
  }
});
validateEnv({
  appName: 'Admin UI',
  required: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
  optional: ['DISCORD_BOT_TOKEN', 'DISCORD_TOKEN', 'ADMIN_ROLE_IDS'],
});
