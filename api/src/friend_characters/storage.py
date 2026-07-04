from pathlib import Path
from typing import Any

import shutil
import yaml

from src.assets_paths import get_friends_root

from .specs import (
    FriendPersonaSpec,
    ID_PREFIX,
    ID_WIDTH,
    build_subtitle,
    validate_friend_id,
)

PERSONA_FILENAME = "persona.yaml"
REFERENCE_FILENAME = "reference.png"


def get_friend_dir(friend_id: str) -> Path:
    return get_friends_root() / friend_id


def _persona_path(friend_id: str) -> Path:
    return get_friend_dir(friend_id) / PERSONA_FILENAME


def _reference_path(friend_id: str) -> Path:
    return get_friend_dir(friend_id) / REFERENCE_FILENAME


def _reference_url(friend_id: str) -> str:
    return f"/media/friends/{friend_id}/{REFERENCE_FILENAME}"


def has_reference_image(friend_id: str) -> bool:
    return _reference_path(friend_id).exists()


def list_friend_ids() -> list[str]:
    root = get_friends_root()
    if not root.exists():
        return []
    ids: list[str] = []
    for path in sorted(root.iterdir()):
        if path.is_dir() and (path / PERSONA_FILENAME).exists():
            ids.append(path.name)
    return ids


def generate_friend_id() -> str:
    existing = set(list_friend_ids())
    max_num = 0
    for friend_id in existing:
        if friend_id.startswith(ID_PREFIX):
            suffix = friend_id[len(ID_PREFIX) :]
            if suffix.isdigit():
                max_num = max(max_num, int(suffix))
    return f"{ID_PREFIX}{max_num + 1:0{ID_WIDTH}d}"


def _parse_persona_data(friend_id: str, data: dict[str, Any]) -> FriendPersonaSpec:
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

    return FriendPersonaSpec(
        id=friend_id,
        label=label,
        age=age,
        nationality=nationality,
        gender=gender,
        subtitle=subtitle,
        description=description,
        persona=persona,
        enabled=enabled,
    )


def load_persona(friend_id: str) -> FriendPersonaSpec:
    friend_id = validate_friend_id(friend_id)
    path = _persona_path(friend_id)
    if not path.exists():
        raise ValueError(f"Friend character not found: {friend_id}")

    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    return _parse_persona_data(friend_id, data)


def _persona_to_dict(spec: FriendPersonaSpec) -> dict[str, Any]:
    return {
        "id": spec.id,
        "label": spec.label,
        "age": spec.age,
        "nationality": spec.nationality,
        "gender": spec.gender,
        "subtitle": spec.subtitle,
        "description": spec.description,
        "persona": spec.persona,
        "enabled": spec.enabled,
    }


def save_persona(spec: FriendPersonaSpec) -> FriendPersonaSpec:
    friend_id = validate_friend_id(spec.id)
    char_dir = get_friend_dir(friend_id)
    char_dir.mkdir(parents=True, exist_ok=True)

    with _persona_path(friend_id).open("w", encoding="utf-8") as f:
        yaml.dump(
            _persona_to_dict(spec),
            f,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
        )
    return spec


def create_persona(
    *,
    friend_id: str | None,
    label: str,
    age: int,
    nationality: str = "",
    gender: str = "",
    subtitle: str = "",
    description: str = "",
    persona: str,
    enabled: bool = True,
) -> FriendPersonaSpec:
    resolved_id = validate_friend_id(friend_id.strip()) if friend_id and friend_id.strip() else generate_friend_id()
    while _persona_path(resolved_id).exists():
        if friend_id and friend_id.strip():
            raise ValueError(f"Friend character already exists: {resolved_id}")
        suffix = resolved_id[len(ID_PREFIX) :]
        next_num = int(suffix) + 1 if suffix.isdigit() else 1
        resolved_id = f"{ID_PREFIX}{next_num:0{ID_WIDTH}d}"

    spec = _parse_persona_data(
        resolved_id,
        {
            "label": label,
            "age": age,
            "nationality": nationality,
            "gender": gender,
            "subtitle": subtitle,
            "description": description,
            "persona": persona,
            "enabled": enabled,
        },
    )
    return save_persona(spec)


def update_persona(
    friend_id: str,
    *,
    label: str,
    age: int,
    nationality: str = "",
    gender: str = "",
    subtitle: str = "",
    description: str = "",
    persona: str,
    enabled: bool = True,
) -> FriendPersonaSpec:
    friend_id = validate_friend_id(friend_id)
    if not _persona_path(friend_id).exists():
        raise ValueError(f"Friend character not found: {friend_id}")

    spec = _parse_persona_data(
        friend_id,
        {
            "label": label,
            "age": age,
            "nationality": nationality,
            "gender": gender,
            "subtitle": subtitle,
            "description": description,
            "persona": persona,
            "enabled": enabled,
        },
    )
    return save_persona(spec)


def delete_persona(friend_id: str) -> None:
    friend_id = validate_friend_id(friend_id)
    path = _persona_path(friend_id)
    if not path.exists():
        raise ValueError(f"Friend character not found: {friend_id}")
    shutil.rmtree(get_friend_dir(friend_id))


def persona_to_list_item(spec: FriendPersonaSpec) -> dict[str, Any]:
    return {
        "id": spec.id,
        "label": spec.label,
        "subtitle": spec.subtitle,
        "description": spec.description,
        "age": spec.age,
        "enabled": spec.enabled,
        "hasReference": has_reference_image(spec.id),
        "referenceUrl": _reference_url(spec.id) if has_reference_image(spec.id) else None,
    }


def persona_to_detail(spec: FriendPersonaSpec) -> dict[str, Any]:
    assets_root = get_friends_root()
    return {
        **persona_to_list_item(spec),
        "nationality": spec.nationality,
        "gender": spec.gender,
        "persona": spec.persona,
        "referenceUrl": _reference_url(spec.id) if has_reference_image(spec.id) else None,
        "imageFolderPath": str(assets_root / spec.id),
    }
