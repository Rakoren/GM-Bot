# Spell Tables

This file documents the structure for `data_sets/spell_tables.json`.

## Schema

- `spell_id`: Spell ID from `data_sets/spells.csv` (e.g., `SPL_CONTROL_WEATHER`).
- `table_name`: Display name for the table (e.g., `Precipitation`).
- `rows`: Array of rows, each row is an array of strings. The first row should be the header row.

## Example

```json
{
  "spell_id": "SPL_CONTROL_WEATHER",
  "table_name": "Precipitation",
  "rows": [
    ["Stage", "Condition"],
    ["1", "Clear"],
    ["2", "Light clouds"],
    ["3", "Overcast or ground fog"],
    ["4", "Rain, hail, or snow"],
    ["5", "Torrential rain, driving hail, or blizzard"]
  ]
}
```
