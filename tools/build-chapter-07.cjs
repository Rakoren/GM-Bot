const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sourcesDir = path.join(root, "docs", "sources", "phb2024", "09-chapter7");
const spellDescTxt = path.join(
  sourcesDir,
  "10-Spell Descriptions - Player’s Handbook - Dungeons & Dragons - Sources - D&D Beyond.txt"
);

const outDir = path.join(root, "docs", "chapter-07");
const spellsDir = path.join(outDir, "spells");
const tablesDir = path.join(outDir, "tables");
const listsDir = path.join(outDir, "lists");

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
ensureDir(outDir);
ensureDir(spellsDir);
ensureDir(tablesDir);
ensureDir(listsDir);

const raw = fs.readFileSync(spellDescTxt, "utf8");
const lines = raw.split(/\r?\n/);

const linesWithPages = lines.map((line, index) => {
  let page = null;
  for (let i = index; i >= 0; i -= 1) {
    const m = lines[i].match(/^--\s+(\d+)\s+of\s+\d+\s+--$/);
    if (m) {
      page = Number(m[1]);
      break;
    }
  }
  return { line, page };
});

const classIdByName = new Map([
  ["Bard", "class.bard"],
  ["Cleric", "class.cleric"],
  ["Druid", "class.druid"],
  ["Paladin", "class.paladin"],
  ["Ranger", "class.ranger"],
  ["Sorcerer", "class.sorcerer"],
  ["Warlock", "class.warlock"],
  ["Wizard", "class.wizard"],
]);

const isLevelLine = (line) => {
  const trimmed = line.trim();
  const levelMatch = trimmed.match(/^Level\s+(\d+)\s+([A-Za-z]+)\s*(\(([^)]+)\))?$/);
  if (levelMatch) {
    return {
      level: Number(levelMatch[1]),
      school: levelMatch[2],
      classes: levelMatch[4] ? levelMatch[4].split(",").map((s) => s.trim()) : [],
    };
  }
  const cantripMatch = trimmed.match(/^([A-Za-z]+)\s+Cantrip\s*(\(([^)]+)\))?$/);
  if (cantripMatch) {
    return {
      level: 0,
      school: cantripMatch[1],
      classes: cantripMatch[3] ? cantripMatch[3].split(",").map((s) => s.trim()) : [],
    };
  }
  return null;
};

const isSpellNameLine = (line, nextLine) => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^Spells\s*\([A-Z]\)/.test(trimmed)) return false;
  if (/^Chapter\s+\d+/i.test(trimmed)) return false;
  if (/^CH\.\s+\d+/.test(trimmed)) return false;
  if (trimmed.includes(":")) return false;
  if (!nextLine) return false;
  return Boolean(isLevelLine(nextLine));
};

const parseComponents = (line) => {
  const rawParts = line.replace(/^Components:\s*/i, "").trim();
  const hasParen = rawParts.includes("(") && rawParts.includes(")");
  const flagsPart = hasParen ? rawParts.slice(0, rawParts.indexOf("(")).trim() : rawParts;
  const flags = flagsPart
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const material = hasParen
    ? rawParts.slice(rawParts.indexOf("(") + 1, rawParts.lastIndexOf(")")).trim()
    : null;
  return { flags, material };
};

const joinParagraphs = (rawLines) => {
  const paragraphs = [];
  let current = [];
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current.length) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      continue;
    }
    current.push(trimmed);
  }
  if (current.length) paragraphs.push(current.join(" "));
  return paragraphs;
};

const spells = [];
for (let i = 0; i < linesWithPages.length - 1; i += 1) {
  const current = linesWithPages[i];
  const next = linesWithPages[i + 1];
  if (!isSpellNameLine(current.line, next.line)) continue;

  const name = current.line.trim();
  const levelInfo = isLevelLine(next.line.trim());
  if (!levelInfo) continue;

  const spell = {
    name,
    level: levelInfo.level,
    school: levelInfo.school,
    classes: levelInfo.classes.map((c) => classIdByName.get(c) || c),
    page: current.page ?? next.page ?? null,
    casting_time: null,
    range: null,
    components: null,
    duration: null,
    description: [],
    higher_level: null,
  };

  let j = i + 2;
  for (; j < linesWithPages.length; j += 1) {
    const line = linesWithPages[j].line.trim();
    if (line.startsWith("Casting Time:")) {
      spell.casting_time = line.replace("Casting Time:", "").trim();
      continue;
    }
    if (line.startsWith("Range:")) {
      spell.range = line.replace("Range:", "").trim();
      continue;
    }
    if (line.startsWith("Components:")) {
      spell.components = parseComponents(line);
      continue;
    }
    if (line.startsWith("Duration:")) {
      spell.duration = line.replace("Duration:", "").trim();
      j += 1;
      break;
    }
  }

  const descLines = [];
  for (; j < linesWithPages.length; j += 1) {
    const line = linesWithPages[j].line;
    const nextLine = linesWithPages[j + 1]?.line;
    if (isSpellNameLine(line, nextLine)) break;
    if (/^Spells\s*\([A-Z]\)/.test(line.trim())) continue;
    descLines.push(line);
  }

  const paragraphs = joinParagraphs(descLines);
  const higherIndex = paragraphs.findIndex((p) =>
    p.startsWith("Using a Higher-Level Spell Slot.")
  );
  if (higherIndex >= 0) {
    spell.higher_level = paragraphs[higherIndex]
      .replace("Using a Higher-Level Spell Slot.", "")
      .trim();
    spell.description = paragraphs.filter((_, idx) => idx !== higherIndex);
  } else {
    spell.description = paragraphs;
  }

  spells.push(spell);
}

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

const spellIds = [];
for (const spell of spells) {
  const id = `spell.${slugify(spell.name)}`;
  spellIds.push(id);
  const doc = {
    id,
    name: spell.name,
    chapter: 7,
    status: "complete",
    level: spell.level,
    school: spell.school,
    classes: spell.classes,
    casting_time: spell.casting_time,
    range: spell.range,
    components: spell.components,
    duration: spell.duration,
    description: spell.description,
    higher_level: spell.higher_level,
    sourceRef: {
      file: path
        .join(
          "docs",
          "sources",
          "phb2024",
          "09-chapter7",
          "10-Spell Descriptions - Player’s Handbook - Dungeons & Dragons - Sources - D&D Beyond.pdf"
        )
        .replace(/\\/g, "/"),
      pages: spell.page ? [spell.page] : [],
      section: "Spell Descriptions",
    },
    notes: [],
  };
  fs.writeFileSync(
    path.join(spellsDir, `${id}.json`),
    JSON.stringify(doc, null, 2) + "\n",
    "utf8"
  );
}

const listAll = {
  id: "list.spells.all",
  name: "All Spells",
  chapter: 7,
  status: "complete",
  items: spellIds,
};
fs.writeFileSync(
  path.join(listsDir, "list.spells.all.json"),
  JSON.stringify(listAll, null, 2) + "\n",
  "utf8"
);

for (let level = 0; level <= 9; level += 1) {
  const list = {
    id: `list.spells.level_${level}`,
    name: level === 0 ? "Cantrips" : `Level ${level} Spells`,
    chapter: 7,
    status: "complete",
    items: spells
      .filter((s) => s.level === level)
      .map((s) => `spell.${slugify(s.name)}`),
  };
  fs.writeFileSync(
    path.join(listsDir, `list.spells.level_${level}.json`),
    JSON.stringify(list, null, 2) + "\n",
    "utf8"
  );
}

const classLists = new Map();
for (const spell of spells) {
  for (const cls of spell.classes) {
    if (!classLists.has(cls)) classLists.set(cls, []);
    classLists.get(cls).push(`spell.${slugify(spell.name)}`);
  }
}
for (const [cls, ids] of classLists.entries()) {
  const list = {
    id: `list.spells.${cls.replace("class.", "class_")}`,
    name: `Spells (${cls})`,
    chapter: 7,
    status: "complete",
    items: ids,
  };
  fs.writeFileSync(
    path.join(listsDir, `list.spells.${cls.replace("class.", "class_")}.json`),
    JSON.stringify(list, null, 2) + "\n",
    "utf8"
  );
}

const table = {
  id: "table.spells.list",
  name: "Spells",
  chapter: 7,
  status: "complete",
  sourceRef: {
    file: path
      .join(
        "docs",
        "sources",
        "phb2024",
        "09-chapter7",
        "10-Spell Descriptions - Player’s Handbook - Dungeons & Dragons - Sources - D&D Beyond.pdf"
      )
      .replace(/\\/g, "/"),
    pages: [],
    section: "Spell Descriptions",
  },
  columns: ["id", "name", "level", "school", "classes"],
  entries: spells.map((spell) => ({
    id: `spell.${slugify(spell.name)}`,
    name: spell.name,
    level: spell.level,
    school: spell.school,
    classes: spell.classes,
  })),
  notes: [],
};
fs.writeFileSync(
  path.join(tablesDir, "table.spells.list.json"),
  JSON.stringify(table, null, 2) + "\n",
  "utf8"
);

const manifest = {
  schema_version: "0.1.0",
  chapter: 7,
  title: "Spells",
  generated_at: new Date().toISOString().slice(0, 10),
  paths: {
    spells_dir: "chapter-07/spells",
    tables_dir: "chapter-07/tables",
    lists_dir: "chapter-07/lists",
  },
  shards: [
    ...spellIds.map((id) => ({
      id,
      type: "spell",
      path: `chapter-07/spells/${id}.json`,
    })),
    {
      id: "table.spells.list",
      type: "table",
      path: "chapter-07/tables/table.spells.list.json",
    },
    {
      id: "list.spells.all",
      type: "list",
      path: "chapter-07/lists/list.spells.all.json",
    },
    ...Array.from({ length: 10 }).map((_, idx) => ({
      id: `list.spells.level_${idx}`,
      type: "list",
      path: `chapter-07/lists/list.spells.level_${idx}.json`,
    })),
    ...Array.from(classLists.keys()).map((cls) => ({
      id: `list.spells.${cls.replace("class.", "class_")}`,
      type: "list",
      path: `chapter-07/lists/list.spells.${cls.replace("class.", "class_")}.json`,
    })),
  ],
};

fs.writeFileSync(
  path.join(outDir, "chapter-07.manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8"
);

const index = {
  chapter: 7,
  title: "Spells",
  spells: spellIds,
  tables: ["table.spells.list"],
  lists: [
    "list.spells.all",
    ...Array.from({ length: 10 }).map((_, idx) => `list.spells.level_${idx}`),
    ...Array.from(classLists.keys()).map(
      (cls) => `list.spells.${cls.replace("class.", "class_")}`
    ),
  ],
};
fs.writeFileSync(
  path.join(outDir, "Chapter-07-index.json"),
  JSON.stringify(index, null, 2) + "\n",
  "utf8"
);

const md = `# Chapter 7: Spells\n\n` +
  `> **Source:** Player's Handbook - Chapter 7 (D&D 5e 2024)\n` +
  `> **Purpose:** Defines spell rules and individual spell descriptions.\n\n` +
  `---\n\n` +
  `## Scope\n\n` +
  `- **Spell shards** include full spell text and casting requirements.\n` +
  `- **Lists** support filtering by level and class.\n\n` +
  `---\n\n` +
  `## Engine References\n\n` +
  `- **Manifest:** chapter-07/chapter-07.manifest.json\n` +
  `- **Schema:** schemas/chapter-07.schema.json\n` +
  `- **Spell shards:** chapter-07/spells/*\n` +
  `- **Tables:** chapter-07/tables/*\n` +
  `- **Lists:** chapter-07/lists/*\n`;

fs.writeFileSync(path.join(outDir, "Chapter_7_Spells.md"), md, "utf8");

console.log(`Chapter 7 spells generated (${spellIds.length} spells).`);
