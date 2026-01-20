import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATASET_GROUP = process.env.DATASET_GROUP || 'D&D';
const DATASET_DIR = path.join(ROOT_DIR, 'data_sets', DATASET_GROUP);
const HOMEBREW_DIR = path.join(DATASET_DIR, 'homebrew_uploads');
const ADMIN_CONFIG_PATH = process.env.ADMIN_CONFIG_PATH
  ? path.resolve(process.env.ADMIN_CONFIG_PATH)
  : path.join(ROOT_DIR, 'admin_config.json');

const ADMIN_HOST = process.env.ADMIN_HOST || '0.0.0.0';
const ADMIN_PORT = Number(process.env.ADMIN_PORT || 3001);
const BASE_URL = process.env.ADMIN_BASE_URL || `http://${ADMIN_HOST}:${ADMIN_PORT}`;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_OAUTH_REDIRECT =
  process.env.DISCORD_OAUTH_REDIRECT || `${BASE_URL}/auth/discord/callback`;
const ADMIN_GUILD_ID = process.env.ADMIN_GUILD_ID || process.env.GUILD_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;

const COMMAND_MANIFEST = [
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

function buildDefaultConfig() {
  const commands = {};
  for (const cmd of COMMAND_MANIFEST) {
    commands[cmd.name] = { enabled: true, access: 'everyone', roles: [] };
  }
  return {
    version: 1,
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

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID || '',
    client_secret: DISCORD_CLIENT_SECRET || '',
    grant_type: 'authorization_code',
    code,
    redirect_uri: DISCORD_OAUTH_REDIRECT,
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

const sessionSecret = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.ADMIN_SESSION_SECRET) {
  console.warn('ADMIN_SESSION_SECRET not set; using a random value for this session.');
}

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: 'lax',
      httpOnly: true,
    },
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

function requireAuth(req, res, next) {
  if (!req.session?.user?.authorized) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

app.get('/api/me', (req, res) => {
  if (!req.session?.user?.authorized) {
    res.json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, user: req.session.user });
});

app.get('/api/command-manifest', requireAuth, (req, res) => {
  res.json(COMMAND_MANIFEST);
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
  if (!ADMIN_GUILD_ID) {
    res.status(500).json({ error: 'guild-id-missing' });
    return;
  }
  if (!DISCORD_BOT_TOKEN) {
    res.status(500).json({ error: 'bot-token-missing' });
    return;
  }
  try {
    const roles = await fetchDiscordJson(
      `https://discord.com/api/guilds/${ADMIN_GUILD_ID}/roles`,
      DISCORD_BOT_TOKEN,
      'Bot'
    );
    const cleaned = Array.isArray(roles)
      ? roles
          .filter(role => role && role.id !== ADMIN_GUILD_ID)
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
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !ADMIN_GUILD_ID) {
    res.status(500).send('Discord OAuth is not configured.');
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_OAUTH_REDIRECT,
    response_type: 'code',
    scope: 'identify guilds',
    state,
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
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
    const guild = Array.isArray(guilds) ? guilds.find(g => g.id === ADMIN_GUILD_ID) : null;
    if (!guild || !guild.owner) {
      res.status(403).send('You must be the guild owner to access this page.');
      return;
    }
    req.session.user = {
      authorized: true,
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      guildId: ADMIN_GUILD_ID,
    };
    res.redirect('/');
  } catch (err) {
    console.error('OAuth error:', err);
    res.status(500).send('OAuth failed.');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(ADMIN_PORT, ADMIN_HOST, () => {
  ensureDir(DATASET_DIR);
  ensureDir(HOMEBREW_DIR);
  console.log(`Admin UI listening on ${ADMIN_HOST}:${ADMIN_PORT}`);
});
