import fs from "node:fs";
import path from "node:path";

const validationPath = process.argv[2];
if (!validationPath) {
  console.error("Usage: node tools/check-validation-appendix-a.mjs <path-to-validation.json>");
  process.exit(2);
}

const validationAbs = path.resolve(validationPath);
const validationDir = path.dirname(validationAbs);
const docsRoot = path.resolve(validationDir, "..");

const validation = JSON.parse(fs.readFileSync(validationAbs, "utf8"));
const manifestRel = validation?.inputs?.manifest_path;
if (!manifestRel) {
  console.error("Validation file missing inputs.manifest_path");
  process.exit(2);
}

const resolveDocsPath = (relPath) => {
  const candidates = [
    path.resolve(validationDir, relPath),
    path.resolve(docsRoot, relPath),
    path.resolve(process.cwd(), relPath),
  ];
  return candidates.find((c) => fs.existsSync(c));
};

const manifestAbs = resolveDocsPath(manifestRel);
if (!manifestAbs) {
  console.error(`Manifest not found for path: ${manifestRel}`);
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(manifestAbs, "utf8"));
const manifestDir = path.dirname(manifestAbs);

const report = {
  validation: validation.title ?? "appendix-a.validation",
  generated_at: new Date().toISOString(),
  manifest_path: path.relative(process.cwd(), manifestAbs),
  errors: [],
  warnings: [],
};

const shardIdCounts = new Map();
for (const shard of manifest.shards ?? []) {
  shardIdCounts.set(shard.id, (shardIdCounts.get(shard.id) ?? 0) + 1);
}

for (const [id, count] of shardIdCounts.entries()) {
  if (count > 1) {
    report.errors.push({
      id: "manifest.shards.unique_ids",
      message: `Duplicate shard id: ${id}`,
    });
  }
}

const resolveShardPath = (relPath) => {
  const candidates = [
    path.resolve(manifestDir, relPath),
    path.resolve(docsRoot, relPath),
    path.resolve(process.cwd(), relPath),
  ];
  return candidates.find((c) => fs.existsSync(c));
};

const loadShard = (shard) => {
  const shardPath = resolveShardPath(shard.path);
  if (!shardPath) return null;
  try {
    return JSON.parse(fs.readFileSync(shardPath, "utf8"));
  } catch {
    report.errors.push({
      id: "manifest.shards.paths.present",
      message: `Failed to parse ${shard.id}: ${shard.path}`,
    });
    return null;
  }
};

const requireFields = (doc, shard, fields, ruleId) => {
  for (const field of fields) {
    if (!(field in doc)) {
      report.errors.push({
        id: ruleId,
        message: `Missing ${field} in ${shard.id}`,
      });
    }
  }
};

for (const shard of manifest.shards ?? []) {
  const doc = loadShard(shard);
  if (!doc) continue;
  if (shard.type === "table") {
    requireFields(
      doc,
      shard,
      ["id", "name", "chapter", "status", "sourceRef", "entries"],
      "table.core_fields"
    );
  }
}

if (report.errors.length > 0) {
  console.error(`Validation failed with ${report.errors.length} error(s).`);
  for (const err of report.errors) console.error(` * ${err.message}`);
  process.exit(1);
}

console.log("Validation OK (0 warning(s))");
