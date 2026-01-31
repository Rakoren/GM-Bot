import fs from "node:fs";
import path from "node:path";

const validationPath = process.argv[2];
if (!validationPath) {
  console.error("Usage: node tools/check-validation.mjs <path-to-validation.json>");
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
  validation: validation.title ?? "validation",
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

const shardById = new Map();
for (const shard of manifest.shards ?? []) {
  shardById.set(shard.id, shard);
  const shardPath = resolveShardPath(shard.path);
  if (!shardPath) {
    report.errors.push({
      id: "manifest.shards.paths.present",
      message: `Missing file for shard ${shard.id}: ${shard.path}`,
    });
  }
}

const loadShard = (shard) => {
  const shardPath = resolveShardPath(shard.path);
  if (!shardPath) return null;
  try {
    return JSON.parse(fs.readFileSync(shardPath, "utf8"));
  } catch (err) {
    report.errors.push({
      id: "manifest.shards.paths.present",
      message: `Failed to parse ${shard.id}: ${shard.path}`,
    });
    return null;
  }
};

const classShards = (manifest.shards ?? []).filter((s) => s.type === "class");
const spellListShards = (manifest.shards ?? []).filter(
  (s) => s.type === "spell_list"
);
const resourceIds = new Set(
  (manifest.shards ?? [])
    .filter((s) => s.type === "resource")
    .map((s) => s.id)
);
const packTablePath = path.resolve(
  docsRoot,
  "chapter-06",
  "tables",
  "table.adventuring_packs.json"
);
let packIds = new Set();
if (fs.existsSync(packTablePath)) {
  try {
    const packTable = JSON.parse(fs.readFileSync(packTablePath, "utf8"));
    packIds = new Set(
      (packTable.entries ?? [])
        .map((entry) => entry.pack_id)
        .filter((id) => typeof id === "string" && id.length > 0)
    );
  } catch {
    report.warnings.push({
      id: "class.starting_equipment.pack_ref_resolves",
      message: "Failed to parse chapter-06 table.adventuring_packs.json",
    });
  }
} else {
  report.warnings.push({
    id: "class.starting_equipment.pack_ref_resolves",
    message: "Pack table not found; skipping pack_ref validation",
  });
}

for (const shard of classShards) {
  const doc = loadShard(shard);
  if (!doc) continue;

  const requiredFields = [
    "id",
    "name",
    "chapter",
    "status",
    "primary_ability",
    "hit_die",
    "saving_throws",
    "proficiencies",
    "resources",
    "features_by_level",
    "subclasses",
  ];
  for (const field of requiredFields) {
    if (!(field in doc)) {
      report.errors.push({
        id: "class.core_fields",
        message: `Missing ${field} in ${shard.id}`,
      });
    }
  }

  if (doc.features_by_level && typeof doc.features_by_level === "object") {
    for (const key of Object.keys(doc.features_by_level)) {
      if (!/^\d+$/.test(key)) {
        report.errors.push({
          id: "class.features_by_level.keys_are_numeric_strings",
          message: `Non-numeric features_by_level key '${key}' in ${shard.id}`,
        });
      }
    }
  }

  if (doc.spellcasting && doc.spellcasting.spell_list_ref) {
    const ref = doc.spellcasting.spell_list_ref;
    const match = (manifest.shards ?? []).find(
      (s) => s.id === ref && s.type === "spell_list"
    );
    if (!match) {
      report.errors.push({
        id: "class.spell_list_ref_resolves",
        message: `spell_list_ref ${ref} not found for ${shard.id}`,
      });
    }
  }

  if (Array.isArray(doc.resources)) {
    for (const resId of doc.resources) {
      if (!resourceIds.has(resId)) {
        report.errors.push({
          id: "class.resources.resolve",
          message: `Resource ${resId} not found for ${shard.id}`,
        });
      }
    }
  }

  if (doc.starting_equipment && Array.isArray(doc.starting_equipment.options)) {
    for (const option of doc.starting_equipment.options) {
      if (!option.pack_ref) continue;
      if (!packIds.has(option.pack_ref)) {
        report.errors.push({
          id: "class.starting_equipment.pack_ref_resolves",
          message: `pack_ref ${option.pack_ref} not found for ${shard.id}`,
        });
      }
    }
  }

  const expectedSubclassIds = manifest.expected_subclass_ids;
  if (Array.isArray(expectedSubclassIds) && Array.isArray(doc.subclasses)) {
    for (const subclassId of doc.subclasses) {
      if (!expectedSubclassIds.includes(subclassId)) {
        report.warnings.push({
          id: "class.subclasses.expected_ids",
          message: `Subclass ${subclassId} not in manifest.expected_subclass_ids`,
        });
      }
    }
  }
}

for (const shard of spellListShards) {
  const doc = loadShard(shard);
  if (!doc) continue;

  if (doc.class_id) {
    const match = (manifest.shards ?? []).find(
      (s) => s.id === doc.class_id && s.type === "class"
    );
    if (!match) {
      report.errors.push({
        id: "spell_list.class_id_consistency",
        message: `spell_list.class_id ${doc.class_id} not found for ${shard.id}`,
      });
    }
  }

  if (Array.isArray(doc.entries)) {
    for (const entry of doc.entries) {
      const missing = [];
      if (!("level" in entry)) missing.push("level");
      if (!("name" in entry)) missing.push("name");
      if (!("school" in entry)) missing.push("school");
      if (!("special_flags" in entry)) missing.push("special_flags");
      if (missing.length > 0) {
        report.errors.push({
          id: "spell_list.entries.required_fields",
          message: `Missing fields [${missing.join(", ")}] in ${shard.id}`,
        });
      }

      if (Array.isArray(entry.special_flags)) {
        for (const flag of entry.special_flags) {
          if (!["C", "R", "M"].includes(flag)) {
            report.errors.push({
              id: "spell_list.special_flags.allowed",
              message: `Invalid special_flag '${flag}' in ${shard.id}`,
            });
          }
        }
      }
    }
  }

  if (
    shard.id === "spell_list.wizard" &&
    (doc.status !== "complete" || (doc.entries ?? []).length === 0)
  ) {
    if (!Array.isArray(doc.notes) || doc.notes.length === 0) {
      report.warnings.push({
        id: "wizard.placeholder_spell_list_ok",
        message: "spell_list.wizard is placeholder but missing notes",
      });
    }
  }
}

const warlockShard = shardById.get("class.warlock");
if (warlockShard) {
  const doc = loadShard(warlockShard);
  if (doc?.spellcasting?.caster_type !== "pact_magic") {
    report.errors.push({
      id: "warlock.pact_magic_caster_type",
      message: "class.warlock.spellcasting.caster_type must be pact_magic",
    });
  }
}

const reportRel = validation?.outputs?.report_path;
if (reportRel) {
  const reportPath = path.resolve(docsRoot, reportRel);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
}

if (report.errors.length > 0) {
  console.error(`Validation failed with ${report.errors.length} error(s).`);
  process.exit(1);
}

console.log(
  `Validation OK (${report.warnings.length} warning(s))`
);
