from dataclasses import dataclass
import re

DEFAULT_NEGATIVE_PROMPT = (
    "cartoon, anime, illustration, drawing, "
    "ugly, deformed, blurry, low quality, "
    "watermark, text, logo"
)

DEFAULT_SAFETY_SUFFIX = (
    "modest casual clothing, friendly and approachable, language learning app profile photo"
)

CHARACTER_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@dataclass
class CharacterVisualSpec:
    character_id: str
    label: str
    visual_anchor: str
    must_avoid: str
    negative_prompt: str


def validate_character_id(character_id: str) -> str:
    normalized = character_id.strip().lower()
    if not normalized or len(normalized) > 64:
        raise ValueError("characterId must be 1-64 characters")
    if not CHARACTER_ID_PATTERN.match(normalized):
        raise ValueError("characterId must use lowercase letters, numbers, and hyphens only")
    return normalized
