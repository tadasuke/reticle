from pathlib import Path
from typing import Any

import yaml

from src.assets_paths import get_buddies_root

from .specs import BuddyPersonaSpec, build_subtitle, validate_buddy_id

PERSONA_FILENAME = "persona.yaml"
REFERENCE_FILENAME = "reference.png"


def get_buddy_dir(buddy_id: str) -> Path:
    return get_buddies_root() / buddy_id


def _persona_path(buddy_id: str) -> Path:
    return get_buddy_dir(buddy_id) / PERSONA_FILENAME


def _reference_path(buddy_id: str) -> Path:
    return get_buddy_dir(buddy_id) / REFERENCE_FILENAME


def _reference_url(buddy_id: str) -> str:
    return f"/media/buddies/{buddy_id}/{REFERENCE_FILENAME}"


def has_reference_image(buddy_id: str) -> bool:
    return _reference_path(buddy_id).exists()


def list_buddy_ids() -> list[str]:
    root = get_buddies_root()
    if not root.exists():
        return []
    ids: list[str] = []
    for path in sorted(root.iterdir()):
        if path.is_dir() and (path / PERSONA_FILENAME).exists():
            ids.append(path.name)
    return ids


def _parse_persona_data(buddy_id: str, data: dict[str, Any]) -> BuddyPersonaSpec:
    label = str(data.get("label", "")).strip()
    if not label:
        raise ValueError("label is required")

    age_raw = data.get("age")
    if age_raw is None:
        raise ValueError("age is required")
    age = int(age_raw)
    if age < 1 or age > 120:
        raise ValueError("age must be between 1 and 120")

    nationality = str(data.get("nationality", "")).strip()
    gender = str(data.get("gender", "")).strip()
    description = str(data.get("description", "")).strip()
    persona = str(data.get("persona", "")).strip()
    if not persona:
        raise ValueError("persona is required")

    subtitle = str(data.get("subtitle", "")).strip()
    if not subtitle:
        subtitle = build_subtitle(age, nationality, gender)

    enabled = bool(data.get("enabled", True))

    return BuddyPersonaSpec(
        id=buddy_id,
        label=label,
        age=age,
        nationality=nationality,
        gender=gender,
        subtitle=subtitle,
        description=description,
        persona=persona,
        enabled=enabled,
    )


def load_persona(buddy_id: str) -> BuddyPersonaSpec:
    buddy_id = validate_buddy_id(buddy_id)
    path = _persona_path(buddy_id)
    if not path.exists():
        raise ValueError(f"Buddy character not found: {buddy_id}")

    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    return _parse_persona_data(buddy_id, data)


def persona_to_list_item(spec: BuddyPersonaSpec) -> dict[str, Any]:
    return {
        "id": spec.id,
        "label": spec.label,
        "subtitle": spec.subtitle,
        "description": spec.description,
        "age": spec.age,
        "enabled": spec.enabled,
        "hasReference": has_reference_image(spec.id),
    }
