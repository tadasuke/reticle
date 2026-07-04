from typing import Any

from . import service as image_service
from .specs import validate_character_id
from .storage import (
    adopt_image,
    count_candidates,
    create_character,
    get_reference_info,
    list_character_ids,
    list_gallery_images,
    load_spec,
    save_spec,
)


def list_characters() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for character_id in list_character_ids():
        reference = get_reference_info(character_id)
        items.append(
            {
                "characterId": character_id,
                "hasReference": reference is not None,
                "candidateCount": count_candidates(character_id),
            }
        )
    return items


def get_character_detail(character_id: str) -> dict[str, Any]:
    character_id = validate_character_id(character_id)
    spec = load_spec(character_id)
    return {
        "characterId": character_id,
        "spec": {
            "visual_anchor": spec.visual_anchor,
            "must_avoid": spec.must_avoid,
            "negative_prompt": spec.negative_prompt,
        },
        "reference": get_reference_info(character_id),
        "gallery": list_gallery_images(character_id),
    }


def create_new_character(
    visual_anchor: str,
    must_avoid: str,
    negative_prompt: str,
) -> dict[str, Any]:
    spec = create_character(
        visual_anchor=visual_anchor,
        must_avoid=must_avoid,
        negative_prompt=negative_prompt,
    )
    return get_character_detail(spec.character_id)


def update_spec(
    character_id: str,
    visual_anchor: str,
    must_avoid: str,
    negative_prompt: str,
) -> dict[str, Any]:
    character_id = validate_character_id(character_id)
    if not visual_anchor.strip():
        raise ValueError("visual_anchor is required")
    spec = save_spec(
        character_id,
        visual_anchor=visual_anchor,
        must_avoid=must_avoid,
        negative_prompt=negative_prompt,
    )
    return {
        "visual_anchor": spec.visual_anchor,
        "must_avoid": spec.must_avoid,
        "negative_prompt": spec.negative_prompt,
    }


def generate_images(character_id: str, count: int, seed: int | None) -> list[dict[str, Any]]:
    validate_character_id(character_id)
    load_spec(character_id)
    if count < 1 or count > 4:
        raise ValueError("count must be between 1 and 4")
    return image_service.generate_candidates(character_id, count=count, seed=seed)


def edit_image(
    character_id: str,
    source_image_id: str,
    instruction: str,
    seed: int | None,
) -> dict[str, Any]:
    validate_character_id(character_id)
    if not instruction.strip():
        raise ValueError("instruction is required")
    return image_service.edit_image(
        character_id,
        source_image_id=source_image_id,
        instruction=instruction.strip(),
        seed=seed,
    )


def stress_test(character_id: str, source_image_id: str, seed: int | None) -> list[dict[str, Any]]:
    validate_character_id(character_id)
    return image_service.run_stress_test(
        character_id,
        source_image_id=source_image_id,
        seed=seed,
    )


def adopt_reference(character_id: str, source_image_id: str) -> dict[str, Any]:
    validate_character_id(character_id)
    return adopt_image(character_id, source_image_id)
