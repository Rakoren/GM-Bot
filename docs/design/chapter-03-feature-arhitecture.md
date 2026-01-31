# Chapter 03  Feature & Class Architecture (PHB 2024)

## Status

**Active / Implemented-in-progress**

This document defines the **data architecture, schema conventions, and modeling rules** used to normalize *PHB 2024 Chapter 3 (Classes)* into machine-readable JSON shards for use in the Discord DM Bot and related tooling.

---

## 1. Goals

* Normalize PHB into deterministic, validated JSON
* Separate **what a class is** from **what a feature does**
* Enable:

  * automated validation
  * character builders
  * AI-driven rule interpretation
* Avoid data duplication across classes
* Support future expansion (subclasses, feats, invocations, boons)

---

## 2. Core Architecture Principles

### 2.1 Separation of Concerns

| Concept              | Responsibility                  |
| -------------------- | ------------------------------- |
| **Class Shard**      | Level progression, references   |
| **Feature Shard**    | Rules & mechanics               |
| **Invocation Shard** | Selectable feature with prereqs |
| **Resource Shard**   | Pools, recharge, limits         |
| **Spell List Shard** | Spell availability only         |
| **Subclass Shard**   | Variant features                |

> **Classes never define mechanics.**
> **Features never define level progression.**

---

## 3. Folder Layout (Chapter 03)

```
docs/chapter-03/
 classes/
   barbarian.json
   bard.json
   cleric.json
   druid.json\...

 features/
   core/
     ability_score_improvement.json
     spellcasting.json
     extra_attack.json
     epic_boon.json
     subclass_choice.json
     fighting_style.json
     weapon_mastery.json
  
   warlock/
      pact_magic.json
      eldritch_invocations.json
      magical_cunning.json
      contact_patron.json
      mystic_arcanum.json
      eldritch_master.json

 invocations/
   pact_of_the_blade.json
   pact_of_the_chain.json
   pact_of_the_tome.json

 resources/
   rage.json
   bardic_inspiration.json
   channel_divinity.json
   wild_shape.json
   pact_magic_slots.json
   sorcery_points.json

 spells/
   spell_list.bard.json
   spell_list.cleric.json
   spell_list.druid.json
   spell_list.paladin.json
   spell_list.ranger.json
   spell_list.sorcerer.json
   spell_list.warlock.json
   spell_list.wizard.json

 subclasses/
   wl.*

 chapter-03.schema.json
 chapter-03.manifest.json
 chapter-03.validation.full.json
```

---

## 4. ID Conventions (Critical)

### 4.1 ID Patterns

| Type       | Pattern              | Example                 |
| ---------- | -------------------- | ----------------------- |
| Class      | `class.<name>`       | `class.warlock`         |
| Feature    | `feat.<name>`        | `feat.pact_magic`       |
| Invocation | `inv.<name>`         | `inv.pact_of_the_blade` |
| Resource   | `res.<name>`         | `res.pact_magic_slots`  |
| Spell List | `spell_list.<class>` | `spell_list.paladin`    |
| Subclass   | `<class>.<subclass>` | `wl.fiend`              |

**Rules**

* Lowercase only
* Dots allowed
* No spaces, no hyphens
* IDs are immutable once published

---

## 5. Class Shards

### Purpose

Define:

* proficiencies
* spellcasting model
* feature progression
* references to mechanics

### Key Properties

```json
{
  "type": "class",
  "id": "class.warlock",
  "features_by_level": {
    "1": ["pact_magic", "eldritch_invocations"],
    "3": ["subclass_choice", "pact_boon"]
  },
  "feature_refs": [
    "feat.pact_magic",
    "feat.eldritch_invocations"
  ],
  "invocation_refs": [
    "inv.pact_of_the_blade",
    "inv.pact_of_the_chain",
    "inv.pact_of_the_tome"
  ]
}
```

---

## 6. Feature Shards (`feat.*`)

### Purpose

Reusable rule definitions shared across classes.

### Examples

* Rage
* Wild Shape
* Extra Attack
* Pact Magic
* Ability Score Improvement
* Epic Boon

### Key Properties

```json
{
  "type": "feature",
  "id": "feat.pact_magic",
  "action_type": "none",
  "rules": [
    "Cast warlock spells using Pact Magic spell slots",
    "All pact slots are the same level"
  ]
}
```

---

## 7. Invocation Shards (`inv.*`)

### Purpose

Selectable, prerequisite-gated features (Warlock-only for now).

### Example

```json
{
  "type": "invocation",
  "id": "inv.pact_of_the_blade",
  "prereqs": ["warlock_level>=3"],
  "effects": [
    "You can use your pact weapon as a spellcasting focus"
  ]
}
```

---

## 8. Resource Shards (`res.*`)

### Purpose

Define **limited-use pools**.

### Example

```json
{
  "type": "resource",
  "id": "res.pact_magic_slots",
  "pool": "by_level",
  "recharge": "short_rest"
}
```

---

## 9. Spell List Shards

### Required Shape

```json
{
  "id": "spell_list.paladin",
  "entries": [
    { "level": 1, "name": "Bless", "school": "Enchantment", "special_flags": ["C","M"] }
  ]
}
```

> `levels {}` format is invalid; spell lists must be flattened into `entries[]`.

---

## 10. Manifest & Validation

* **Manifest** enumerates every shard
* **Validation** enforces schema compliance, ID uniqueness, and file presence

---

## 11. Known Pitfalls (Solved)

| Problem              | Solution                     |
| -------------------- | ---------------------------- |
| `oneOf` ambiguity    | Add `type` discriminator     |
| Feature IDs rejected | Allow dots in regex          |
| Spell lists failing  | Convert to `entries[]`       |
| Invocations rejected | Use `inv.` prefix            |
| Feature bloat        | Split core vs class-specific |

---

## 12. Design Philosophy

* **Data-first**
* **Composable**
* **AI-readable**
* **Human-debuggable**

> If a rule lives in the PHB, it becomes a shard.
> If it changes behavior, its a feature.
> If its selectable, its an invocation.
> If its limited, its a resource.

---

## 13. Runtime Flow Reference

For a high-level runtime flow diagram (Discord events -> commands -> combat/AI/TTS),
see docs/runtime-flow.md.
