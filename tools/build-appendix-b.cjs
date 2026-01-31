const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sourcesDir = path.join(root, "docs", "sources", "phb2024", "appendix-b");
const sourceTxt = path.join(
  sourcesDir,
  "12-Creature Stat Blocks - Player’s Handbook - Dungeons & Dragons - Sources - D&D Beyond.txt"
);

const outDir = path.join(root, "docs", "appendix-b");
const creaturesDir = path.join(outDir, "creatures");
const tablesDir = path.join(outDir, "tables");
const listsDir = path.join(outDir, "lists");

fs.mkdirSync(creaturesDir, { recursive: true });
fs.mkdirSync(tablesDir, { recursive: true });
fs.mkdirSync(listsDir, { recursive: true });

const raw = fs.readFileSync(sourceTxt, "utf8");
const lines = raw.split(/\r?\n/);

let currentPage = null;
const linesWithPages = lines.map((line) => {
  const m = line.match(/^--\s+(\d+)\s+of\s+\d+\s+--$/);
  if (m) currentPage = Number(m[1]);
  return { line, page: currentPage };
});

const isAllCapsName = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length < 2) return false;
  if (/^APPENDIX|^RULES GLOSSARY/i.test(trimmed)) return false;
  if (/\d/.test(trimmed)) return false;
  if (!/^[A-Z][A-Z\s'()-]+$/.test(trimmed)) return false;
  return true;
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

const extractAbility = (line, key) => {
  const re = new RegExp(`${key}\\s+(\\d+)\\s+([+\\-]\\d+)\\s+([+\\-]\\d+)`);
  const match = line.match(re);
  if (!match) return null;
  return { score: Number(match[1]), mod: match[2], save: match[3] };
};

const parseTraitsOrActions = (linesSection) => {
  const entries = [];
  let current = null;
  for (const line of linesSection) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^Hit:/i.test(trimmed)) {
      if (current) current.text = `${current.text} ${trimmed}`.trim();
      continue;
    }
    if (/damage\.$/i.test(trimmed)) {
      if (current) current.text = `${current.text} ${trimmed}`.trim();
      continue;
    }
    const match = trimmed.match(/^([^.]+)\.(\s+.+)?$/);
    if (match) {
      if (current) entries.push(current);
      current = {
        name: match[1].trim(),
        text: (match[2] || "").trim(),
      };
      continue;
    }
    if (current) current.text = `${current.text} ${trimmed}`.trim();
  }
  if (current) entries.push(current);
  return entries;
};

const creatures = [];
for (let i = 0; i < linesWithPages.length - 1; i += 1) {
  const line = linesWithPages[i].line.trim();
  const nextLine = linesWithPages[i + 1]?.line?.trim() ?? "";
  if (!isAllCapsName(line)) continue;
  if (!nextLine.startsWith("AC ")) continue;

  const startIndex = i;
  let endIndex = i + 1;
  for (; endIndex < linesWithPages.length; endIndex += 1) {
    const candidate = linesWithPages[endIndex].line.trim();
    const candidateNext = linesWithPages[endIndex + 1]?.line?.trim() ?? "";
    if (endIndex > startIndex + 1 && isAllCapsName(candidate) && candidateNext.startsWith("AC ")) {
      break;
    }
  }

  const normalize = (value) =>
    value
      .replace(/\t+/g, " ")
      .replace(/\u2212/g, "-")
      .replace(/\s+/g, " ")
      .trim();

  const block = linesWithPages.slice(startIndex, endIndex);
  const name = block[0].line.trim();
  const page = block[0].page ?? null;
  const textLines = block.map((b) => normalize(b.line)).filter(Boolean);

  const getLine = (prefix) => textLines.find((l) => l.startsWith(prefix));
  const acLine = getLine("AC ");
  const hpLine = getLine("HP ");
  const speedLine = getLine("Speed ");
  const skillsLine = getLine("Skills ");
  const resistLine = getLine("Resistances ");
  const immLine = getLine("Immunities ");
  const vulnLine = getLine("Vulnerabilities ");
  const condImmLine = getLine("Condition Immunities ");
  const sensesLine = getLine("Senses ");
  const languagesLine = getLine("Languages ");
  const crLine = getLine("CR ");

  const sizeLine = textLines
    .slice()
    .reverse()
    .find((l) => /^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+.+,\s+.+$/.test(l));
  let size = null;
  let creatureType = null;
  let alignment = null;
  if (sizeLine) {
    const match = sizeLine.match(/^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+(.+?),\s+(.+)$/);
    if (match) {
      size = match[1];
      creatureType = match[2];
      alignment = match[3];
    }
  }

  const acMatch = acLine?.match(/^AC\s+(\d+)\s+Initiative\s+([+\-]?\d+)\s+\((\d+)\)/);
  const hpMatch = hpLine?.match(/^HP\s+(\d+)\s+\(([^)]+)\)/);
  const speedMatch = speedLine?.match(/^Speed\s+(.+)$/);

  const str = extractAbility(textLines.find((l) => l.startsWith("STR ")) || "", "STR");
  const dex = extractAbility(textLines.find((l) => l.startsWith("DEX ")) || "", "DEX");
  const con = extractAbility(textLines.find((l) => l.startsWith("CON ")) || "", "CON");
  const int = extractAbility(textLines.find((l) => l.startsWith("INT ")) || "", "INT");
  const wis = extractAbility(textLines.find((l) => l.startsWith("WIS ")) || "", "WIS");
  const cha = extractAbility(textLines.find((l) => l.startsWith("CHA ")) || "", "CHA");

  const traitsIndex = textLines.indexOf("Traits");
  const actionsIndex = textLines.indexOf("Actions");
  const sizeIndex = sizeLine ? textLines.indexOf(sizeLine) : -1;
  const traitsLines =
    traitsIndex >= 0 && actionsIndex > traitsIndex
      ? textLines.slice(traitsIndex + 1, actionsIndex)
      : [];
  const actionsLines =
    actionsIndex >= 0
      ? textLines.slice(actionsIndex + 1, sizeIndex > actionsIndex ? sizeIndex : undefined)
      : [];

  const doc = {
    id: `creature.${slugify(name)}`,
    name,
    chapter: "appendix-b",
    status: "complete",
    size_type_alignment: sizeLine || null,
    size,
    creature_type: creatureType,
    alignment,
    armor_class: acMatch ? Number(acMatch[1]) : null,
    initiative: acMatch ? acMatch[2] : null,
    initiative_score: acMatch ? Number(acMatch[3]) : null,
    hit_points: hpMatch ? Number(hpMatch[1]) : null,
    hit_dice: hpMatch ? hpMatch[2] : null,
    speed: speedMatch ? speedMatch[1] : null,
    abilities: {
      STR: str,
      DEX: dex,
      CON: con,
      INT: int,
      WIS: wis,
      CHA: cha,
    },
    skills: skillsLine ? skillsLine.replace("Skills ", "").trim() : null,
    resistances: resistLine ? resistLine.replace("Resistances ", "").trim() : null,
    immunities: immLine ? immLine.replace("Immunities ", "").trim() : null,
    vulnerabilities: vulnLine ? vulnLine.replace("Vulnerabilities ", "").trim() : null,
    condition_immunities: condImmLine ? condImmLine.replace("Condition Immunities ", "").trim() : null,
    senses: sensesLine ? sensesLine.replace("Senses ", "").trim() : null,
    languages: languagesLine ? languagesLine.replace("Languages ", "").trim() : null,
    cr: crLine ? crLine.replace("CR ", "").trim() : null,
    traits: parseTraitsOrActions(traitsLines),
    actions: parseTraitsOrActions(actionsLines),
    sourceRef: {
      file: "docs/sources/phb2024/appendix-b/12-Creature Stat Blocks - Player's Handbook - Dungeons & Dragons - Sources - D&D Beyond.pdf",
      pages: page ? [page] : [],
      section: "Appendix B: Creature Stat Blocks",
    },
    notes: [],
  };

  creatures.push(doc);
}

const writeJson = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");

const creatureIds = [];
for (const creature of creatures) {
  creatureIds.push(creature.id);
  writeJson(path.join(creaturesDir, `${creature.id}.json`), creature);
}

writeJson(path.join(listsDir, "list.creatures.all.json"), {
  id: "list.creatures.all",
  name: "All Creatures",
  chapter: "appendix-b",
  status: "complete",
  items: creatureIds,
});

writeJson(path.join(tablesDir, "table.creatures.list.json"), {
  id: "table.creatures.list",
  name: "Creatures",
  chapter: "appendix-b",
  status: "complete",
  sourceRef: {
    file: "docs/sources/phb2024/appendix-b/12-Creature Stat Blocks - Player's Handbook - Dungeons & Dragons - Sources - D&D Beyond.pdf",
    pages: [1, 24],
    section: "Appendix B: Creature Stat Blocks",
  },
  columns: ["id", "name", "cr", "size_type_alignment"],
  entries: creatures.map((c) => ({
    id: c.id,
    name: c.name,
    cr: c.cr,
    size_type_alignment: c.size_type_alignment,
  })),
  notes: [],
});

const manifest = {
  schema_version: "0.1.0",
  chapter: "appendix-b",
  title: "Appendix B: Creature Stat Blocks",
  generated_at: new Date().toISOString().slice(0, 10),
  paths: {
    creatures_dir: "appendix-b/creatures",
    tables_dir: "appendix-b/tables",
    lists_dir: "appendix-b/lists",
  },
  shards: [
    ...creatureIds.map((id) => ({
      id,
      type: "creature",
      path: `appendix-b/creatures/${id}.json`,
    })),
    {
      id: "table.creatures.list",
      type: "table",
      path: "appendix-b/tables/table.creatures.list.json",
    },
    {
      id: "list.creatures.all",
      type: "list",
      path: "appendix-b/lists/list.creatures.all.json",
    },
  ],
};

writeJson(path.join(outDir, "appendix-b.manifest.json"), manifest);

writeJson(path.join(outDir, "Appendix-B-index.json"), {
  appendix: "B",
  title: "Creature Stat Blocks",
  creatures: creatureIds,
  tables: ["table.creatures.list"],
  lists: ["list.creatures.all"],
});

const md = `# Appendix B: Creature Stat Blocks\n\n` +
  `> **Source:** Player's Handbook - Appendix B (D&D 5e 2024)\n` +
  `> **Purpose:** Provides creature stat blocks referenced in the PHB.\n\n` +
  `---\n\n` +
  `## Engine References\n\n` +
  `- **Manifest:** appendix-b/appendix-b.manifest.json\n` +
  `- **Schema:** schemas/appendix-b.schema.json\n` +
  `- **Creature shards:** appendix-b/creatures/*\n` +
  `- **Tables:** appendix-b/tables/*\n` +
  `- **Lists:** appendix-b/lists/*\n`;

fs.writeFileSync(path.join(outDir, "Appendix_B_Creature_Stat_Blocks.md"), md, "utf8");

console.log(`Appendix B creatures generated (${creatures.length}).`);
