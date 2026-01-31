const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sourcesDir = path.join(root, "docs", "sources", "phb2024", "rules-glossary");
const sourceTxt = path.join(
  sourcesDir,
  fs
    .readdirSync(sourcesDir)
    .find((name) => name.startsWith("13-Rules Glossary") && name.endsWith(".txt"))
);

const outDir = path.join(root, "docs", "rules-glossary");
const termsDir = path.join(outDir, "terms");
const tablesDir = path.join(outDir, "tables");
const listsDir = path.join(outDir, "lists");

fs.mkdirSync(termsDir, { recursive: true });
fs.mkdirSync(tablesDir, { recursive: true });
fs.mkdirSync(listsDir, { recursive: true });

for (const file of fs.readdirSync(termsDir)) {
  if (file.endsWith(".json")) fs.unlinkSync(path.join(termsDir, file));
}

const raw = fs.readFileSync(sourceTxt, "utf8");
const lines = raw.split(/\r?\n/);

let currentPage = null;
const linesWithPages = lines.map((line) => {
  const m = line.match(/^--\s+(\d+)\s+of\s+\d+\s+--$/);
  if (m) currentPage = Number(m[1]);
  return { line, page: currentPage };
});

const normalize = (value) => {
  let next = value.replace(/\t+/g, " ");
  const replacements = [
    ["\u00a0", " "],
    ["\u2212", "-"],
    ["\u2018", "'"],
    ["\u2019", "'"],
    ["\u201c", '"'],
    ["\u201d", '"'],
    ["\u00e2\u20ac\u2122", "'"],
    ["\u00e2\u20ac\u201c", '"'],
    ["\u00e2\u20ac\u201d", '"'],
    ["\u00e2\u20ac\u2013", "-"],
    ["\u00e2\u20ac\u2014", "-"],
    ["\u00c3\u00a2\u00e2\u201a\u00ac\u00c5\u201c", '"'],
    ["\u00c3\u00a2\u00e2\u201a\u00ac\u00c2\u201d", '"'],
    ["\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u201e\u00a2", "'"],
    ["\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u201c", "-"],
    ["\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u009d", "-"],
  ];
  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }
  return next.replace(/\s+/g, " ").trim();
};

const isHeading = (line) =>
  [
    "Rules Glossary",
    "Glossary Conventions",
    "Rules Definitions",
    "Abbreviations.",
    "Abbreviations",
    "Object Armor Class",
    "Object Hit Points",
  ].includes(line);

const allowedLowercase = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "vs",
  "with",
  "without",
]);

const isTitleCaseTerm = (value) => {
  const words = value.split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  return words.every((word) => {
    const cleaned = word.replace(/[^A-Za-z0-9'/-]/g, "");
    if (!cleaned) return true;
    const lower = cleaned.toLowerCase();
    if (allowedLowercase.has(lower)) return true;
    if (/[0-9]/.test(cleaned)) return true;
    if (cleaned === cleaned.toUpperCase()) return true;
    return cleaned[0] === cleaned[0].toUpperCase();
  });
};

const isTermLine = (line) => {
  if (!line) return false;
  if (isHeading(line)) return false;
  if (line.startsWith("See also")) return false;
  if (line.length > 80) return false;
  if (/\.$/.test(line)) return false;
  if (!/^[A-Z][A-Za-z0-9'\-\s]+(\s\[[A-Za-z\s]+\])?$/.test(line)) return false;
  const tagMatch = line.match(/^(.*?)\s+\[[^\]]+\]$/);
  const termName = tagMatch ? tagMatch[1].trim() : line;
  return isTitleCaseTerm(termName);
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

const getPageForIndex = (idx) => {
  for (let i = idx; i >= 0; i -= 1) {
    const page = linesWithPages[i].page;
    if (page !== null && page !== undefined) return page;
  }
  return null;
};

// Abbreviations table
const abbrevStart = lines.findIndex((l) => l.trim() === "Abbreviations.");
const rulesDefStart = lines.findIndex((l) => l.trim() === "Rules Definitions");
const abbrevLines =
  abbrevStart >= 0 && rulesDefStart > abbrevStart
    ? lines.slice(abbrevStart + 1, rulesDefStart)
    : [];
const abbreviations = [];
for (const line of abbrevLines) {
  const trimmed = normalize(line);
  if (!trimmed) continue;
  if (/^--\s+\d+\s+of\s+\d+\s+--$/.test(trimmed)) continue;
  const parts = trimmed.split(" ");
  if (parts.length < 2) continue;
  const key = parts[0];
  const value = trimmed.slice(key.length).trim();
  if (!key || !value) continue;
  abbreviations.push({ abbreviation: key, meaning: value });
}

// Parse glossary terms
const terms = [];
const usedIds = new Map();
for (let i = 0; i < linesWithPages.length; i += 1) {
  const line = normalize(linesWithPages[i].line);
  if (!isTermLine(line)) continue;

  const page = getPageForIndex(i);
  const termLine = line;
  const tagMatch = termLine.match(/^(.*?)\s+\[([^\]]+)\]$/);
  const name = tagMatch ? tagMatch[1].trim() : termLine;
  const tag = tagMatch ? tagMatch[2].trim() : null;

  const bodyLines = [];
  let j = i + 1;
  for (; j < linesWithPages.length; j += 1) {
    const nextLine = normalize(linesWithPages[j].line);
    if (!nextLine) {
      if (bodyLines.length) bodyLines.push("");
      continue;
    }
    if (isTermLine(nextLine)) break;
    if (isHeading(nextLine)) break;
    if (/^--\s+\d+\s+of\s+\d+\s+--$/.test(nextLine)) continue;
    bodyLines.push(nextLine);
  }

  const paragraphs = [];
  let current = [];
  for (const bodyLine of bodyLines) {
    if (!bodyLine) {
      if (current.length) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      continue;
    }
    current.push(bodyLine);
  }
  if (current.length) paragraphs.push(current.join(" "));

  const seeAlso = [];
  for (let p = 0; p < paragraphs.length; p += 1) {
    if (paragraphs[p].startsWith("See also")) {
      seeAlso.push(paragraphs[p].replace(/^See also\s*/i, "").trim());
    }
  }

  const baseSlug = slugify(name);
  const tagSlug = tag ? slugify(tag) : null;
  let id = `glossary.${baseSlug}${tagSlug ? `_${tagSlug}` : ""}`;
  if (usedIds.has(id)) {
    const next = usedIds.get(id) + 1;
    usedIds.set(id, next);
    id = `${id}_${next}`;
  } else {
    usedIds.set(id, 1);
  }

  const description = paragraphs.filter((p) => !p.startsWith("See also"));
  if (description.length === 0 && seeAlso.length === 0) continue;

  const doc = {
    id,
    name,
    tag,
    chapter: "rules-glossary",
    status: "complete",
    description,
    see_also: seeAlso,
    sourceRef: {
      file: "docs/sources/phb2024/rules-glossary/13-Rules Glossary - Player's Handbook - Dungeons & Dragons - Sources - D&D Beyond.pdf",
      pages: page ? [page] : [],
      section: "Rules Glossary",
    },
    notes: [],
  };

  terms.push(doc);
  i = j - 1;
}

const writeJson = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");

const termIds = [];
for (const term of terms) {
  termIds.push(term.id);
  writeJson(path.join(termsDir, `${term.id}.json`), term);
}

writeJson(path.join(listsDir, "list.glossary.terms.json"), {
  id: "list.glossary.terms",
  name: "Glossary Terms",
  chapter: "rules-glossary",
  status: "complete",
  items: termIds,
});

writeJson(path.join(tablesDir, "table.glossary.index.json"), {
  id: "table.glossary.index",
  name: "Glossary Index",
  chapter: "rules-glossary",
  status: "complete",
  sourceRef: {
    file: "docs/sources/phb2024/rules-glossary/13-Rules Glossary - Player's Handbook - Dungeons & Dragons - Sources - D&D Beyond.pdf",
    pages: [1, 31],
    section: "Rules Glossary",
  },
  columns: ["id", "name", "tag"],
  entries: terms.map((t) => ({ id: t.id, name: t.name, tag: t.tag })),
  notes: [],
});

writeJson(path.join(tablesDir, "table.glossary.abbreviations.json"), {
  id: "table.glossary.abbreviations",
  name: "Abbreviations",
  chapter: "rules-glossary",
  status: "complete",
  sourceRef: {
    file: "docs/sources/phb2024/rules-glossary/13-Rules Glossary - Player's Handbook - Dungeons & Dragons - Sources - D&D Beyond.pdf",
    pages: [1],
    section: "Abbreviations",
  },
  columns: ["abbreviation", "meaning"],
  entries: abbreviations,
  notes: [],
});

const manifest = {
  schema_version: "0.1.0",
  chapter: "rules-glossary",
  title: "Rules Glossary",
  generated_at: new Date().toISOString().slice(0, 10),
  paths: {
    terms_dir: "rules-glossary/terms",
    tables_dir: "rules-glossary/tables",
    lists_dir: "rules-glossary/lists",
  },
  shards: [
    ...termIds.map((id) => ({
      id,
      type: "glossary_term",
      path: `rules-glossary/terms/${id}.json`,
    })),
    {
      id: "table.glossary.index",
      type: "table",
      path: "rules-glossary/tables/table.glossary.index.json",
    },
    {
      id: "table.glossary.abbreviations",
      type: "table",
      path: "rules-glossary/tables/table.glossary.abbreviations.json",
    },
    {
      id: "list.glossary.terms",
      type: "list",
      path: "rules-glossary/lists/list.glossary.terms.json",
    },
  ],
};

writeJson(path.join(outDir, "rules-glossary.manifest.json"), manifest);

writeJson(path.join(outDir, "Rules-Glossary-index.json"), {
  chapter: "rules-glossary",
  title: "Rules Glossary",
  terms: termIds,
  tables: ["table.glossary.index", "table.glossary.abbreviations"],
  lists: ["list.glossary.terms"],
});

const md = `# Rules Glossary\n\n` +
  `> **Source:** Player's Handbook - Rules Glossary (D&D 5e 2024)\n` +
  `> **Purpose:** Defines rules terms and abbreviations used across the book.\n\n` +
  `---\n\n` +
  `## Engine References\n\n` +
  `- **Manifest:** rules-glossary/rules-glossary.manifest.json\n` +
  `- **Schema:** schemas/rules-glossary.schema.json\n` +
  `- **Glossary terms:** rules-glossary/terms/*\n` +
  `- **Tables:** rules-glossary/tables/*\n` +
  `- **Lists:** rules-glossary/lists/*\n`;

fs.writeFileSync(path.join(outDir, "Rules_Glossary.md"), md, "utf8");

console.log(`Rules glossary generated (${terms.length} terms).`);
