import fs from "node:fs";
import path from "node:path";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: node tools/check-manifest.mjs <path-to-manifest.json>");
  process.exit(2);
}

const manifestAbs = path.resolve(manifestPath);
const manifestDir = path.dirname(manifestAbs);
const docsRoot = path.resolve(manifestDir, "..");
const manifest = JSON.parse(fs.readFileSync(manifestAbs, "utf8"));

let ok = true;

for (const shard of manifest.shards ?? []) {
  const p = shard.path;
  const candidates = [
    path.resolve(manifestDir, p),
    path.resolve(docsRoot, p),
    path.resolve(process.cwd(), p),
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) {
    ok = false;
    console.error(`Missing file for shard ${shard.id}: ${p}`);
  }
}

if (!ok) process.exit(1);
console.log("Manifest check OK");
