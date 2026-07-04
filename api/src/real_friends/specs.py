from dataclasses import dataclass

from src.character_image_studio.specs import validate_character_id

ID_PREFIX = "real-"
ID_WIDTH = 4


PHOTO_ID_PREFIX = "photo-"
PHOTO_ID_WIDTH = 4


@dataclass
class RealFriendPhotoSpec:
    id: str
    filename: str
    created_at: str


@dataclass
class RealFriendProfileSpec:
    id: str
    label: str
    age: int
    nationality: str
    gender: str
    source_app: str
    bio: str
    notes: str
    created_at: str
    updated_at: str
    last_interaction_at: str = ""
    photos: list[RealFriendPhotoSpec] | None = None
    default_photo_id: str | None = None


def validate_real_friend_id(friend_id: str) -> str:
    return validate_character_id(friend_id)


def build_subtitle(age: int, nationality: str, gender: str, source_app: str) -> str:
    gender_label = {
        "female": "女性",
        "male": "男性",
        "non-binary": "ノンバイナリー",
    }.get(gender.strip().lower(), gender.strip())
    parts = [f"{age}歳"]
    if nationality.strip():
        parts.append(nationality.strip())
    if gender_label:
        parts.append(gender_label)
    if source_app.strip():
        parts.append(source_app.strip())
    return "・".join(parts)
