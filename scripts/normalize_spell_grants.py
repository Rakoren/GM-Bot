import csv
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data_sets"
SPELL_GRANTS = DATA / "spell_grants.csv"
SUBCLASS_SPELLS = DATA / "subclass_spells.csv"
SPELLS = DATA / "spells.csv"

DERIVED_NOTES = "From subclass spell list."


def load_spell_name_map(path: Path) -> dict:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return {row["name"]: row["spell_id"] for row in reader}


def load_spell_grants(path: Path) -> tuple[list, list]:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames
    if not fieldnames:
        raise RuntimeError("spell_grants.csv has no header.")
    return rows, fieldnames


def filter_manual_rows(rows: list[dict]) -> list[dict]:
    kept = []
    for row in rows:
        if (
            row.get("source_type") == "subclass"
            and not row.get("feature_id")
            and row.get("notes") == DERIVED_NOTES
        ):
            continue
        kept.append(row)
    return kept


def build_subclass_rows(spell_name_map: dict) -> list[dict]:
    rows = []
    with SUBCLASS_SPELLS.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            subclass_id = row["subclass_id"]
            level = row["level"]
            source = row["source"]
            version = row["version"]
            spells = [s.strip() for s in row["spells"].split(",")]
            for spell_name in spells:
                spell_id = spell_name_map.get(spell_name)
                if not spell_id:
                    raise RuntimeError(f"Missing spell_id for {spell_name!r}")
                rows.append(
                    {
                        "grant_id": f"SG_{subclass_id}_{spell_id}",
                        "source_type": "subclass",
                        "source_id": subclass_id,
                        "feature_id": "",
                        "spell_id": spell_id,
                        "access_type": "always_prepared",
                        "level_gained": level,
                        "notes": DERIVED_NOTES,
                        "source": source,
                        "version": version,
                    }
                )
    return rows


def dedupe(rows: list[dict]) -> list[dict]:
    seen = set()
    deduped = []
    for row in rows:
        grant_id = row.get("grant_id")
        if grant_id in seen:
            raise RuntimeError(f"Duplicate grant_id detected: {grant_id}")
        seen.add(grant_id)
        deduped.append(row)
    return deduped


def main() -> int:
    if not SPELL_GRANTS.exists():
        print("spell_grants.csv not found.", file=sys.stderr)
        return 1

    spell_name_map = load_spell_name_map(SPELLS)
    existing_rows, fieldnames = load_spell_grants(SPELL_GRANTS)
    manual_rows = filter_manual_rows(existing_rows)
    subclass_rows = build_subclass_rows(spell_name_map)
    merged = dedupe(manual_rows + subclass_rows)

    with SPELL_GRANTS.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(merged)

    print(f"Wrote {len(merged)} rows ({len(subclass_rows)} from subclass_spells).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
