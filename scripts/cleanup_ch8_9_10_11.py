import csv
import re
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
DATA_DIR = BASE / "data_sets" / "D&D"

COMMON_WORDS = [
    "ability", "abilities", "action", "actions", "advantage", "disadvantage", "adventure", "adventuring",
    "alignment", "alignments", "attack", "attacks", "bonus", "reaction", "condition", "conditions",
    "creature", "creatures", "character", "characters", "encounter", "encounters",
    "damage", "dexterity", "strength", "constitution", "intelligence", "wisdom", "charisma",
    "modifier", "modifiers", "proficiency", "proficient", "initiative", "saving", "throw", "throws",
    "spell", "spells", "casting", "components", "material", "verbal", "somatic", "ritual", "concentration",
    "range", "ranges", "distance", "feet", "foot", "speed", "movement", "difficult", "terrain",
    "area", "effect", "emanation", "sphere", "cylinder", "line", "cone", "cube", "cover", "total", "half",
    "armor", "class", "shield", "light", "medium", "heavy", "weapon", "weapons", "melee", "ranged",
    "hit", "points", "temporary", "resistance", "resistances", "immune", "immunity", "immunities",
    "blinded", "darkvision", "blindsight", "invisible", "prone", "grappled", "restrained",
    "frightened", "poisoned", "paralyzed", "stunned", "exhaustion",
    "success", "failure", "successful", "dispel", "opportunity", "attack", "roll", "rolls",
    "neutral", "chaotic", "lawful", "good", "evil", "material", "plane", "planes",
    "outer", "inner", "transitive", "elemental", "shadowfell", "ethereal", "astral", "outlands", "sigil",
    "perception", "senses", "languages", "glossary", "definitions", "defined", "definition",
    "chapter", "rules", "entries", "entry", "features", "feature", "choose", "using", "use", "used",
    "provides", "provided", "provide", "including", "between", "within", "position", "point", "origin",
    "location", "obstruction", "straight", "lines", "extending", "blocked", "block", "near", "side",
    "unseen", "target", "targets", "make", "takes", "take", "turn", "turns", "attack", "roll",
    "represents", "represent", "specific", "associated", "overcome", "challenge", "experience",
    "score", "scores", "adventures", "creatures", "actions", "features", "rules", "defined",
    "they", "their", "them", "there", "other", "another", "elsewhere",
        "corresponding", "corresponds", "feature", "features", "adventure", "party", "parties",
        "provide", "provides", "provided", "effect", "effects", "energy", "creator", "creates",
        "created", "area", "areas", "each", "which", "when", "while", "without", "within",
        "between", "before", "after", "under", "over", "into", "from", "your", "you",
]

COMMON_WORD_SET = {w.lower() for w in COMMON_WORDS}

STOP_WORDS = {
    "the", "and", "a", "an", "to", "of", "for", "with", "from", "on", "in", "by", "or", "as",
    "at", "is", "are", "was", "were", "be", "been", "being", "that", "this", "these", "those",
    "your", "you",
}

TARGETED_FIXES = [
    (re.compile(r"\bf\s+eatur\s+es\b", re.IGNORECASE), "features"),
    (re.compile(r"\bfeatur\s+e\b", re.IGNORECASE), "feature"),
    (re.compile(r"\badv\s+entur\s+e\b", re.IGNORECASE), "adventure"),
    (re.compile(r"\badv\s+entur\s+ing\b", re.IGNORECASE), "adventuring"),
    (re.compile(r"\badv\s+entur\s+es\b", re.IGNORECASE), "adventures"),
    (re.compile(r"\badv\s+enturing\b", re.IGNORECASE), "adventuring"),
    (re.compile(r"\bcr\s+eatur\s+e\b", re.IGNORECASE), "creature"),
    (re.compile(r"\bcr\s+eatur\s+es\b", re.IGNORECASE), "creatures"),
    (re.compile(r"\bar\s+ea\b", re.IGNORECASE), "area"),
    (re.compile(r"\beff\s+ect\b", re.IGNORECASE), "effect"),
    (re.compile(r"\beff\s+ects\b", re.IGNORECASE), "effects"),
    (re.compile(r"\bener\s+gy\b", re.IGNORECASE), "energy"),
    (re.compile(r"\bpr\s+ovide\b", re.IGNORECASE), "provide"),
    (re.compile(r"\bpr\s+ovides\b", re.IGNORECASE), "provides"),
    (re.compile(r"\bcorr\s+esponding\b", re.IGNORECASE), "corresponding"),
    (re.compile(r"\bbr\s+oadly\b", re.IGNORECASE), "broadly"),
    (re.compile(r"\bst\s+ory\b", re.IGNORECASE), "story"),
    (re.compile(r"\bemer\s+ges\b", re.IGNORECASE), "emerges"),
    (re.compile(r"\bthr\s+ough\b", re.IGNORECASE), "through"),
    (re.compile(r"\bpla\s+ying\b", re.IGNORECASE), "playing"),
    (re.compile(r"\bmor\s+ality\b", re.IGNORECASE), "morality"),
    (re.compile(r"\bt\s+owar\s+d\b", re.IGNORECASE), "toward"),
    (re.compile(r"\bfact\s+ors\b", re.IGNORECASE), "factors"),
    (re.compile(r"\btowar\s+d\b", re.IGNORECASE), "toward"),
    (re.compile(r"\baff\s+ected\b", re.IGNORECASE), "affected"),
    (re.compile(r"\bmor\s+e\b", re.IGNORECASE), "more"),
    (re.compile(r"\belsewher\s+e\b", re.IGNORECASE), "elsewhere"),
]

SHORT_SPLITS = [
    (re.compile(r"\b[yY]\s+ou\b"), "you"),
    (re.compile(r"\b[yY]\s+our\b"), "your"),
    (re.compile(r"\b[iI]\s+n\b"), "in"),
    (re.compile(r"\b[aA]\s+n\b"), "an"),
    (re.compile(r"\b[tT]\s+o\b"), "to"),
    (re.compile(r"\b[oO]\s+f\b"), "of"),
    (re.compile(r"\b[aA]\s+nd\b"), "and"),
    (re.compile(r"\b[fF]\s+or\b"), "for"),
    (re.compile(r"\b[wW]\s+ith\b"), "with"),
    (re.compile(r"\b[fF]r\s+om\b"), "from"),
    (re.compile(r"\b[tT]h\s+e\b"), "the"),
    (re.compile(r"\b[tT]h\s+at\b"), "that"),
    (re.compile(r"\b[tT]h\s+is\b"), "this"),
    (re.compile(r"\b[hH]a\s+ve\b"), "have"),
    (re.compile(r"\b[hH]a\s+s\b"), "has"),
    (re.compile(r"\b[aA]r\s+e\b"), "are"),
    (re.compile(r"\b[wW]a\s+s\b"), "was"),
    (re.compile(r"\b[wW]e\s+re\b"), "were"),
    (re.compile(r"\b[cC]a\s+n\b"), "can"),
    (re.compile(r"\b[nN]o\s+t\b"), "not"),
    (re.compile(r"\b[mM]o\s+re\b"), "more"),
        (re.compile(r"\b[bB]\s+y\b"), "by"),
]


def normalize_text(value: str) -> str:
    if not value:
        return value
    replacements = {
        "\xa0": " ",
        "â€™": "'",
        "â€“": "-",
        "â€”": "-",
        "â€œ": '"',
        "â€": '"',
        "â€˜": "'",
        "ﬁ": "fi",
        "ﬂ": "fl",
        "ï¬\u0001": "fi",
        "ï¬\u0002": "fl",
        "ï¬\u0003": "ffi",
        "ï¬\u0004": "ffl",
        "ï¬‚": "fl",
        "ï¬€": "ff",
        "−": "-",
    }
    for k, v in replacements.items():
        value = value.replace(k, v)

    # Fix common short-word splits like "y ou", "t o", "th e"
    for pattern, replacement in SHORT_SPLITS:
        value = pattern.sub(replacement, value)

    # Targeted OCR split fixes
    for pattern, replacement in TARGETED_FIXES:
        value = pattern.sub(replacement, value)

    # Merge split words only if the combined token is in the common word set
    def _merge_if_common(match: re.Match) -> str:
        combined = (match.group(1) + match.group(2)).lower()
        return match.group(1) + match.group(2) if combined in COMMON_WORD_SET else match.group(0)

    value = re.sub(r"\b([A-Za-z])\s+([a-z]{3,})\b", _merge_if_common, value)
    stop = "|".join(sorted(STOP_WORDS))
    value = re.sub(rf"\b(?!{stop}\b)([A-Za-z]{{2,8}})\s+([a-z]{{2,12}})\b", _merge_if_common, value)
    value = re.sub(r"\b([A-Za-z]{3,})\s+([a-z]{1,2})\b", _merge_if_common, value)

    # Merge words with multiple spaced letters if the combined token is common
    def _merge_spaced(match: re.Match) -> str:
        combined = re.sub(r"\s+", "", match.group(0))
        return combined if combined.lower() in COMMON_WORD_SET else match.group(0)

    def _merge_spaced_punct(match: re.Match) -> str:
        combined = re.sub(r"\s+", "", match.group(1))
        if combined.lower() in COMMON_WORD_SET:
            return combined + match.group(2)
        return match.group(0)

    value = re.sub(r"\b([A-Za-z]{1,6}(?:\s+[A-Za-z]{1,6})+)([\.,;:])", _merge_spaced_punct, value)
    value = re.sub(r"\b([A-Za-z]{1,6}(?:\s+[A-Za-z]{1,6})+)\b", _merge_spaced, value)

    # Collapse extra spaces
    value = re.sub(r"\s+", " ", value).strip()
    return value


def clean_csv(path: Path, columns: list[str] | None = None) -> None:
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames or []

    if columns:
        cols = [c for c in columns if c in fieldnames]
    else:
        cols = fieldnames

    for row in rows:
        for col in cols:
            row[col] = normalize_text(row.get(col, ""))

    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    # Chapter 8 spell descriptions
    clean_csv(
        DATA_DIR / "spells_ch8.csv",
        columns=["name", "level", "school", "casting_time", "range", "components", "duration", "description"],
    )

    # Chapter 9 multiverse appendix
    clean_csv(DATA_DIR / "multiverse_planes.csv", columns=["name", "category", "description"])
    clean_csv(DATA_DIR / "outer_planes_alignments.csv", columns=["plane", "alignment"])

    # Chapter 10 creature stat blocks
    clean_csv(
        DATA_DIR / "creature_stat_blocks.csv",
        columns=[
            "name", "size", "type", "alignment", "ac", "initiative", "hp", "speed",
            "abilities", "skills", "senses", "languages", "cr", "traits", "actions",
            "bonus_actions", "reactions",
        ],
    )

    # Chapter 11 rules glossary
    clean_csv(DATA_DIR / "rules_glossary.csv", columns=["term", "definition"])

    print("Cleanup complete")


if __name__ == "__main__":
    main()
