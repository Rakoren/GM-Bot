const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sourcesDir = path.join(root, "docs", "sources", "phb2024", "appendix-a");
const sourceTxt = path.join(
  sourcesDir,
  "11-The Multiverse - Player’s Handbook - Dungeons & Dragons - Sources - D&D Beyond.txt"
);

const outDir = path.join(root, "docs", "appendix-a");
const tablesDir = path.join(outDir, "tables");

fs.mkdirSync(tablesDir, { recursive: true });

const raw = fs.readFileSync(sourceTxt, "utf8");
const lines = raw.split(/\r?\n/);

const findLineIndex = (predicate) => lines.findIndex(predicate);

const collectSectionLines = (startLabel, endLabel) => {
  const startIdx = findLineIndex((l) => l.trim() === startLabel);
  const endIdx = findLineIndex((l) => l.trim() === endLabel);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return [];
  return lines.slice(startIdx + 1, endIdx).filter((l) => l.trim());
};

const extractEntries = (sectionLines) => {
  const entries = [];
  let current = null;
  for (const line of sectionLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([A-Z][A-Za-z\s'-]+)\.\s*(.+)?$/);
    if (match) {
      if (current) entries.push(current);
      current = {
        plane: match[1].trim(),
        description: match[2] ? match[2].trim() : "",
      };
      continue;
    }
    if (current) {
      current.description = `${current.description} ${trimmed}`.trim();
    }
  }
  if (current) entries.push(current);
  return entries;
};

const materialLines = collectSectionLines("The Material Realms", "Transitive Planes");
const transitiveLines = collectSectionLines("Transitive Planes", "The Inner Planes");
const innerLines = collectSectionLines("The Inner Planes", "The Outer Planes");
const outerLines = collectSectionLines("The Outer Planes", "Outer Planes");

const materialEntries = extractEntries(materialLines);
const transitiveEntries = extractEntries(transitiveLines);
const innerEntries = extractEntries(innerLines);
const outerEntries = extractEntries(outerLines);

const outerTableStart = findLineIndex((l) => l.trim() === "Outer Planes");
const outerTableLines = outerTableStart === -1 ? [] : lines.slice(outerTableStart + 1);
const outerPlaneRows = [];
for (const line of outerTableLines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  if (trimmed.startsWith("Outer Plane")) continue;
  if (/^--\s+\d+\s+of\s+\d+\s+--$/.test(trimmed)) continue;
  if (/PRIVACY POLICY|TERMS OF SERVICE|COOKIE NOTICE|HELP PORTAL|SUPPORT FORUM|SYSTEM STATUS|DO NOT SELL|MY PERSONAL INFORMATION|YOUR PRIVACY CHOICES|ABOUT|CONTACT US|CAREERS|WIZARDS OF THE COAST|FIND US ON SOCIAL MEDIA|DOWNLOAD THE D&D BEYOND APP|COPYRIGHT|DUNGEONS & DRAGONS/i.test(trimmed)) continue;
  if (!trimmed.includes("\t")) continue;
  const parts = trimmed.split("\t").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) continue;
  outerPlaneRows.push({ outer_plane: parts[0], alignment: parts[1] });
}

const sourceRef = {
  file: "docs/sources/phb2024/appendix-a/11-The Multiverse - Player's Handbook - Dungeons & Dragons - Sources - D&D Beyond.pdf",
  pages: [1, 2, 3],
  section: "Appendix A: The Multiverse",
};

const writeTable = (id, name, entries) => {
  fs.writeFileSync(
    path.join(tablesDir, `${id}.json`),
    JSON.stringify(
      {
        id,
        name,
        chapter: "appendix-a",
        status: "complete",
        sourceRef,
        columns: entries.length > 0 ? Object.keys(entries[0]) : [],
        entries,
        notes: [],
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
};

writeTable("table.appendix_a.material_realms", "The Material Realms", materialEntries);
writeTable("table.appendix_a.transitive_planes", "Transitive Planes", transitiveEntries);
writeTable("table.appendix_a.inner_planes", "The Inner Planes", innerEntries);
writeTable("table.appendix_a.outer_planes_summary", "The Outer Planes (Overview)", outerEntries);
writeTable("table.appendix_a.outer_planes_alignment", "Outer Planes", outerPlaneRows);

const manifest = {
  schema_version: "0.1.0",
  chapter: "appendix-a",
  title: "Appendix A: The Multiverse",
  generated_at: new Date().toISOString().slice(0, 10),
  paths: {
    tables_dir: "appendix-a/tables",
  },
  shards: [
    {
      id: "table.appendix_a.material_realms",
      type: "table",
      path: "appendix-a/tables/table.appendix_a.material_realms.json",
    },
    {
      id: "table.appendix_a.transitive_planes",
      type: "table",
      path: "appendix-a/tables/table.appendix_a.transitive_planes.json",
    },
    {
      id: "table.appendix_a.inner_planes",
      type: "table",
      path: "appendix-a/tables/table.appendix_a.inner_planes.json",
    },
    {
      id: "table.appendix_a.outer_planes_summary",
      type: "table",
      path: "appendix-a/tables/table.appendix_a.outer_planes_summary.json",
    },
    {
      id: "table.appendix_a.outer_planes_alignment",
      type: "table",
      path: "appendix-a/tables/table.appendix_a.outer_planes_alignment.json",
    },
  ],
};

fs.writeFileSync(
  path.join(outDir, "appendix-a.manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8"
);

const index = {
  appendix: "A",
  title: "The Multiverse",
  tables: manifest.shards.map((s) => s.id),
};
fs.writeFileSync(
  path.join(outDir, "Appendix-A-index.json"),
  JSON.stringify(index, null, 2) + "\n",
  "utf8"
);

const md = `# Appendix A: The Multiverse\n\n` +
  `> **Source:** Player's Handbook - Appendix A (D&D 5e 2024)\n` +
  `> **Purpose:** Provides a high-level overview of the multiverse and its planes.\n\n` +
  `---\n\n` +
  `## Engine References\n\n` +
  `- **Manifest:** appendix-a/appendix-a.manifest.json\n` +
  `- **Schema:** schemas/appendix-a.schema.json\n` +
  `- **Tables:** appendix-a/tables/*\n`;

fs.writeFileSync(path.join(outDir, "Appendix_A_The_Multiverse.md"), md, "utf8");

console.log("Appendix A tables generated.");
