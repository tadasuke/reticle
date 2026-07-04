from typing import Any

from .storage import list_buddy_ids, load_persona, persona_to_list_item


def list_buddy_types(*, include_disabled: bool = False) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for buddy_id in list_buddy_ids():
        spec = load_persona(buddy_id)
        if not include_disabled and not spec.enabled:
            continue
        items.append(persona_to_list_item(spec))
    return items
