const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const chapterDir = path.join(repoRoot, 'docs', 'chapter-05');
const featsDir = path.join(chapterDir, 'feats');
const tablesDir = path.join(chapterDir, 'tables');
const listsDir = path.join(chapterDir, 'lists');

const sourceFile =
  'docs/sources/phb2024/06-chapter 5/07-Feats - Player’s Handbook - Dungeons & Dragons - Sources - D&D Beyond.pdf';
const sourceText =
  'docs/sources/phb2024/06-chapter 5/07-Feats - Player’s Handbook - Dungeons & Dragons - Sources - D&D Beyond.txt';

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
};

ensureDir(chapterDir);
ensureDir(featsDir);
ensureDir(tablesDir);
ensureDir(listsDir);

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

const parseFeatList = (text) => {
  const start = text.indexOf('Feat List');
  const end = text.indexOf('Origin Feats');
  if (start === -1 || end === -1) return [];
  const slice = text.slice(start, end);
  const lines = slice.split(/\r?\n/);
  const feats = [];
  for (const line of lines) {
    if (!line.includes('\t')) continue;
    const parts = line.split('\t').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const [name, category] = parts;
    if (name === 'Feat' || category === 'Category') continue;
    if (name.startsWith('*')) continue;
    feats.push({ name, category });
  }
  return feats;
};

const rawText = fs.readFileSync(sourceText, 'utf8');
const featList = parseFeatList(rawText);

const repeatableSet = new Set(
  featList
    .filter((f) => f.name.endsWith('*'))
    .map((f) => f.name.replace(/\*$/, '').trim())
);

const feats = featList.map((f) => {
  const cleanName = f.name.replace(/\*$/, '').trim();
  return {
    id: `feat.${slugify(cleanName)}`,
    name: cleanName,
    category: f.category,
    repeatable: repeatableSet.has(cleanName),
  };
});

const originDetails = {
  'feat.alert': {
    pages: [3],
    benefits: [
      {
        name: 'Initiative Proficiency',
        action_type: 'none',
        trigger: 'when you roll initiative',
        effects: ['add your proficiency bonus to the roll'],
      },
      {
        name: 'Initiative Swap',
        action_type: 'none',
        trigger: 'immediately after you roll initiative',
        effects: ['swap your initiative with one willing ally in the same combat'],
        limits: ['cannot swap if you or the ally has the incapacitated condition'],
      },
    ],
  },
  'feat.crafter': {
    pages: [3, 4],
    benefits: [
      {
        name: 'Tool Proficiency',
        action_type: 'none',
        trigger: 'passive',
        effects: [
          "gain proficiency with three different Artisan's Tools of your choice from the Fast Crafting table",
        ],
      },
      {
        name: 'Discount',
        action_type: 'none',
        trigger: 'when you buy a nonmagical item',
        effects: ['receive a 20 percent discount on it'],
      },
      {
        name: 'Fast Crafting',
        action_type: 'none',
        trigger: 'when you finish a long rest',
        effects: [
          'craft one piece of gear from the Fast Crafting table if you have the associated tools and proficiency',
          'the crafted item lasts until you finish another long rest',
        ],
        table_ref: 'table.feat.fast_crafting',
      },
    ],
  },
  'feat.healer': {
    pages: [4],
    benefits: [
      {
        name: 'Battle Medic',
        action_type: 'action',
        trigger: "when you take the Utilize action with a Healer's Kit",
        effects: [
          'expend one use of the kit to tend a creature within 5 feet',
          'the creature can spend one Hit Point Die and regains hit points equal to the die roll + your proficiency bonus',
        ],
      },
      {
        name: 'Healing Rerolls',
        action_type: 'none',
        trigger: 'when you roll a die to restore hit points with a spell or Battle Medic',
        effects: ['reroll a 1 on the die and use the new roll'],
      },
    ],
  },
  'feat.lucky': {
    pages: [4, 5],
    benefits: [
      {
        name: 'Luck Points',
        action_type: 'none',
        trigger: 'passive',
        effects: ['gain a number of Luck Points equal to your proficiency bonus'],
        limits: ['regain all Luck Points when you finish a long rest'],
      },
      {
        name: 'Advantage',
        action_type: 'none',
        trigger: 'when you roll a d20 for a d20 test',
        effects: ['spend 1 Luck Point to gain advantage on the roll'],
      },
      {
        name: 'Disadvantage',
        action_type: 'none',
        trigger: 'when a creature rolls a d20 for an attack roll against you',
        effects: ['spend 1 Luck Point to impose disadvantage on that roll'],
      },
    ],
  },
  'feat.magic_initiate': {
    pages: [5],
    repeatable: true,
    benefits: [
      {
        name: 'Two Cantrips',
        action_type: 'none',
        trigger: 'when you take this feat',
        effects: [
          'learn two cantrips from the Cleric, Druid, or Wizard spell list',
          'choose Intelligence, Wisdom, or Charisma as your spellcasting ability for these spells',
        ],
      },
      {
        name: 'Level 1 Spell',
        action_type: 'none',
        trigger: 'when you take this feat',
        effects: [
          'choose a level 1 spell from the same list; you always have it prepared',
          'cast it once without a slot per long rest or using spell slots',
        ],
      },
      {
        name: 'Spell Change',
        action_type: 'none',
        trigger: 'when you gain a level',
        effects: [
          'replace one spell chosen for this feat with a different spell of the same level from the same list',
        ],
      },
      {
        name: 'Repeatable',
        action_type: 'none',
        trigger: 'passive',
        effects: ['you can take this feat more than once, choosing a different spell list each time'],
      },
    ],
  },
  'feat.musician': {
    pages: [5],
    benefits: [
      {
        name: 'Instrument Training',
        action_type: 'none',
        trigger: 'passive',
        effects: ['gain proficiency with three musical instruments of your choice'],
      },
      {
        name: 'Encouraging Song',
        action_type: 'none',
        trigger: 'when you finish a short or long rest',
        effects: [
          'play a song on a musical instrument you are proficient with',
          'give Heroic Inspiration to allies who hear the song (up to your proficiency bonus)',
        ],
      },
    ],
  },
  'feat.savage_attacker': {
    pages: [5],
    benefits: [
      {
        name: 'Savage Attacker',
        action_type: 'none',
        trigger: 'once per turn when you hit a target with a weapon',
        effects: ['roll the weapon’s damage dice twice and use either roll'],
      },
    ],
  },
  'feat.skilled': {
    pages: [6],
    repeatable: true,
    benefits: [
      {
        name: 'Skilled',
        action_type: 'none',
        trigger: 'passive',
        effects: ['gain proficiency in any combination of three skills or tools of your choice'],
      },
      {
        name: 'Repeatable',
        action_type: 'none',
        trigger: 'passive',
        effects: ['you can take this feat more than once'],
      },
    ],
  },
  'feat.tavern_brawler': {
    pages: [6],
    benefits: [
      {
        name: 'Enhanced Unarmed Strike',
        action_type: 'none',
        trigger: 'when you hit with an unarmed strike and deal damage',
        effects: ['deal bludgeoning damage equal to 1d4 + Strength modifier instead'],
      },
      {
        name: 'Damage Rerolls',
        action_type: 'none',
        trigger: 'when you roll a damage die for your unarmed strike',
        effects: ['reroll a 1 on the die and use the new roll'],
      },
      {
        name: 'Improvised Weaponry',
        action_type: 'none',
        trigger: 'passive',
        effects: ['gain proficiency with improvised weapons'],
      },
      {
        name: 'Push',
        action_type: 'none',
        trigger: 'once per turn when you hit with an unarmed strike as part of the Attack action',
        effects: ['push the target 5 feet away from you'],
      },
    ],
  },
  'feat.tough': {
    pages: [6],
    benefits: [
      {
        name: 'Tough',
        action_type: 'none',
        trigger: 'when you gain this feat or gain a character level',
        effects: [
          'hit point maximum increases by twice your character level when you gain this feat',
          'hit point maximum increases by 2 whenever you gain a character level thereafter',
        ],
      },
    ],
  },
};

const featEntries = feats.map((feat) => {
  const details = originDetails[feat.id];
  const isOrigin = feat.category === 'Origin';
  const status = details ? 'complete' : 'placeholder';
  return {
    id: feat.id,
    name: feat.name,
    chapter: 5,
    status,
    category: feat.category,
    repeatable: details?.repeatable ?? feat.repeatable ?? false,
    sourceRef: details
      ? {
          file: sourceFile,
          pages: details.pages,
          section: feat.name,
        }
      : undefined,
    prerequisites: [],
    benefits: details?.benefits ?? [],
    notes: details
      ? []
      : isOrigin
        ? ['Placeholder; see Chapter 5 (Feats) for full rules.']
        : ['Placeholder; see Chapter 5 (Feats) for full rules.'],
  };
});

for (const feat of featEntries) {
  writeJson(path.join(featsDir, `${feat.id}.json`), feat);
}

const featListTable = {
  id: 'table.feat_list',
  name: 'Feat List',
  chapter: 5,
  status: 'complete',
  sourceRef: {
    file: sourceFile,
    pages: [2, 3],
    section: 'Feat List',
  },
  columns: ['feat', 'category', 'repeatable'],
  entries: feats.map((f) => ({
    feat: f.name,
    category: f.category,
    repeatable: !!f.repeatable,
  })),
  notes: [
    'Repeatable is true when the Feat List marks the feat with an asterisk.',
  ],
};

const fastCraftingTable = {
  id: 'table.feat.fast_crafting',
  name: 'Fast Crafting',
  chapter: 5,
  status: 'complete',
  sourceRef: {
    file: sourceFile,
    pages: [4],
    section: 'Fast Crafting',
  },
  columns: ["artisan_tools", "crafted_gear"],
  entries: [
    { artisan_tools: "Carpenter's Tools", crafted_gear: 'Ladder, Torch' },
    { artisan_tools: "Leatherworker's Tools", crafted_gear: 'Crossbow Bolt Case, Map or Scroll Case, Pouch' },
    { artisan_tools: "Mason's Tools", crafted_gear: 'Block and Tackle' },
    { artisan_tools: "Potter's Tools", crafted_gear: 'Jug, Lamp' },
    { artisan_tools: "Smith's Tools", crafted_gear: 'Ball Bearings, Bucket, Caltrops, Grappling Hook, Iron Pot' },
    { artisan_tools: "Tinker’s Tools", crafted_gear: 'Bell, Shovel, Tinderbox' },
    { artisan_tools: "Weaver’s Tools", crafted_gear: 'Basket, Rope, Net, Tent' },
    { artisan_tools: "Woodcarver’s Tools", crafted_gear: 'Club, Greatclub, Quarterstaff' },
  ],
  notes: [],
};

writeJson(path.join(tablesDir, 'table.feat_list.json'), featListTable);
writeJson(path.join(tablesDir, 'table.feat.fast_crafting.json'), fastCraftingTable);

const listAll = {
  id: 'list.feats',
  name: 'Feats (All)',
  chapter: 5,
  status: 'complete',
  items: feats.map((f) => f.id),
};

const listByCategory = (category, idSuffix) => ({
  id: `list.feats.${idSuffix}`,
  name: `Feats (${category})`,
  chapter: 5,
  status: 'complete',
  items: feats.filter((f) => f.category === category).map((f) => f.id),
});

const listOrigin = listByCategory('Origin', 'origin');
const listGeneral = listByCategory('General', 'general');
const listFighting = listByCategory('Fighting Style', 'fighting_style');
const listEpic = listByCategory('Epic Boon', 'epic_boon');

writeJson(path.join(listsDir, 'list.feats.json'), listAll);
writeJson(path.join(listsDir, 'list.feats.origin.json'), listOrigin);
writeJson(path.join(listsDir, 'list.feats.general.json'), listGeneral);
writeJson(path.join(listsDir, 'list.feats.fighting_style.json'), listFighting);
writeJson(path.join(listsDir, 'list.feats.epic_boon.json'), listEpic);

const manifest = {
  schema_version: '0.1.0',
  chapter: 5,
  title: 'Feats',
  generated_at: new Date().toISOString().slice(0, 10),
  paths: {
    feats_dir: 'chapter-05/feats',
    tables_dir: 'chapter-05/tables',
    lists_dir: 'chapter-05/lists',
  },
  shards: [
    ...featEntries.map((feat) => ({ id: feat.id, type: 'feat', path: `chapter-05/feats/${feat.id}.json` })),
    { id: 'table.feat_list', type: 'table', path: 'chapter-05/tables/table.feat_list.json' },
    { id: 'table.feat.fast_crafting', type: 'table', path: 'chapter-05/tables/table.feat.fast_crafting.json' },
    { id: listAll.id, type: 'list', path: 'chapter-05/lists/list.feats.json' },
    { id: listOrigin.id, type: 'list', path: 'chapter-05/lists/list.feats.origin.json' },
    { id: listGeneral.id, type: 'list', path: 'chapter-05/lists/list.feats.general.json' },
    { id: listFighting.id, type: 'list', path: 'chapter-05/lists/list.feats.fighting_style.json' },
    { id: listEpic.id, type: 'list', path: 'chapter-05/lists/list.feats.epic_boon.json' },
  ],
};

writeJson(path.join(chapterDir, 'chapter-05.manifest.json'), manifest);

const indexData = {
  chapter: 5,
  title: 'Feats',
  feats: feats.map((f) => f.id),
  tables: ['table.feat_list', 'table.feat.fast_crafting'],
  lists: [listAll.id, listOrigin.id, listGeneral.id, listFighting.id, listEpic.id],
};

writeJson(path.join(chapterDir, 'Chapter-05-index.json'), indexData);

const md = `# Chapter 5: Feats

> **Source:** Player's Handbook - Chapter 5 (D&D 5e 2024)
> **Purpose:** Defines feat options, categories, and feat-specific rules.

---

## Scope

Feats are special features not tied to a class. This chapter provides:

- **Feat list** with categories and repeatable indicators
- **Feat shards** containing prerequisites and benefits
- **Tables** used by specific feats (e.g., Fast Crafting)

---

## Engine References

- **Manifest:** chapter-05/chapter-05.manifest.json
- **Schema:** schemas/chapter-05.schema.json
- **Feat shards:** chapter-05/feats/*
- **Tables:** chapter-05/tables/*
- **Lists:** chapter-05/lists/*
`;

fs.writeFileSync(path.join(chapterDir, 'Chapter_5_Feats.md'), md, 'utf8');

console.log(`Chapter 5 shards generated (${feats.length} feats).`);
