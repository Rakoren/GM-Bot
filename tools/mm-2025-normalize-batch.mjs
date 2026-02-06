import fs from "fs";
import path from "path";

const repoRoot = process.cwd();

const normalizeText = (value) =>
  value
    .replace(/[–—−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');

const parseAbilities = (text) => {
  const keys = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  const abilities = {};
  const cleaned = normalizeText(text);
  for (const key of keys) {
    const match =
      cleaned.match(new RegExp(`${key}\\s+(\\d+)\\s*\\(([+-]\\d+)\\)`)) ||
      cleaned.match(new RegExp(`${key}\\s+(\\d+)\\s+([+-]\\d+)`));
    if (match) {
      abilities[key] = {
        score: Number(match[1]),
        mod: match[2],
      };
    }
  }
  return Object.keys(abilities).length ? abilities : null;
};

const splitSections = (lines) => {
  const sectionKeys = [
    "Traits",
    "Actions",
    "Bonus Actions",
    "Reactions",
    "Legendary Actions",
    "Lair Actions",
    "Regional Effects",
  ];
  const sections = {};
  let current = null;

  for (const line of lines) {
    if (/^Habitat:/.test(line) || /^Treasure:/.test(line)) {
      continue;
    }
    if (line === "MOD" || line === "SAVE" || line === "MOD SAVE") {
      continue;
    }
    if (/^Gear\s+/i.test(line)) {
      continue;
    }
    const header = sectionKeys.find((key) => line === key);
    if (header) {
      current = header;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (current) sections[current].push(line);
  }

  return sections;
};

const parseEntries = (lines) => {
  const entries = [];
  let current = null;

  for (const rawLine of lines) {
    const line = normalizeText(rawLine);
    const entryMatch = line.match(/^([A-Z][A-Za-z0-9'(),\-\/\s]+?)\.\s*(.*)$/);
    if (entryMatch) {
      const entryName = entryMatch[1].trim();
      if (
        [
          "Hit",
          "Success",
          "Failure",
          "Miss",
          "Hit or Miss",
          "Failure or Success",
          "First Failure",
          "Second Failure",
          "Cone",
          "Line",
          "Piercing damage",
          "Slashing damage",
          "Bludgeoning damage",
        ].includes(entryName) ||
        entryName.startsWith("Emanation ")
      ) {
        if (current) {
          current.text = `${current.text} ${line}`.trim();
        }
        continue;
      }
      if (
        current &&
        entryName.toLowerCase().includes("condition") &&
        /failure|success/i.test(current.text || "")
      ) {
        current.text = `${current.text} ${line}`.trim();
        continue;
      }
      if (current && current.name === "Wishes" && entryName.startsWith("Wish")) {
        current.text = `${current.text} ${line}`.trim();
        continue;
      }
      if (current && (entryName.startsWith("AC ") || entryName.startsWith("In ") || entryName.startsWith("Mending"))) {
        current.text = `${current.text} ${line}`.trim();
        continue;
      }
      if (
        current &&
        (entryName.toLowerCase().includes("attack") ||
          entryName.toLowerCase().includes("damage") ||
          entryName.toLowerCase().includes("points") ||
          entryName.toLowerCase().includes("material plane") ||
          entryName.toLowerCase().includes("huge or smaller")) &&
        (current.text || "").length > 0
      ) {
        current.text = `${current.text} ${line}`.trim();
        continue;
      }
      const previousTail = current?.text?.trim().toLowerCase();
      if (
        previousTail &&
        (previousTail.endsWith("either") ||
          previousTail.endsWith("and") ||
          previousTail.endsWith("or") ||
          previousTail.endsWith(":") ||
          previousTail.endsWith("cast") ||
          previousTail.endsWith("casts") ||
          previousTail.endsWith("to cast") ||
          previousTail.endsWith("uses"))
      ) {
        current.text = `${current.text} ${line}`.trim();
        continue;
      }

      if (current) entries.push(current);
      current = {
        name: entryMatch[1].trim(),
        text: entryMatch[2].trim(),
      };
      continue;
    }

    if (current) {
      current.text = current.text ? `${current.text} ${line}` : line;
    }
  }

  if (current) entries.push(current);
  return entries;
};

const readListEntries = (listPath) => {
  const list = JSON.parse(fs.readFileSync(listPath, "utf8"));
  return list.entries || [];
};

const normalizeMonster = (monsterPath) => {
  const monster = JSON.parse(fs.readFileSync(monsterPath, "utf8"));
  if (!monster.raw_text) return;

  const raw = normalizeText(monster.raw_text);
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  monster.notes = [];
  monster.abilities = parseAbilities(raw);
  if (!monster.size_type_alignment) {
    for (const line of lines) {
      if (/\b(Tiny|Small|Medium|Large|Huge|Gargantuan)\b.*,\s*[A-Za-z ]+/i.test(line)) {
        const match = line.match(/\b(Tiny|Small|Medium|Large|Huge|Gargantuan)\b.*,\s*[A-Za-z ]+/i);
        if (match) {
          monster.size_type_alignment = match[0].trim();
          break;
        }
      }
    }
  }
  if (monster.size_type_alignment) {
    monster.size = monster.size_type_alignment.split(" ")[0];
    const typeChunk = monster.size_type_alignment.split(",")[0];
    monster.creature_type = typeChunk
      .replace(/\b(Tiny|Small|Medium|Large|Huge|Gargantuan|or)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    monster.alignment = monster.size_type_alignment.split(",").slice(1).join(",").trim() || null;
  }

  const sizeLine = monster.size_type_alignment;
  const allowedPrefixes = [
    "AC ",
    "HP ",
    "Speed ",
    "STR ",
    "DEX ",
    "CON ",
    "INT ",
    "WIS ",
    "CHA ",
    "Skills ",
    "Senses ",
    "Languages ",
    "CR ",
    "Saving Throws ",
    "Damage Vulnerabilities",
    "Damage Resistances",
    "Damage Immunities",
    "Condition Immunities",
    "Resistances ",
    "Immunities ",
    "Vulnerabilities ",
  ];
  const sectionKeys = [
    "Traits",
    "Actions",
    "Bonus Actions",
    "Reactions",
    "Legendary Actions",
    "Lair Actions",
    "Regional Effects",
  ];
  let seenSectionHeader = false;
  const rawLines = sizeLine ? lines.filter((line) => line !== sizeLine) : lines;
  const filteredLines = [];
  let skipLore = false;
  let seenActionSection = false;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const next = rawLines[i + 1] || "";

    if (line.startsWith("-- ")) {
      if (seenActionSection) break;
      continue;
    }
    if (line.startsWith("ARTIST:")) {
      continue;
    }

    if (sectionKeys.includes(line)) {
      seenSectionHeader = true;
      skipLore = false;
      if (
        line === "Actions" ||
        line === "Bonus Actions" ||
        line === "Reactions" ||
        line === "Legendary Actions" ||
        line === "Lair Actions" ||
        line === "Regional Effects"
      ) {
        seenActionSection = true;
      }
      filteredLines.push(line);
      continue;
    }

    if (skipLore) {
      const entryMatch = line.match(/^([A-Z][A-Za-z0-9'(),\-\/\s]+?)\.\s*(.*)$/);
      if (sectionKeys.includes(line)) {
        seenSectionHeader = true;
        skipLore = false;
        filteredLines.push(line);
      } else if (entryMatch) {
        const entryName = entryMatch[1].trim();
        const wordCount = entryName.split(/\s+/).length;
        const allowEntry =
          entryName.startsWith("Emanation") ||
          wordCount <= 4 ||
          /(Aura|Resistance|Escape|Throes|Teleport|Spellcasting)/i.test(entryName);
        if (allowEntry) {
          seenSectionHeader = true;
          skipLore = false;
          filteredLines.push(line);
        }
      }
      continue;
    }

    const hasPunct = /[.!?:;]/.test(line);
    const isTitleCase =
      !hasPunct && /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/.test(line) && line.length <= 40;
    const nextLooksLikeLore =
      /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/.test(next) || /^Habitat:/.test(next) || /^Treasure:/.test(next);

    if (seenSectionHeader && isTitleCase && nextLooksLikeLore && !sectionKeys.includes(next)) {
      skipLore = true;
      continue;
    }
    if (
      seenSectionHeader &&
      !hasPunct &&
      /[a-z]/.test(line) &&
      line.length > 20 &&
      nextLooksLikeLore &&
      !sectionKeys.includes(next)
    ) {
      skipLore = true;
      continue;
    }

    if (!seenSectionHeader) {
      if (sectionKeys.includes(line)) {
        seenSectionHeader = true;
        filteredLines.push(line);
        continue;
      }
      if (isTitleCase) continue;
      if (
        allowedPrefixes.some((prefix) => line.startsWith(prefix)) ||
        line === "MOD" ||
        line === "SAVE" ||
        line === "MOD SAVE"
      ) {
        filteredLines.push(line);
      }
      continue;
    }

    filteredLines.push(line);
  }
  const sections = splitSections(filteredLines);
  const cleanEntries = (entries) =>
    entries.map((entry) => {
      if (entry.text && entry.text.includes("Assassin Modus Operandi")) {
        entry.text = entry.text.split("Assassin Modus Operandi")[0].trim();
      }
      if (entry.text && entry.text.includes(" Bandits")) {
        entry.text = entry.text.split(" Bandits")[0].trim();
      }
      if (entry.text && entry.text.includes(" Doppelganger")) {
        entry.text = entry.text.split(" Doppelganger")[0].trim();
      }
      if (entry.text) {
        entry.text = entry.text.replace(/\s+[A-Z][A-Z\s]{2,}$/, "").trim();
      }
      return entry;
    }).filter((entry) => {
      const name = (entry.name || "").toLowerCase();
      const wordCount = name.split(/\s+/).length;
      if (wordCount > 4 && /\b(use|roll|determine|contains|poses|gives|takes)\b/.test(name)) {
        return false;
      }
      return true;
    });

  monster.traits = cleanEntries(parseEntries(sections["Traits"] || []));
  monster.actions = cleanEntries(parseEntries(sections["Actions"] || []));
  monster.bonus_actions = cleanEntries(parseEntries(sections["Bonus Actions"] || []));
  monster.reactions = cleanEntries(parseEntries(sections["Reactions"] || []));
  const legendaryRaw = sections["Legendary Actions"] || [];
  const usesIndex = legendaryRaw.findIndex((line) => line.startsWith("Legendary Action Uses:"));
  if (usesIndex >= 0) {
    const noteLines = [];
    for (let i = usesIndex; i < legendaryRaw.length; i++) {
      const line = legendaryRaw[i];
      if (i !== usesIndex && /^[A-Z][A-Za-z0-9'(),\-\/\s]+?\./.test(line)) {
        break;
      }
      noteLines.push(line);
    }
    if (noteLines.length) {
      monster.notes = [...monster.notes, normalizeText(noteLines.join(" "))];
      legendaryRaw.splice(usesIndex, noteLines.length);
    }
  }
  monster.legendary_actions = cleanEntries(parseEntries(legendaryRaw));
  monster.lair_actions = parseEntries(sections["Lair Actions"] || []);
  monster.regional_effects = parseEntries(sections["Regional Effects"] || []);

  fs.writeFileSync(monsterPath, JSON.stringify(monster, null, 2));
};

const main = () => {
  const listPath = process.argv[2];
  if (!listPath) {
    console.error("Usage: node tools/mm-2025-normalize-batch.mjs <list-json-path>");
    process.exit(1);
  }

  const entries = readListEntries(listPath);
  for (const entry of entries) {
    const monsterPath = path.join(repoRoot, entry.file);
    normalizeMonster(monsterPath);
  }
};

main();
