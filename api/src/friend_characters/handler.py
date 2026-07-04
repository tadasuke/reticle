from typing import Any

from .storage import (
    create_persona,
    delete_persona,
    load_persona,
    persona_to_detail,
    persona_to_list_item,
    update_persona,
)


def list_friend_types(*, include_disabled: bool = False) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for spec in _load_all_personas():
        if not include_disabled and not spec.enabled:
            continue
        items.append(persona_to_list_item(spec))
    return items


def _load_all_personas():
    from .storage import list_friend_ids

    for friend_id in list_friend_ids():
        yield load_persona(friend_id)


def get_friend_type_detail(friend_id: str) -> dict[str, Any]:
    spec = load_persona(friend_id)
    return persona_to_detail(spec)


def create_friend_type(
    *,
    friend_id: str | None,
    label: str,
    age: int,
    nationality: str,
    gender: str,
    subtitle: str,
    description: str,
    persona: str,
    enabled: bool,
) -> dict[str, Any]:
    spec = create_persona(
        friend_id=friend_id,
        label=label,
        age=age,
        nationality=nationality,
        gender=gender,
        subtitle=subtitle,
        description=description,
        persona=persona,
        enabled=enabled,
    )
    return persona_to_detail(spec)


def update_friend_type(
    friend_id: str,
    *,
    label: str,
    age: int,
    nationality: str,
    gender: str,
    subtitle: str,
    description: str,
    persona: str,
    enabled: bool,
) -> dict[str, Any]:
    spec = update_persona(
        friend_id,
        label=label,
        age=age,
        nationality=nationality,
        gender=gender,
        subtitle=subtitle,
        description=description,
        persona=persona,
        enabled=enabled,
    )
    return persona_to_detail(spec)


def delete_friend_type(friend_id: str) -> None:
    delete_persona(friend_id)
