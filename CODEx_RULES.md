# Codex Rules (Repo Contract)

You MUST follow these rules for any change:

## Authority
1. docs/DESIGN.md is the source of truth.
2. docs/chapter-03/chapter-03.schema.json defines allowed shapes.
3. docs/chapter-03/chapter-03.manifest.json must list all shards.

## Hard Requirements
- Never invent rules that are not present in shards.
- Do not inline mechanics into class files.
- Every shard should include sourceRef when possible.
- If you create or rename a shard file, you MUST update chapter-03.manifest.json.
- IDs are immutable; do not rename ids unless explicitly asked.

## sourceRef
sourceRef.file must be repo-relative and point to docs/sources/...
