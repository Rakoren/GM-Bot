import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');
const REPORT_PATH = path.join(ROOT, 'docs', 'registry.integrity.report.json');
const FIX_MODE = process.argv.includes('--fix');

function findManifestPaths(rootDir) {
  const results = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        stack.push(full);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.manifest.json')) {
        results.push(full);
      }
    }
  }
  return results.sort();
}

function safeReadJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function collectFeatureRefs(obj) {
  const hits = [];
  const stack = [obj];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (Array.isArray(current)) {
      for (const entry of current) stack.push(entry);
      continue;
    }
    for (const [key, value] of Object.entries(current)) {
      if (key === 'feature_refs' || key === 'class_features') {
        if (isStringArray(value)) {
          hits.push({ key, values: value });
        }
      } else if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }
  return hits;
}

function main() {
  const manifests = findManifestPaths(DOCS_DIR);
  const byId = new Map();
  const shardEntries = [];
  const errors = [];
  const warnings = [];
  const fixes = [];

  for (const manifestPath of manifests) {
    let manifest = null;
    try {
      manifest = safeReadJson(manifestPath);
    } catch (err) {
      errors.push({
        type: 'manifest_parse',
        file: path.relative(ROOT, manifestPath),
        message: err?.message || String(err),
      });
      continue;
    }

    if (manifest?.registry === false || manifest?.rollup === true) {
      continue;
    }

    const shards = Array.isArray(manifest?.shards) ? manifest.shards : [];
    for (const shard of shards) {
      const shardId = shard?.id;
      const relPath = shard?.path;
      if (!shardId || !relPath) continue;
      const absPath = path.join(DOCS_DIR, relPath);

      if (!byId.has(shardId)) byId.set(shardId, []);
      byId.get(shardId).push({
        manifest: path.relative(ROOT, manifestPath),
        path: relPath,
      });

      if (!fs.existsSync(absPath)) {
        errors.push({
          type: 'missing_shard',
          id: shardId,
          path: relPath,
        });
        continue;
      }

      let data = null;
      try {
        data = safeReadJson(absPath);
      } catch (err) {
        errors.push({
          type: 'shard_parse',
          id: shardId,
          path: relPath,
          message: err?.message || String(err),
        });
        continue;
      }

      if (data?.id && data.id !== shardId) {
        errors.push({
          type: 'id_mismatch',
          id: shardId,
          file_id: data.id,
          path: relPath,
        });
      }

      shardEntries.push({
        id: shardId,
        path: relPath,
        data,
      });
    }
  }

  for (const [id, locations] of byId.entries()) {
    if (locations.length > 1) {
      errors.push({
        type: 'duplicate_id',
        id,
        locations,
      });
    }
  }

  const idSet = new Set(byId.keys());
  for (const entry of shardEntries) {
    if (entry.data?.status === 'draft') continue;
    const items = entry.data?.items;
    if (isStringArray(items)) {
      const kept = [];
      const removed = [];
      for (const itemId of items) {
        const trimmed = itemId.trim();
        const looksLikeId = /^[a-z0-9_.-]+$/.test(trimmed) && trimmed.includes('.');
        if (!looksLikeId) {
          kept.push(itemId);
          continue;
        }
        if (!idSet.has(trimmed)) {
          errors.push({
            type: 'missing_lookup',
            from: entry.id,
            item: trimmed,
            path: entry.path,
          });
          removed.push(itemId);
          continue;
        }
        kept.push(itemId);
      }
      if (FIX_MODE && removed.length) {
        entry.data.items = kept;
        fs.writeFileSync(
          path.join(DOCS_DIR, entry.path),
          JSON.stringify(entry.data, null, 2)
        );
        fixes.push({
          type: 'remove_missing_list_items',
          from: entry.id,
          path: entry.path,
          removed,
        });
      }
    }

    const featureRefs = collectFeatureRefs(entry.data);
    for (const refBlock of featureRefs) {
      for (const refId of refBlock.values) {
        const trimmed = refId.trim();
        const looksLikeId = /^[a-z0-9_.-]+$/.test(trimmed) && trimmed.includes('.');
        if (!looksLikeId) continue;
        if (!idSet.has(trimmed)) {
          errors.push({
            type: 'missing_feature_ref',
            from: entry.id,
            key: refBlock.key,
            item: trimmed,
            path: entry.path,
          });
        }
      }
    }
  }

  const report = {
    ok: errors.length === 0,
    manifests: manifests.length,
    shards: shardEntries.length,
    errors,
    warnings,
    fixes,
    time: new Date().toISOString(),
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  if (errors.length && !FIX_MODE) {
    for (const err of errors) {
      const label = err.type || 'error';
      if (err.id) {
        console.error(`${label}: ${err.id}`);
      } else if (err.from) {
        console.error(`${label}: ${err.from} -> ${err.item}`);
      } else if (err.file) {
        console.error(`${label}: ${err.file}`);
      } else {
        console.error(label);
      }
    }
    console.error(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
    process.exit(1);
  }

  if (errors.length && FIX_MODE) {
    console.log(`Fixes applied: ${fixes.length}`);
    console.log(`Remaining errors: ${errors.length}`);
  } else {
    console.log('Registry integrity OK.');
  }
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
}

main();
