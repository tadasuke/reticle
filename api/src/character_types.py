from dataclasses import dataclass

from src.buddy_characters.storage import list_buddy_ids, load_persona
from src.friend_characters.storage import list_friend_ids, load_persona as load_friend_persona


@dataclass(frozen=True)
class CharacterTypeData:
    id: str
    label: str
    persona: str
    subtitle: str = ""
    description: str = ""
    age: int = 0
    nationality: str = ""
    gender: str = ""


DEFAULT_BUDDY_TYPE = "coach"


def get_friend_type(type_id: str) -> CharacterTypeData:
    spec = load_friend_persona(type_id)
    if not spec.enabled:
        raise ValueError(f"Friend character is disabled: {type_id}")
    return CharacterTypeData(
        id=spec.id,
        label=spec.label,
        persona=spec.persona,
        subtitle=spec.subtitle,
        description=spec.description,
        age=spec.age,
        nationality=spec.nationality,
        gender=spec.gender,
    )


def is_valid_friend_type(type_id: str) -> bool:
    try:
        get_friend_type(type_id)
        return True
    except ValueError:
        return False


def get_buddy_type(type_id: str) -> CharacterTypeData:
    spec = load_persona(type_id)
    if not spec.enabled:
        raise ValueError(f"Buddy character is disabled: {type_id}")
    return CharacterTypeData(
        id=spec.id,
        label=spec.label,
        persona=spec.persona,
        subtitle=spec.subtitle,
        description=spec.description,
        age=spec.age,
        nationality=spec.nationality,
        gender=spec.gender,
    )


def is_valid_buddy_type(type_id: str) -> bool:
    if type_id not in list_buddy_ids():
        return False
    try:
        get_buddy_type(type_id)
        return True
    except ValueError:
        return False
