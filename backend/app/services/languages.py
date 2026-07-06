import json
from functools import lru_cache
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data" / "languages.json"


@lru_cache
def registry() -> dict:
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def all_languages() -> list[dict]:
    return registry()["languages"]


def styles_for(code: str) -> list[dict]:
    return registry()["styles"].get(code, [{"id": "standard", "name": "Standard", "axes": {}}])


def is_supported(code: str) -> bool:
    return any(lang["code"] == code for lang in all_languages())


def default_style(code: str) -> str:
    styles = styles_for(code)
    for s in styles:
        if s.get("default"):
            return s["id"]
    return styles[0]["id"]
