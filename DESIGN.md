# DESIGN.md — Canonical Rules Architecture

## Purpose

This document is the **authoritative design reference** for how PHB 2024 rules content is represented in this repository. All agents (human, Codex, or LLM-based) MUST follow this document when creating or modifying rules data.

This file exists to:

* Prevent schema drift
* Prevent rule invention
* Anchor AI tooling to a stable architecture
* Separate source material (PDFs) from machine-readable rules

---

## Canonical Source Policy (PDFs)

### What PDFs Are

* PDFs are **human-verifiable legal sources** only
* PDFs are never parsed, indexed, or read at runtime
* PDFs are immutable once added

### Where PDFs Live

```
docs/sources/
├─ phb2024/
│  ├─ chapter-01-introduction.pdf
│  ├─ chapter-02-species.pdf
│  ├─ chapter-03-classes.pdf
│  ├─ chapter-03-classes-continued.pdf
│  └─ ...
```

### Rules

* Do NOT place PDFs inside `chapter-03/`
* Do NOT reference PDFs by URL
* Do NOT split PDFs by feature

---

## sourceRef Schema (Required)

Every shard that originates from a rulebook MUST include a `sourceRef`.

### Canonical Shape

```json
"sourceRef": {
  "file": "docs/sources/phb2024/chapter-03-classes.pdf",
  "pages": [61, 80],
  "section": "Warlock"
}
```

### Rules

* `file` is always a repo-relative path
* `pages` may be a single page `[12]` or range `[12, 15]`
* `section` is human-readable only
* No IDs, hashes, or anchors inside PDFs

---

## Shard Model (Summary)

| Shard Type      | Responsibility                 |
| --------------- | ------------------------------ |
| classShard      | Level progression & references |
| featureShard    | Mechanics & rules              |
| invocationShard | Selectable gated features      |
| resourceShard   | Limited-use pools              |
| spellListShard  | Spell availability only        |
| subclassShard   | Variant features               |

> Classes reference features. Features never reference classes.

---

## Validation Contract

* All shards MUST validate against `chapter-03.schema.json`
* All shards MUST be listed in `chapter-03.manifest.json`
* Validation output lives in `chapter-03.validation.full.json`

If a shard fails validation:

* Fix the data
* Do NOT weaken the schema unless absolutely necessary

---

## AI / Codex Rules (Hard Requirements)

Any AI agent operating in this repo MUST:

1. Treat this file as authoritative
2. Never invent rules not present in shards
3. Never inline mechanics inside class files
4. Always use existing IDs if present
5. Ask before introducing new shard types

---

## Relationship to AGENTS.md

* `AGENTS.md` defines **operational behavior**
* `DESIGN.md` defines **data truth & architecture**
* Runtime flow overview lives in `docs/runtime-flow.md`

If there is a conflict:

> **DESIGN.md wins**

---

## Status

**Active** — required reading for all contributors and AI agents
