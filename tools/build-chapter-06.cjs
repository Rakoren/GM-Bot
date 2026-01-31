const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const chapterDir = path.join(repoRoot, 'docs', 'chapter-06');
const itemsDir = path.join(chapterDir, 'items');
const tablesDir = path.join(chapterDir, 'tables');
const listsDir = path.join(chapterDir, 'lists');

const sourceFile =
  'docs/sources/phb2024/08-chapter 6/08-Equipment - Player’s Handbook - Dungeons & Dragons - Sources - D&D Beyond.pdf';
const sourceText =
  'docs/sources/phb2024/08-chapter 6/08-Equipment - Player’s Handbook - Dungeons & Dragons - Sources - D&D Beyond.txt';

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
};

const clearDir = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      clearDir(p);
      fs.rmdirSync(p);
    } else {
      fs.unlinkSync(p);
    }
  }
};

ensureDir(chapterDir);
ensureDir(itemsDir);
ensureDir(tablesDir);
ensureDir(listsDir);
clearDir(itemsDir);
clearDir(tablesDir);
clearDir(listsDir);

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

const raw = fs.readFileSync(sourceText, 'utf8');
const lines = raw.split(/\r?\n/);

let currentPage = null;
const linesWithPages = lines.map((line) => {
  const pageMatch = line.match(/^--\s+(\d+)\s+of\s+\d+\s+--$/);
  if (pageMatch) currentPage = Number(pageMatch[1]);
  return { line, page: currentPage };
});

const findLineIndex = (predicate) => lines.findIndex(predicate);

const collectTableRows = (startIdx, endIdx, headerLine) => {
  const rows = [];
  let inTable = false;
  for (let i = startIdx; i < endIdx; i += 1) {
    const { line } = linesWithPages[i];
    const trimmed = line.trim();
    if (!inTable) {
      if (trimmed === headerLine) inTable = true;
      continue;
    }
    if (!trimmed) continue;
    if (!line.includes('\t')) continue;
    rows.push(trimmed);
  }
  return rows;
};

const parseSimpleTable = (startIdx, endIdx, headerLine, columns) => {
  const entries = [];
  let inTable = false;
  for (let i = startIdx; i < endIdx; i += 1) {
    const { line } = linesWithPages[i];
    const trimmed = line.trim();
    if (!inTable) {
      if (trimmed === headerLine) inTable = true;
      continue;
    }
    if (!trimmed) continue;
    if (trimmed === headerLine) continue;
    if (/^--\s+\d+\s+of\s+\d+\s+--$/.test(trimmed)) continue;
    if (!line.includes('\t')) continue;
    const parts = line.split('\t').map((s) => s.trim()).filter(Boolean);
    if (parts.length < columns.length) continue;
    const entry = {};
    for (let j = 0; j < columns.length; j += 1) {
      entry[columns[j]] = parts[j] ?? '';
    }
    entries.push(entry);
  }
  return entries;
};

const masteryList = [
  'Cleave',
  'Graze',
  'Nick',
  'Push',
  'Sap',
  'Slow',
  'Topple',
  'Vex',
];

const parseWeaponRows = (startIdx, endIdx) => {
  const entries = [];
  let currentCategory = null;
  let currentType = null;
  let pending = null;

  for (let i = startIdx; i < endIdx; i += 1) {
    const { line } = linesWithPages[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === 'Name \tDamage \tProperties \tMastery \tWeight \tCost') continue;
    if (/^--\s+\d+\s+of\s+\d+\s+--$/.test(trimmed)) continue;

    if (!line.includes('\t')) {
      if (/Simple Melee Weapons/.test(trimmed)) {
        currentCategory = 'Simple';
        currentType = 'Melee';
      } else if (/Simple Ranged Weapons/.test(trimmed)) {
        currentCategory = 'Simple';
        currentType = 'Ranged';
      } else if (/Martial Melee Weapons/.test(trimmed)) {
        currentCategory = 'Martial';
        currentType = 'Melee';
      } else if (/Martial Ranged Weapons/.test(trimmed)) {
        currentCategory = 'Martial';
        currentType = 'Ranged';
      }
      continue;
    }

    const mergeLine = pending ? `${pending} ${trimmed}` : trimmed;
    const parts = mergeLine.split('\t').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 4) {
      pending = mergeLine;
      continue;
    }
    pending = null;

    let name = parts[0] ?? '';
    let damage = '';
    let damageType = '';
    let properties = '';
    let mastery = '';
    let weight = parts[parts.length - 2] ?? '';
    let cost = parts[parts.length - 1] ?? '';

    if (parts.length >= 6) {
      damage = parts[1];
      const dmgMatch = damage.match(/^(\S+)\s+(.+)$/);
      if (dmgMatch) {
        damage = dmgMatch[1];
        damageType = dmgMatch[2];
      }
      properties = parts[2];
      mastery = parts[3];
      weight = parts[4];
      cost = parts[5];
    } else {
      const mid = parts[1];
      const dmgMatch = mid.match(/^(\S+)\s+([A-Za-z]+)\s+(.*)$/);
      if (dmgMatch) {
        damage = dmgMatch[1];
        damageType = dmgMatch[2];
        const rest = dmgMatch[3] ?? '';
        const restParts = rest.split(/\s+/);
        const last = restParts[restParts.length - 1];
        if (masteryList.includes(last)) {
          mastery = last;
          properties = restParts.slice(0, -1).join(' ').replace(/\s+,/g, ',');
        } else {
          properties = rest;
        }
      } else {
        damage = mid;
      }
    }

    entries.push({
      name,
      category: currentCategory,
      weapon_type: currentType,
      damage,
      damage_type: damageType,
      properties,
      mastery,
      weight,
      cost,
    });
  }

  return entries;
};

const parseArmorRows = (startIdx, endIdx) => {
  const entries = [];
  let currentCategory = null;
  let don = null;
  let doff = null;
  let inTable = false;

  for (let i = startIdx; i < endIdx; i += 1) {
    const { line } = linesWithPages[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === 'Armor \tArmor Class (AC) \tStrength \tStealth \tWeight \tCost') {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (/^--\s+\d+\s+of\s+\d+\s+--$/.test(trimmed)) continue;
    if (!line.includes('\t')) {
      const label = trimmed;
      const catMatch = label.match(/^(Light|Medium|Heavy) Armor\s*\((.+)\)$/);
      if (catMatch) {
        currentCategory = catMatch[1];
        const timing = catMatch[2];
        if (/Minute/.test(timing)) {
          const matchSame = timing.match(/^(.+?)\s+to\s+Don\s+or\s+Doff$/i);
          const matchSplit = timing.match(/^(.+?)\s+to\s+Don\s+and\s+(.+?)\s+to\s+Doff$/i);
          if (matchSame) {
            don = matchSame[1].trim();
            doff = matchSame[1].trim();
          } else if (matchSplit) {
            don = matchSplit[1].trim();
            doff = matchSplit[2].trim();
          } else {
            const parts = timing.split(' to ');
            don = parts[0].trim();
            doff = parts[1]?.trim() ?? null;
          }
        }
        continue;
      }
      const shieldMatch = label.match(/^Shield\s*\((.+)\)$/);
      if (shieldMatch) {
        currentCategory = 'Shield';
        don = shieldMatch[1];
        doff = shieldMatch[1];
        continue;
      }
      continue;
    }
    const parts = line.split('\t').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 6) continue;
    entries.push({
      name: parts[0],
      category: currentCategory,
      armor_class: parts[1],
      strength: parts[2],
      stealth: parts[3],
      weight: parts[4],
      cost: parts[5],
      don_time: don,
      doff_time: doff,
    });
  }
  return entries;
};

const parseGroupedTable = (
  startIdx,
  endIdx,
  headerLine,
  columns,
  groupNames = [],
  groupItemsByGroup = {}
) => {
  const entries = [];
  let inTable = false;
  let currentGroup = null;
  for (let i = startIdx; i < endIdx; i += 1) {
    const { line } = linesWithPages[i];
    const trimmed = line.trim();
    if (!inTable) {
      if (trimmed === headerLine) inTable = true;
      continue;
    }
    if (!trimmed) continue;
    if (trimmed === headerLine) continue;
    if (/^--\s+\d+\s+of\s+\d+\s+--$/.test(trimmed)) continue;
    if (!line.includes('\t')) {
      if (!trimmed) continue;
      if (groupNames.includes(trimmed)) {
        currentGroup = trimmed;
      }
      continue;
    }
    const parts = line.split('\t').map((s) => s.trim()).filter(Boolean);
    if (parts.length < columns.length) continue;
    const entry = {};
    for (let j = 0; j < columns.length; j += 1) {
      entry[columns[j]] = parts[j] ?? '';
    }
    if (currentGroup && groupItemsByGroup[currentGroup]) {
      if (!groupItemsByGroup[currentGroup].includes(entry.item)) {
        currentGroup = null;
      }
    }
    if (currentGroup) {
      entry.group = currentGroup;
      if (entry.item) entry.item = `${currentGroup}: ${entry.item}`;
    }
    entries.push(entry);
  }
  return entries;
};

const getSectionRange = (startLabel, endLabel) => {
  const startIdx = findLineIndex((l) => l.trim() === startLabel);
  const endIdx = findLineIndex((l) => l.trim() === endLabel);
  return { startIdx, endIdx };
};

// Coin Values
const coinStart = findLineIndex((l) => l.trim() === 'Coin Values');
const coinEnd = findLineIndex((l) => l.trim() === 'Weapons');
const coinEntries = parseSimpleTable(
  coinStart,
  coinEnd,
  'Coin \tValue in GP',
  ['coin', 'value_in_gp']
);

writeJson(path.join(tablesDir, 'table.coin_values.json'), {
  id: 'table.coin_values',
  name: 'Coin Values',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [1], section: 'Coins' },
  columns: ['coin', 'value_in_gp'],
  entries: coinEntries,
  notes: ['50 coins weigh 1 lb.'],
});

// Weapons
const weaponStart = findLineIndex((l) => l.trim() === 'Weapons');
const weaponEnd = findLineIndex((l) => l.trim() === 'Weapon Proficiency');
const weaponEntries = parseWeaponRows(weaponStart, weaponEnd);

writeJson(path.join(tablesDir, 'table.weapons.json'), {
  id: 'table.weapons',
  name: 'Weapons',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [2, 3], section: 'Weapons' },
  columns: [
    'name',
    'category',
    'weapon_type',
    'damage',
    'damage_type',
    'properties',
    'mastery',
    'weight',
    'cost',
  ],
  entries: weaponEntries,
  notes: [],
});

// Armor
const armorStart = findLineIndex((l) => l.trim() === 'Armor');
const armorEnd = findLineIndex((l) => l.trim() === 'Armor Training');
const armorEntries = parseArmorRows(armorStart, armorEnd);

writeJson(path.join(tablesDir, 'table.armor.json'), {
  id: 'table.armor',
  name: 'Armor',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [6, 7, 8], section: 'Armor' },
  columns: [
    'name',
    'category',
    'armor_class',
    'strength',
    'stealth',
    'weight',
    'cost',
    'don_time',
    'doff_time',
  ],
  entries: armorEntries,
  notes: [],
});

// Adventuring Gear
const gearStart = findLineIndex((l) => l.trim() === 'Adventuring Gear');
const gearEnd = findLineIndex((l) => l.trim() === 'Ammunition (Varies)');
const gearEntries = parseSimpleTable(
  gearStart,
  gearEnd,
  'Item \tWeight \tCost',
  ['item', 'weight', 'cost']
);

writeJson(path.join(tablesDir, 'table.adventuring_gear.json'), {
  id: 'table.adventuring_gear',
  name: 'Adventuring Gear',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [14, 15, 16], section: 'Adventuring Gear' },
  columns: ['item', 'weight', 'cost'],
  entries: gearEntries,
  notes: [],
});

// Ammunition
const ammoStart = findLineIndex((l) => l.trim() === 'Ammunition');
const ammoEnd = findLineIndex((l) => l.trim() === 'Antitoxin (50 GP)');
const ammoEntries = parseSimpleTable(
  ammoStart,
  ammoEnd,
  'Type \tAmount \tStorage \tWeight \tCost',
  ['type', 'amount', 'storage', 'weight', 'cost']
);

writeJson(path.join(tablesDir, 'table.ammunition.json'), {
  id: 'table.ammunition',
  name: 'Ammunition',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [16], section: 'Ammunition' },
  columns: ['type', 'amount', 'storage', 'weight', 'cost'],
  entries: ammoEntries,
  notes: [],
});

// Arcane Focuses
const focusStart = findLineIndex((l) => l.trim() === 'Arcane Focuses');
const focusEnd = findLineIndex((l) => l.trim() === 'Druidic Focuses');
const focusEntries = parseSimpleTable(
  focusStart,
  focusEnd,
  'Focus \tWeight \tCost',
  ['focus', 'weight', 'cost']
);

writeJson(path.join(tablesDir, 'table.arcane_focuses.json'), {
  id: 'table.arcane_focuses',
  name: 'Arcane Focuses',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [16], section: 'Arcane Focuses' },
  columns: ['focus', 'weight', 'cost'],
  entries: focusEntries,
  notes: [],
});

// Mounts and Other Animals
const mountsStart = findLineIndex((l) => l.trim() === 'Mounts and Other Animals');
const mountsEnd = findLineIndex((l) => l.trim() === 'Tack, Harness, and Drawn Vehicles');
const mountsEntries = parseSimpleTable(
  mountsStart,
  mountsEnd,
  'Item \tCarrying Capacity \tCost',
  ['item', 'carrying_capacity', 'cost']
);

writeJson(path.join(tablesDir, 'table.mounts_other_animals.json'), {
  id: 'table.mounts_other_animals',
  name: 'Mounts and Other Animals',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [25, 26], section: 'Mounts and Other Animals' },
  columns: ['item', 'carrying_capacity', 'cost'],
  entries: mountsEntries,
  notes: [],
});

// Tack, Harness, and Drawn Vehicles
const tackStart = findLineIndex((l) => l.trim() === 'Tack, Harness, and Drawn Vehicles');
const tackEnd = findLineIndex((l) => l.trim() === 'Large Vehicles');
const tackEntries = parseGroupedTable(
  tackStart,
  tackEnd,
  'Item \tWeight \tCost',
  ['item', 'weight', 'cost'],
  ['Saddle'],
  {
    Saddle: ['Exotic', 'Military', 'Riding', 'Sled'],
  }
);

writeJson(path.join(tablesDir, 'table.tack_harness_drawn_vehicles.json'), {
  id: 'table.tack_harness_drawn_vehicles',
  name: 'Tack, Harness, and Drawn Vehicles',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [26], section: 'Tack, Harness, and Drawn Vehicles' },
  columns: ['item', 'weight', 'cost'],
  entries: tackEntries,
  notes: [],
});

// Airborne and Waterborne Vehicles
const shipStart = findLineIndex((l) => l.trim() === 'Airborne and Waterborne Vehicles');
const shipEnd = findLineIndex((l) => l.trim() === 'Services');
const shipEntries = parseSimpleTable(
  shipStart,
  shipEnd,
  'Ship \tSpeed \tCrew \tPassengers Cargo',
  ['ship', 'speed', 'crew', 'passengers', 'cargo_tons', 'ac', 'hp', 'damage_threshold', 'cost']
);

writeJson(path.join(tablesDir, 'table.airborne_waterborne_vehicles.json'), {
  id: 'table.airborne_waterborne_vehicles',
  name: 'Airborne and Waterborne Vehicles',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [27, 28], section: 'Airborne and Waterborne Vehicles' },
  columns: ['ship', 'speed', 'crew', 'passengers', 'cargo_tons', 'ac', 'hp', 'damage_threshold', 'cost'],
  entries: shipEntries,
  notes: [],
});

// Food, Drink, and Lodging
const foodStart = findLineIndex((l) => l.trim() === 'Food, Drink, and Lodging');
const foodEnd = findLineIndex((l) => l.trim() === 'Travel');
const foodEntries = parseGroupedTable(
  foodStart,
  foodEnd,
  'Item \tCost',
  ['item', 'cost'],
  ['Inn Stay per Day', 'Meal']
);

writeJson(path.join(tablesDir, 'table.food_drink_lodging.json'), {
  id: 'table.food_drink_lodging',
  name: 'Food, Drink, and Lodging',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [29], section: 'Food, Drink, and Lodging' },
  columns: ['item', 'cost'],
  entries: foodEntries,
  notes: [],
});

// Travel
const travelStart = findLineIndex((l) => l.trim() === 'Travel');
const travelEnd = findLineIndex((l) => l.trim() === 'Hirelings');
const travelEntries = parseSimpleTable(
  travelStart,
  travelEnd,
  'Service \tCost',
  ['service', 'cost']
);

writeJson(path.join(tablesDir, 'table.travel.json'), {
  id: 'table.travel',
  name: 'Travel',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [30], section: 'Travel' },
  columns: ['service', 'cost'],
  entries: travelEntries,
  notes: [],
});

// Hirelings
const hireStart = findLineIndex((l) => l.trim() === 'Hirelings');
const hireEnd = findLineIndex((l) => l.trim() === 'Spellcasting Services');
const hireEntries = parseSimpleTable(
  hireStart,
  hireEnd,
  'Service \tCost',
  ['service', 'cost']
);

writeJson(path.join(tablesDir, 'table.hirelings.json'), {
  id: 'table.hirelings',
  name: 'Hirelings',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [30], section: 'Hirelings' },
  columns: ['service', 'cost'],
  entries: hireEntries,
  notes: [],
});

// Spellcasting Services
const spellStart = findLineIndex((l) => l.trim() === 'Spellcasting Services');
const spellEnd = findLineIndex((l) => l.trim() === 'Magic Items');
const spellEntries = parseSimpleTable(
  spellStart,
  spellEnd,
  'Spell Level \tAvailability \tCost',
  ['spell_level', 'availability', 'cost']
);

writeJson(path.join(tablesDir, 'table.spellcasting_services.json'), {
  id: 'table.spellcasting_services',
  name: 'Spellcasting Services',
  chapter: 6,
  status: 'complete',
  sourceRef: { file: sourceFile, pages: [31], section: 'Spellcasting Services' },
  columns: ['spell_level', 'availability', 'cost'],
  entries: spellEntries,
  notes: [],
});

// Items from weapons and armor tables
const normalizeProps = (value) => {
  if (!value || value === '—') return [];
  return value
    .replace(/Two-\s+Handed/g, 'Two-Handed')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && p !== '—');
};

const weaponItems = weaponEntries.map((w) => ({
  id: `item.weapon.${slugify(w.name)}`,
  name: w.name,
  chapter: 6,
  status: 'complete',
  item_type: 'weapon',
  weapon_category: w.category,
  weapon_type: w.weapon_type,
  damage: w.damage,
  damage_type: w.damage_type,
  properties: normalizeProps(w.properties),
  mastery: w.mastery || '',
  weight: w.weight,
  cost: w.cost,
  sourceRef: { file: sourceFile, pages: [2, 3], section: 'Weapons' },
  notes: [],
}));

const armorItems = armorEntries.map((a) => ({
  id: `item.armor.${slugify(a.name)}`,
  name: a.name,
  chapter: 6,
  status: 'complete',
  item_type: 'armor',
  armor_category: a.category,
  armor_class: a.armor_class,
  strength: a.strength,
  stealth: a.stealth,
  weight: a.weight,
  cost: a.cost,
  don_time: a.don_time,
  doff_time: a.doff_time,
  sourceRef: { file: sourceFile, pages: [6, 7, 8], section: 'Armor' },
  notes: [],
}));

// Tools parsing (artisan + other tools)
const tools = [];
const toolsStart = findLineIndex((l) => l.trim() === 'Tools');
const toolsEnd = findLineIndex((l) => l.trim() === 'Adventuring Gear');
let i = toolsStart;
let activeTool = null;
for (; i < toolsEnd; i += 1) {
  const { line, page } = linesWithPages[i];
  const trimmed = line.trim();
  if (!trimmed) continue;
  const toolMatch = trimmed.match(/^(.+)\s\\((\\d+\\s(?:GP|SP|CP))\\)$/);
  if (toolMatch) {
    if (activeTool) tools.push(activeTool);
    activeTool = {
      name: toolMatch[1],
      cost: toolMatch[2],
      page,
      ability: '',
      weight: '',
      utilize: [],
      craft: [],
    };
    continue;
  }
  if (!activeTool) continue;
  if (trimmed.startsWith('Ability:')) {
    const parts = trimmed.split('\t').map((p) => p.trim());
    activeTool.ability = parts[0].replace('Ability:', '').trim();
    if (parts[1]?.startsWith('Weight:')) {
      activeTool.weight = parts[1].replace('Weight:', '').trim();
    }
  } else if (trimmed.startsWith('Utilize:')) {
    activeTool.utilize.push(trimmed.replace('Utilize:', '').trim());
  } else if (trimmed.startsWith('Craft:')) {
    activeTool.craft.push(trimmed.replace('Craft:', '').trim());
  } else if (activeTool.craft.length > 0 && !trimmed.includes(':')) {
    activeTool.craft[activeTool.craft.length - 1] += ` ${trimmed}`;
  }
}
if (activeTool) tools.push(activeTool);

const toolItems = tools.map((t) => ({
  id: `item.tool.${slugify(t.name)}`,
  name: t.name,
  chapter: 6,
  status: 'complete',
  item_type: 'tool',
  ability: t.ability,
  weight: t.weight,
  cost: t.cost,
  utilize: t.utilize,
  craft: t.craft,
  sourceRef: { file: sourceFile, pages: [t.page || 10], section: t.name },
  notes: [],
}));

// Write item shards
for (const item of [...weaponItems, ...armorItems, ...toolItems]) {
  writeJson(path.join(itemsDir, `${item.id}.json`), item);
}

// Lists
const listWeapons = {
  id: 'list.items.weapons',
  name: 'Weapons',
  chapter: 6,
  status: 'complete',
  items: weaponItems.map((w) => w.id),
};
const listArmor = {
  id: 'list.items.armor',
  name: 'Armor',
  chapter: 6,
  status: 'complete',
  items: armorItems.map((a) => a.id),
};
const listTools = {
  id: 'list.items.tools',
  name: 'Tools',
  chapter: 6,
  status: 'complete',
  items: toolItems.map((t) => t.id),
};

writeJson(path.join(listsDir, 'list.items.weapons.json'), listWeapons);
writeJson(path.join(listsDir, 'list.items.armor.json'), listArmor);
writeJson(path.join(listsDir, 'list.items.tools.json'), listTools);

const manifest = {
  schema_version: '0.1.0',
  chapter: 6,
  title: 'Equipment',
  generated_at: new Date().toISOString().slice(0, 10),
  paths: {
    items_dir: 'chapter-06/items',
    tables_dir: 'chapter-06/tables',
    lists_dir: 'chapter-06/lists',
  },
  shards: [
    ...weaponItems.map((item) => ({ id: item.id, type: 'item', path: `chapter-06/items/${item.id}.json` })),
    ...armorItems.map((item) => ({ id: item.id, type: 'item', path: `chapter-06/items/${item.id}.json` })),
    ...toolItems.map((item) => ({ id: item.id, type: 'item', path: `chapter-06/items/${item.id}.json` })),
    { id: 'table.coin_values', type: 'table', path: 'chapter-06/tables/table.coin_values.json' },
    { id: 'table.weapons', type: 'table', path: 'chapter-06/tables/table.weapons.json' },
    { id: 'table.armor', type: 'table', path: 'chapter-06/tables/table.armor.json' },
    { id: 'table.adventuring_gear', type: 'table', path: 'chapter-06/tables/table.adventuring_gear.json' },
    { id: 'table.ammunition', type: 'table', path: 'chapter-06/tables/table.ammunition.json' },
    { id: 'table.arcane_focuses', type: 'table', path: 'chapter-06/tables/table.arcane_focuses.json' },
    { id: 'table.mounts_other_animals', type: 'table', path: 'chapter-06/tables/table.mounts_other_animals.json' },
    { id: 'table.tack_harness_drawn_vehicles', type: 'table', path: 'chapter-06/tables/table.tack_harness_drawn_vehicles.json' },
    { id: 'table.airborne_waterborne_vehicles', type: 'table', path: 'chapter-06/tables/table.airborne_waterborne_vehicles.json' },
    { id: 'table.food_drink_lodging', type: 'table', path: 'chapter-06/tables/table.food_drink_lodging.json' },
    { id: 'table.travel', type: 'table', path: 'chapter-06/tables/table.travel.json' },
    { id: 'table.hirelings', type: 'table', path: 'chapter-06/tables/table.hirelings.json' },
    { id: 'table.spellcasting_services', type: 'table', path: 'chapter-06/tables/table.spellcasting_services.json' },
    { id: listWeapons.id, type: 'list', path: 'chapter-06/lists/list.items.weapons.json' },
    { id: listArmor.id, type: 'list', path: 'chapter-06/lists/list.items.armor.json' },
    { id: listTools.id, type: 'list', path: 'chapter-06/lists/list.items.tools.json' },
  ],
};

writeJson(path.join(chapterDir, 'chapter-06.manifest.json'), manifest);

const indexData = {
  chapter: 6,
  title: 'Equipment',
  items: [...weaponItems.map((i) => i.id), ...armorItems.map((i) => i.id), ...toolItems.map((i) => i.id)],
  tables: [
    'table.coin_values',
    'table.weapons',
    'table.armor',
    'table.adventuring_gear',
    'table.ammunition',
    'table.arcane_focuses',
    'table.mounts_other_animals',
    'table.tack_harness_drawn_vehicles',
    'table.airborne_waterborne_vehicles',
    'table.food_drink_lodging',
    'table.travel',
    'table.hirelings',
    'table.spellcasting_services',
  ],
  lists: [listWeapons.id, listArmor.id, listTools.id],
};

writeJson(path.join(chapterDir, 'Chapter-06-index.json'), indexData);

const md = `# Chapter 6: Equipment

> **Source:** Player's Handbook - Chapter 6 (D&D 5e 2024)
> **Purpose:** Defines weapons, armor, tools, gear, and services with costs and rules.

---

## Scope

- **Tables** for weapons, armor, gear, vehicles, services, and coin values.
- **Item shards** for weapons, armor, and tools.

---

## Engine References

- **Manifest:** chapter-06/chapter-06.manifest.json
- **Schema:** schemas/chapter-06.schema.json
- **Items:** chapter-06/items/*
- **Tables:** chapter-06/tables/*
- **Lists:** chapter-06/lists/*
`;

fs.writeFileSync(path.join(chapterDir, 'Chapter_6_Equipment.md'), md, 'utf8');

console.log(`Chapter 6 shards generated (items: ${weaponItems.length + armorItems.length + toolItems.length}).`);
