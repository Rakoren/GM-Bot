import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, "docs", "sources", "Monster Manual");
const outDir = path.join(repoRoot, "docs", "mm-2025");
const outListsDir = path.join(outDir, "lists");
const outMonstersDir = path.join(outDir, "monsters");
const outAnimalsDir = path.join(outDir, "animals");

const stopHeadings = new Set([
  "CONTENTS",
  "INDEX",
  "MONSTERS",
  "MONSTERS (A)",
  "MONSTERS (B)",
  "MONSTERS (C)",
  "MONSTERS (D)",
  "MONSTERS (E)",
  "ANIMALS",
  "HOW TO USE A MONSTER",
  "INTRODUCTION",
  "ACTIONS",
  "REACTIONS",
  "BONUS ACTIONS",
  "LEGENDARY ACTIONS",
  "LAIR ACTIONS",
  "REGIONAL EFFECTS",
  "STAT BLOCK",
]);

const isAllCapsHeading = (line) => {
  if (!line) return false;
  if (line.length < 3 || line.length > 60) return false;
  if (stopHeadings.has(line)) return false;
  if (!/^[A-Z][A-Z\s'(),-]+$/.test(line)) return false;
  return true;
};

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const parseAbilities = (text) => {
  const keys = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  const abilities = {};
  for (const key of keys) {
    const match =
      text.match(new RegExp(`${key}\\s+(\\d+)\\s*\\(([+-]\\d+)\\)`)) ||
      text.match(new RegExp(`${key}\\s+(\\d+)\\s+([+-]\\d+)`));
    if (match) {
      abilities[key] = {
        score: Number(match[1]),
        mod: match[2],
      };
    }
  }
  return Object.keys(abilities).length ? abilities : null;
};

const pickLine = (lines, label) => {
  const line = lines.find((l) => l.startsWith(label));
  return line ? line.slice(label.length).trim() : null;
};

const findSizeLine = (text) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^(Tiny|Small|Medium|Large|Huge|Gargantuan)\b/.test(l)) || null;

const parseMonsterBlock = (name, blockText, sourceFile, idPrefix, sectionName) => {
  const lines = blockText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const sizeTypeAlignment = findSizeLine(blockText);
  const abilities = parseAbilities(blockText);

  const armorClassLine = pickLine(lines, "AC");
  const hpLine = pickLine(lines, "HP");
  const speedLine = pickLine(lines, "Speed");

  const armorClass = armorClassLine ? Number(armorClassLine.split(" ")[0]) : null;
  const hpMatch = hpLine ? hpLine.match(/^(\d+)\s+\(([^)]+)\)/) : null;

  const saves = pickLine(lines, "Saving Throws");
  const skills = pickLine(lines, "Skills");
  const vulnerabilities = pickLine(lines, "Damage Vulnerabilities");
  const resistances = pickLine(lines, "Damage Resistances");
  const immunities = pickLine(lines, "Damage Immunities");
  const conditionImmunities = pickLine(lines, "Condition Immunities");
  const senses = pickLine(lines, "Senses");
  const languages = pickLine(lines, "Languages");
  const cr = pickLine(lines, "CR");

  return {
    id: `${idPrefix}.${slugify(name)}`,
    name,
    status: "draft",
    size_type_alignment: sizeTypeAlignment,
    size: sizeTypeAlignment ? sizeTypeAlignment.split(" ")[0] : null,
    creature_type: sizeTypeAlignment
      ? sizeTypeAlignment
          .split(",")[0]
          ?.replace(/^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+/, "")
          .replace(/^(or)\s+/i, "")
          .trim() || null
      : null,
    alignment: sizeTypeAlignment ? sizeTypeAlignment.split(",").slice(1).join(",").trim() || null : null,
    armor_class: armorClass,
    hit_points: hpMatch ? Number(hpMatch[1]) : null,
    hit_dice: hpMatch ? hpMatch[2] : null,
    speed: speedLine,
    abilities,
    saves,
    skills,
    resistances,
    immunities,
    vulnerabilities,
    condition_immunities: conditionImmunities,
    senses,
    languages,
    cr,
    traits: [],
    actions: [],
    bonus_actions: [],
    reactions: [],
    legendary_actions: [],
    lair_actions: [],
    regional_effects: [],
    raw_text: blockText.trim(),
    sourceRef: {
      file: `docs/sources/Monster Manual/${sourceFile}`,
      pages: [],
      section: sectionName,
    },
    notes: [],
  };
};

const extractMonsterBlocks = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const startIndexes = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    if (isAllCapsHeading(line) && next && next.startsWith("AC ")) {
      startIndexes.push(i);
    }
  }

  const blocks = [];
  for (let i = 0; i < startIndexes.length; i++) {
    const start = startIndexes[i];
    const end = i + 1 < startIndexes.length ? startIndexes[i + 1] : lines.length;
    const name = lines[start];
    const slice = lines.slice(start + 1, end);
    blocks.push({ name, lines: slice });
  }

  return blocks;
};

const main = async () => {
  const pdfName = process.argv[2];
  const batchIndex = Number(process.argv[3] || "1");
  const batchSize = Number(process.argv[4] || "25");
  const offset = Number(process.argv[5] || "0");
  const kind = (process.argv[6] || "monsters").toLowerCase();
  const idPrefix = kind === "animals" ? "animal" : "monster";
  const sectionName = kind === "animals" ? "Animals" : "Monsters";
  const outEntitiesDir = kind === "animals" ? outAnimalsDir : outMonstersDir;

  if (!pdfName) {
    console.error("Usage: node tools/mm-2025-batch.mjs <pdfName> [batchIndex] [batchSize] [offset]");
    process.exit(1);
  }

  fs.mkdirSync(outListsDir, { recursive: true });
  fs.mkdirSync(outMonstersDir, { recursive: true });
  fs.mkdirSync(outAnimalsDir, { recursive: true });

  const pdfPath = path.join(sourceDir, pdfName);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`);
  }

  const data = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data });
  const parsed = await parser.getText();
  await parser.destroy();
  const text = parsed.text || "";

  const blocks = extractMonsterBlocks(text);
  const ordered = blocks
    .map((b) => ({
      name: b.name,
      text: b.lines.join("\n"),
    }))
    .filter((b) => b.text.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const slice = ordered.slice(offset, offset + batchSize);

  const listEntries = [];
  for (const item of slice) {
    const monster = parseMonsterBlock(item.name, item.text, pdfName, idPrefix, sectionName);
    const outPath = path.join(outEntitiesDir, `${monster.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(monster, null, 2));
    listEntries.push({
      id: monster.id,
      name: monster.name,
      file: `docs/mm-2025/${kind}/${monster.id}.json`,
    });
  }

  const listId = `list.mm-2025.${kind}.batch_${String(batchIndex).padStart(3, "0")}`;
  const listPath = path.join(outListsDir, `${listId}.json`);
  fs.writeFileSync(
    listPath,
    JSON.stringify(
      {
        id: listId,
        name: `MM 2025 ${sectionName} Batch ${batchIndex}`,
        entries: listEntries,
        sourceRef: {
          file: `docs/sources/Monster Manual/${pdfName}`,
          pages: [],
          section: sectionName,
        },
      },
      null,
      2
    )
  );
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
