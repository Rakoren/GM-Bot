import fs from "node:fs";
import path from "node:path";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: node tools/check-sourceref.mjs <path-to-manifest.json>");
  process.exit(2);
}

const manifestAbs = path.resolve(manifestPath);
const manifestDir = path.dirname(manifestAbs);
const docsRoot = path.resolve(manifestDir, "..");
const manifest = JSON.parse(fs.readFileSync(manifestAbs, "utf8"));

const mustHaveTypes = new Set(["class", "spell_list"]);
let ok = true;

for (const s of manifest.shards ?? []) {
  if (!mustHaveTypes.has(s.type)) continue;

  const candidates = [
    path.resolve(manifestDir, s.path),
    path.resolve(docsRoot, s.path),
    path.resolve(process.cwd(), s.path),
  ];
  const docPath = candidates.find((c) => fs.existsSync(c));
  if (!docPath) {
    ok = false;
    console.error(`Missing file for shard ${s.id}: ${s.path}`);
    continue;
  }
  const doc = JSON.parse(fs.readFileSync(docPath, "utf8"));
  if (!doc.sourceRef || !doc.sourceRef.file) {
    ok = false;
    console.error(`Missing sourceRef in ${s.path} (${s.id})`);
  }
}

if (!ok) process.exit(1);
console.log("sourceRef check OK (required types only)");
