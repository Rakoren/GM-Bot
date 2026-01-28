import fs from "fs";
import path from "path";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node convert-spell-levels-to-entries.mjs <spell_list_file.json>");
  process.exit(1);
}

const raw = fs.readFileSync(filePath, "utf8");
const data = JSON.parse(raw);

if (!data.levels) {
  console.error("❌ No 'levels' property found. Nothing to convert.");
  process.exit(1);
}

const entries = [];

for (const [levelStr, spells] of Object.entries(data.levels)) {
  const level = Number(levelStr);

  for (const spell of spells) {
    entries.push({level, name: spell.name, school: spell.school, special_flags: spell.special ?? []});
}

// Remove old structure
delete data.levels;

// Add normalized structure
data.entries = entries;

// Optional but nice
data.levels_present = [...new Set(entries.map(e => e.level))].sort((a,b)=>a-b);

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

console.log(`✅ Converted ${entries.length} spells → entries[]`);}
