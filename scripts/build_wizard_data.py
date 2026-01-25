import csv
import json
import pathlib
import re
from typing import Dict, List, Optional

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data_sets" / "D&D"
OUTPUT_PATH = DATA_DIR / "wizard_data.json"
CLASSES_NORMALIZED_PATH = DATA_DIR / "classes_normalized.json"


def load_csv(name: str) -> List[Dict[str, str]]:
    path = DATA_DIR / name
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle, skipinitialspace=True)
        rows = []
        for row in reader:
            cleaned = {}
            for key, value in row.items():
                if key is None:
                    continue
                cleaned_key = key.strip()
                if not cleaned_key:
                    continue
                cleaned_value = value.strip() if isinstance(value, str) else value
                cleaned[cleaned_key] = cleaned_value
            rows.append(cleaned)
        return rows


def normalize_text(value: Optional[str]) -> str:
    return (value or "").strip()


def normalize_name(value: Optional[str]) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower()).strip()


def parse_language_source(value: Optional[str]) -> Dict[str, object]:
    raw = normalize_text(value)
    if not raw:
        return {"base": [], "count": 0}
    lower = raw.lower()
    if "choose" in lower or "any" in lower:
        return {"base": [], "count": 2}
    parts = [part.strip() for part in re.split(r"[,&/]", raw) if part.strip()]
    return {"base": parts, "count": 0}


def parse_equipment_segment(notes: str) -> List[str]:
    cleaned = re.sub(r"choose[^:]+:", "", notes, flags=re.IGNORECASE)
    tokens = re.split(r",|\band\b|\bor\b", cleaned, flags=re.IGNORECASE)
    items = []
    for token in tokens:
        item = token.strip()
        if not item:
            continue
        if re.search(r"\d+\s*gp", item, flags=re.IGNORECASE):
            continue
        items.append(item)
    return items


def load_classes():
    if not CLASSES_NORMALIZED_PATH.exists():
        return [], []
    with CLASSES_NORMALIZED_PATH.open(encoding="utf-8") as handle:
        normalized = json.load(handle)
    classes = []
    for entry in normalized:
        classes.append(
            {
                "class_id": entry.get("class_id", "").strip(),
                "name": entry.get("name", "").strip(),
                "primary_ability": entry.get("primary_ability", "").strip(),
                "saving_throws": entry.get("saving_throws", []),
                "starting_equipment_notes": entry.get("starting_equipment_notes", "").strip(),
                "skill_choices": entry.get("skill_choices", "").strip(),
                "source": entry.get("source", "").strip(),
                "version": entry.get("version", "").strip(),
            }
        )
    return classes, normalized


def load_backgrounds():
    rows = load_csv("backgrounds.csv")
    backgrounds = []
    for row in rows:
        backgrounds.append(
            {
                "background_id": normalize_text(row.get("background_id")),
                "name": normalize_text(row.get("name")),
                "ability_scores": normalize_text(row.get("ability_scores")),
                "skill_proficiencies": normalize_text(row.get("skill_proficiencies")),
                "tool_proficiencies": normalize_text(row.get("tool_proficiencies")),
                "languages": normalize_text(row.get("languages")),
                "language_info": parse_language_source(row.get("languages")),
                "equipment": normalize_text(row.get("equipment")),
                "starting_equipment_a": normalize_text(row.get("starting_equipment_a")),
                "starting_equipment_b": normalize_text(row.get("starting_equipment_b")),
                "feat_granted": normalize_text(row.get("feat_granted")),
                "source": normalize_text(row.get("source")),
                "version": normalize_text(row.get("version")),
            }
        )
    return backgrounds


def load_species():
    rows = load_csv("species.csv")
    species = []
    for row in rows:
        species.append(
            {
                "species_id": normalize_text(row.get("species_id")),
                "name": normalize_text(row.get("name")),
                "size": normalize_text(row.get("size")),
                "speed": normalize_text(row.get("speed")),
                "languages": normalize_text(row.get("languages")),
                "language_info": parse_language_source(row.get("languages")),
                "special_traits": normalize_text(row.get("special_traits")),
                "source": normalize_text(row.get("source")),
                "version": normalize_text(row.get("version")),
            }
        )
    return species


def load_lineages():
    return load_csv("species_lineages.csv")


def load_subclasses():
    return load_csv("subclasses.csv")


def load_standard_array():
    rows = load_csv("standard_array_by_class.csv")
    array_map = {}
    for row in rows:
        name = row.get("class") or row.get("class_name") or ""
        array_map[name.strip()] = {
            "str": row.get("str"),
            "dex": row.get("dex"),
            "con": row.get("con"),
            "int": row.get("int"),
            "wis": row.get("wis"),
            "cha": row.get("cha"),
        }
    normalized_map = {}
    for name, stats in array_map.items():
        normalized_map[normalize_name(name)] = stats
    class_id_map = {}
    classes, _ = load_classes()
    class_id_lookup = {normalize_name(entry["name"]): entry["class_id"] for entry in classes}
    for name, stats in array_map.items():
        class_id = class_id_lookup.get(normalize_name(name))
        if class_id:
            class_id_map[class_id] = stats
    return array_map, normalized_map, class_id_map


def load_point_buy_costs():
    rows = load_csv("ability_score_point_costs.csv")
    costs = {}
    for row in rows:
        score = row.get("score")
        if score:
            costs[score.strip()] = float(row.get("cost") or 0)
    return costs


def load_ability_modifiers():
    return load_csv("ability_modifiers.csv")


def load_ability_ranges():
    return load_csv("ability_score_ranges.csv")


def load_languages():
    standard = load_csv("standard_languages.csv")
    rare = load_csv("rare_languages.csv")
    def normalize(lang_row: Dict[str, str]) -> Dict[str, object]:
        def to_int(value: Optional[str]) -> Optional[int]:
            if value and value.isdigit():
                return int(value)
            return None

        return {
            "language": normalize_text(lang_row.get("language")),
            "roll_min": to_int(lang_row.get("roll_min")),
            "roll_max": to_int(lang_row.get("roll_max")),
            "origin": normalize_text(lang_row.get("origin")),
            "notes": normalize_text(lang_row.get("notes")),
            "source": normalize_text(lang_row.get("source")),
            "version": normalize_text(lang_row.get("version")),
        }

    return [normalize(row) for row in standard], [normalize(row) for row in rare]


def load_adventuring_gear():
    rows = load_csv("adventuring_gear.csv")
    return [
        {
            "name": normalize_text(row.get("name")),
            "cost": normalize_text(row.get("cost")),
            "weight": normalize_text(row.get("weight")),
            "category": normalize_text(row.get("category")),
        }
        for row in rows
        if row.get("name")
    ] 


def clean_row_values(row):
    return { (str(k) if k else "").strip(): (str(v) if v else "").strip() for k, v in row.items() }


def load_armor():
    rows = load_csv("armor.csv")
    armor = []
    for row in rows:
        clean = clean_row_values(row)
        name = clean.get("name")
        if not name:
            continue
        armor.append(
            {
                "name": name,
                "category": clean.get("category"),
                "armor_class": clean.get("ac"),
                "strength_requirement": clean.get("strength"),
                "stealth": clean.get("stealth"),
                "weight": clean.get("weight"),
                "cost": clean.get("cost"),
            }
        )
    return armor


def load_weapons():
    rows = load_csv("weapons.csv")
    weapons = []
    for row in rows:
        clean = clean_row_values(row)
        name = clean.get("name")
        if not name:
            continue
        weapons.append(
            {
                "name": name,
                "damage": clean.get("damage"),
                "properties": clean.get("properties"),
                "properties_1": clean.get("properties_1"),
                "properties_2": clean.get("properties_2"),
                "properties_3": clean.get("properties_3"),
                "properties_4": clean.get("properties_4"),
                "mastery": clean.get("mastery"),
                "weight": clean.get("weight"),
                "cost": clean.get("cost"),
                "category": clean.get("category"),
            }
        )
    return weapons


def load_tools():
    rows = load_csv("tools.csv")
    tools = []
    for row in rows:
        clean = clean_row_values(row)
        name = clean.get("name")
        if not name:
            continue
        tools.append(
            {
                "name": name,
                "cost": clean.get("cost"),
                "proficiency_ability": clean.get("ability"),
                "weight": clean.get("weight"),
                "utilize": clean.get("utilize"),
                "craft": clean.get("craft"),
            }
        )
    return tools


def load_optional_csv(name):
    return load_csv(name) if (DATA_DIR / name).exists() else []


def load_mounts_and_vehicles():
    rows = load_optional_csv("mounts_and_vehicles.csv")
    return [
        {"name": normalize_text(row.get("name")), "cost": normalize_text(row.get("cost")), "speed": normalize_text(row.get("speed"))}
        for row in rows
        if row.get("name")
    ]


def load_food_drink_lodging():
    rows = load_optional_csv("food_drink_lodging.csv")
    items = []
    for row in rows:
        clean = {key.strip(): value for key, value in row.items() if key}
        item_name = clean.get("item")
        if not item_name:
            continue
        items.append(
            {
                "item": normalize_text(item_name),
                "category": normalize_text(clean.get("category")),
                "cost": normalize_text(clean.get("cost")),
                "notes": normalize_text(clean.get("notes")),
            }
        )
    return items


def load_spellcasting_services():
    rows = load_optional_csv("spellcasting_services.csv")
    services = []
    for row in rows:
        clean = {key.strip(): value for key, value in row.items() if key}
        level = clean.get("Spell Level")
        cost = clean.get("Cost")
        if not level and not cost:
            continue
        services.append(
            {
                "spell_level": normalize_text(level),
                "village": normalize_text(clean.get("Village")),
                "town": normalize_text(clean.get("Town")),
                "city": normalize_text(clean.get("City")),
                "cost": normalize_text(cost),
            }
        )
    return services


def load_hirelings():
    rows = load_optional_csv("Hirelings.csv")
    hirelings = []
    for row in rows:
        clean = {key.strip(): value for key, value in row.items() if key}
        service = clean.get("Service")
        if not service:
            continue
        hirelings.append(
            {
                "service": normalize_text(service),
                "cost": normalize_text(clean.get("Cost")),
            }
        )
    return hirelings


def load_magic_items():
    rows = load_optional_csv("magic_items.csv")
    return [
        {
            "name": normalize_text(row.get("name")),
            "rarity": normalize_text(row.get("rarity")),
            "cost": normalize_text(row.get("cost")),
            "description": normalize_text(row.get("description")),
        }
        for row in rows
        if row.get("name")
    ]


def load_crafting_equipment():
    rows = load_optional_csv("crafting_equipment.csv")
    return [
        {
            "name": normalize_text(row.get("name")),
            "cost": normalize_text(row.get("cost")),
            "weight": normalize_text(row.get("weight")),
            "description": normalize_text(row.get("description")),
        }
        for row in rows
        if row.get("name")
    ]


def load_trinkets():
    rows = load_csv("trinkets.csv")
    return [row.get("trinket") for row in rows if row.get("trinket")]


def load_adventuring_packs():
    rows = load_optional_csv("adventuring_packs.csv")
    packs = {}
    for row in rows:
        clean = {key.strip(): (value.strip() if isinstance(value, str) else value) for key, value in row.items() if key}
        name = normalize_text(clean.get("name"))
        if not name:
            continue
        items = []
        for i in range(1, 15):
            key = f"item_{i}"
            raw = normalize_text(clean.get(key))
            if not raw:
                continue
            qty = 1
            match = re.match(r"^(\\d+)\\s+(.*)$", raw)
            if match:
                qty = int(match.group(1))
                item_name = match.group(2).strip()
            else:
                item_name = raw
            item_name = item_name.rstrip('.')
            items.append({"name": item_name, "qty": qty})
        packs[normalize_name(name)] = {
            "name": name,
            "items": items,
            "weight": normalize_text(clean.get("weight")),
            "cost": normalize_text(clean.get("cost")),
        }
    return packs


def load_creature_stat_blocks():
    rows = load_csv("creature_stat_blocks.csv")
    creatures = []
    for row in rows:
        creatures.append(
            {
                "name": normalize_text(row.get("name")),
                "size": normalize_text(row.get("size")),
                "type": normalize_text(row.get("type")),
                "alignment": normalize_text(row.get("alignment")),
                "ac": normalize_text(row.get("ac")),
                "initiative": normalize_text(row.get("initiative")),
                "hp": normalize_text(row.get("hp")),
                "speed": normalize_text(row.get("speed")),
                "abilities": normalize_text(row.get("abilities")),
                "skills": normalize_text(row.get("skills")),
                "senses": normalize_text(row.get("senses")),
                "languages": normalize_text(row.get("languages")),
                "cr": normalize_text(row.get("cr")),
                "traits": normalize_text(row.get("traits")),
                "actions": normalize_text(row.get("actions")),
                "bonus_actions": normalize_text(row.get("bonus_actions")),
                "reactions": normalize_text(row.get("reactions")),
            }
        )
    return creatures

def load_starting_equipment_higher_levels():
    rows = load_csv("starting_equipment_higher_levels.csv")
    equipment = []
    for row in rows:
        equipment.append(
            {
                "level_min": int(row.get("level_min") or 0),
                "level_max": int(row.get("level_max") or 0),
                "equipment_and_money": normalize_text(row.get("equipment_and_money")),
                "magic_items": normalize_text(row.get("magic_items")),
                "source": normalize_text(row.get("source")),
                "version": normalize_text(row.get("version")),
            }
        )
    return equipment


def load_class_progression():
    path = DATA_DIR / "class_progression.csv"
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle, skipinitialspace=True)
        cleaned = []
        for row in reader:
            clean = {}
            for key, value in row.items():
                if not key:
                    continue
                clean[key.strip()] = normalize_text(value)
            cleaned.append(clean)
    return cleaned


def _parse_feature_effects(raw):
    effects = {}
    if not raw:
        return effects
    parts = [part.strip() for part in re.split(r"[;,]", raw) if part.strip()]
    for part in parts:
        if ":" not in part:
            continue
        key, value = [chunk.strip() for chunk in part.split(":", 1)]
        key_lower = key.lower()
        if key_lower in ("cantrip", "cantrips", "cantrips_bonus"):
            num = re.sub(r"[^\d+-]", "", value)
            try:
                effects["cantrips_bonus"] = int(num)
            except ValueError:
                continue
            continue
        if key_lower in ("armor_training", "armor_training_add"):
            effects["armor_training_add"] = [value.strip()]
            continue
        if key_lower in ("weapon_training", "weapon_training_add"):
            effects["weapon_training_add"] = [value.strip()]
            continue
        if key_lower in ("skill_choice", "skill_choices"):
            skills = [item.strip() for item in re.split(r"[\\/|,]", value) if item.strip()]
            if skills:
                effects["skill_choice"] = skills
            continue
        if key_lower in ("skill_bonus",):
            effects["skill_bonus"] = value.strip()
            continue
        if key_lower in ("language_choice", "language_choices"):
            num = re.sub(r"[^\d+-]", "", value)
            try:
                effects["language_choice"] = int(num)
            except ValueError:
                continue
            continue
        if key_lower in ("weapon_mastery", "weapon_mastery_count"):
            num = re.sub(r"[^\d+-]", "", value)
            try:
                effects["weapon_mastery"] = int(num)
            except ValueError:
                continue
            continue
        if key_lower in ("refresh_on_long_rest",):
            effects["refresh_on_long_rest"] = value.strip()
            continue
        effects.setdefault("notes", []).append(f"{key}: {value}")
    if "notes" in effects:
        effects["notes"] = "; ".join(effects["notes"])
    return effects


def load_feature_choices():
    choices = []
    json_path = DATA_DIR / "feature_choices.json"
    if json_path.exists():
        with json_path.open(encoding="utf-8") as handle:
            data = json.load(handle)
        if isinstance(data, list):
            choices.extend(data)
    csv_path = DATA_DIR / "class_feature_choices.csv"
    if csv_path.exists():
        with csv_path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle, skipinitialspace=True)
            for row in reader:
                class_id = normalize_text(row.get("class_id"))
                level = row.get("level")
                feature = normalize_text(row.get("feature"))
                raw_choices = normalize_text(row.get("choices"))
                if not class_id or not level or not feature or not raw_choices:
                    continue
                options = []
                for option in raw_choices.split("|"):
                    option = option.strip()
                    if not option:
                        continue
                    match = re.match(r"^(.*?)\{(.*)\}$", option)
                    if match:
                        label = match.group(1).strip()
                        effects_raw = match.group(2).strip()
                    else:
                        label = option
                        effects_raw = ""
                    options.append(
                        {
                            "key": label,
                            "label": label,
                            "effects": _parse_feature_effects(effects_raw),
                            "effects_text": effects_raw,
                        }
                    )
                choices.append(
                    {
                        "class_id": class_id,
                        "level": int(level),
                        "feature": feature,
                        "options": options,
                        "source": normalize_text(row.get("source")),
                        "version": normalize_text(row.get("version")),
                    }
                )
    merged = {}
    for entry in choices:
        key = f"{entry.get('class_id')}|{entry.get('level')}|{entry.get('feature')}"
        if key not in merged:
            merged[key] = entry
            continue
        existing = merged[key]
        existing_keys = {opt.get("key") for opt in existing.get("options", [])}
        for opt in entry.get("options", []):
            if opt.get("key") in existing_keys:
                continue
            existing.setdefault("options", []).append(opt)
    return list(merged.values())

def _find_field(row, target):
    target = re.sub(r"[^a-z0-9]+", "", target.lower())
    for key in row.keys():
        if not key:
            continue
        normalized = re.sub(r"[^a-z0-9]+", "", key.lower())
        if normalized == target:
            return key
    return None

def load_class_id_lookup():
    rows = load_csv("classes.csv")
    lookup = {}
    for row in rows:
        name_key = _find_field(row, "name")
        id_key = _find_field(row, "class_id")
        if not name_key or not id_key:
            continue
        name = normalize_name(row.get(name_key, ""))
        class_id = normalize_text(row.get(id_key))
        if name and class_id:
            lookup[name] = class_id
    return lookup


def build_wizard_data():
    classes, normalized_classes = load_classes()
    backgrounds = load_backgrounds()
    species = load_species()
    lineages = load_lineages()
    subclasses = load_subclasses()
    standard_array, standard_array_normalized, standard_array_by_id = load_standard_array()
    point_buy_costs = load_point_buy_costs()
    ability_modifiers = load_ability_modifiers()
    ability_ranges = load_ability_ranges()
    standard_languages, rare_languages = load_languages()
    adventuring_gear = load_adventuring_gear()
    trinkets = load_trinkets()
    adventuring_packs = load_adventuring_packs()
    creatures = load_creature_stat_blocks()
    starting_equipment = load_starting_equipment_higher_levels()
    class_progression = load_class_progression()
    feature_choices = load_feature_choices()
    class_id_by_name = load_class_id_lookup()

    shop_inventory = {
        "armor": load_armor(),
        "weapons": load_weapons(),
        "tools": load_tools(),
        "adventuring_gear": adventuring_gear,
        "mounts_and_vehicles": load_mounts_and_vehicles(),
        "food_drink_lodging": load_food_drink_lodging(),
        "spellcasting_services": load_spellcasting_services(),
        "hirelings": load_hirelings(),
        "magic_items": load_magic_items(),
        "crafting_equipment": load_crafting_equipment(),
    }

    return {
        "classes": classes,
        "normalizedClasses": normalized_classes,
        "backgrounds": backgrounds,
        "species": species,
        "lineages": lineages,
        "subclasses": subclasses,
        "standardArrayByClass": standard_array,
        "standardArrayByClassNormalized": standard_array_normalized,
        "standardArrayByClassId": standard_array_by_id,
        "pointBuyCosts": point_buy_costs,
        "abilityModifiers": ability_modifiers,
        "abilityScoreRanges": ability_ranges,
        "adventuringGear": adventuring_gear,
        "trinkets": trinkets,
        "adventuringPacks": adventuring_packs,
        "creatures": creatures,
        "standardLanguages": standard_languages,
        "rareLanguages": rare_languages,
        "startingEquipmentHigherLevels": starting_equipment,
        "classProgression": class_progression,
        "featureChoices": feature_choices,
        "classIdByName": class_id_by_name,
        "shopInventory": shop_inventory,
    }


def main():
    data = build_wizard_data()
    OUTPUT_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Wizard data generated at {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
