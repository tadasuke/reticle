from dataclasses import dataclass

from src.character_image_studio.specs import validate_character_id


@dataclass
class BuddyPersonaSpec:
    id: str
    label: str
    age: int
    nationality: str
    gender: str
    subtitle: str
    description: str
    persona: str
    enabled: bool = True


def validate_buddy_id(buddy_id: str) -> str:
    return validate_character_id(buddy_id)


def build_subtitle(age: int, nationality: str, gender: str) -> str:
    gender_label = {
        "female": "女性",
        "male": "男性",
        "non-binary": "ノンバイナリー",
    }.get(gender.strip().lower(), gender.strip())
    nationality_part = nationality.strip()
    if nationality_part and gender_label:
        return f"{age}歳・{nationality_part}・{gender_label}"
    if nationality_part:
        return f"{age}歳・{nationality_part}"
    return f"{age}歳"
