# AI/DM Toggle Guidance (DMG 2024)

This project supports two operating modes for Dungeon Masters (DMs):

- **AI-Active**: The AI drives narrative and procedural guidance.
- **AI-Passive**: The AI acts as an assistant, providing references and prompts on demand.

To preserve fidelity with the Dungeon Master's Guide (2024), **all extracted text uses the DM's original wording**. When the AI is active, the system should translate that guidance into AI behavior at runtime rather than rewriting the source shards.

## Implementation Guidance

- **Shard text stays DM-authored.** No rewrites of DM instructions into AI voice inside shards.
- **Runtime framing handles roles.** The AI layer interprets "DM" as the active narrator/arbiter when AI-Active.
- **UI toggle controls voice.**
  - AI-Active: The AI summarizes, proposes actions, and runs procedures using the DM text as constraints.
  - AI-Passive: The AI surfaces raw DM text, checklists, and tables to the human DM.

## Example Interpretation

- Source shard: "The DM decides how to apply the rules."
- AI-Active: The AI makes the call and explains the ruling.
- AI-Passive: The AI shows the line and optionally suggests how to decide.

## Scope

This framing applies to all DMG content:
- `dm_advice` shards
- `procedure` shards
- `template` shards
- `table` and `list` entries
- `tracking_sheet` and `map` metadata

## Notes

- If a shard includes direct player-facing text, keep it intact and let the UI decide presentation.
- If you add new shard types, keep the same rule: **do not rewrite DM text**.
