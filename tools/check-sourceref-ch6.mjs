import fs from "node:fs";
import path from "node:path";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: node tools/check-sourceref-ch6.mjs <path-to-manifest.json>");
  process.exit(2);
}

const manifestAbs = path.resolve(manifestPath);
const manifestDir = path.dirname(manifestAbs);
const docsRoot = path.resolve(manifestDir, "..");
const manifest = JSON.parse(fs.readFileSync(manifestAbs, "utf8"));

const mustHaveTypes = new Set(["item", "table"]);
let ok = true;

const resolveShardPath = (relPath) => {
  const candidates = [
    path.resolve(manifestDir, relPath),
    path.resolve(docsRoot, relPath),
    path.resolve(process.cwd(), relPath),
  ];
  return candidates.find((c) => fs.existsSync(c));
};

for (const s of manifest.shards ?? []) {
  if (!mustHaveTypes.has(s.type)) continue;

  const docPath = resolveShardPath(s.path);
  if (!docPath) {
    ok = false;
    console.error(`Missing file for shard ${s.id}: ${s.path}`);
    continue;
  }
  const doc = JSON.parse(fs.readFileSync(docPath, "utf8"));
  if (!doc.sourceRef || !doc.sourceRef.file || !Array.isArray(doc.sourceRef.pages)) {
    ok = false;
    console.error(`Missing or invalid sourceRef in ${s.path} (${s.id})`);
  }
}

if (!ok) process.exit(1);
console.log("sourceRef check OK (Chapter 6)");
