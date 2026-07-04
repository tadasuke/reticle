from .specs import DEFAULT_SAFETY_SUFFIX, CharacterVisualSpec

STRESS_TEST_SELFIE_FRAMING = (
    "The person in Image 1 taking a selfie with their own smartphone at arm's length, "
    "front-facing camera, photographing themselves"
)

STRESS_TEST_SCENES = [
    {
        "id": "cafe",
        "label": "Cafe selfie",
        "instruction": (
            f"{STRESS_TEST_SELFIE_FRAMING} at a cozy cafe with a latte, natural smile"
        ),
    },
    {
        "id": "park",
        "label": "Park selfie",
        "instruction": (
            f"{STRESS_TEST_SELFIE_FRAMING} in a city park, natural daylight, natural smile"
        ),
    },
    {
        "id": "home",
        "label": "Home selfie",
        "instruction": (
            f"{STRESS_TEST_SELFIE_FRAMING} at home in a relaxed setting"
        ),
    },
]


def build_portrait_prompt(spec: CharacterVisualSpec) -> str:
    avoid_clause = f" Avoid: {spec.must_avoid}." if spec.must_avoid else ""
    return (
        f"{spec.visual_anchor}, "
        "single person, looking at camera, upper body portrait, "
        "shallow depth of field, simple blurred background, "
        "natural skin texture, photorealistic, high quality SNS profile photo, "
        f"{DEFAULT_SAFETY_SUFFIX}.{avoid_clause}"
    )


def build_edit_prompt(instruction: str) -> str:
    return (
        f"The person in Image 1. {instruction.strip()}. "
        "Keep the same person's face, hairstyle, and identity. "
        f"{DEFAULT_SAFETY_SUFFIX}."
    )


def build_stress_test_prompt(scene_instruction: str) -> str:
    return (
        f"{scene_instruction}. "
        "Keep the same person's face, hairstyle, and identity. "
        f"{DEFAULT_SAFETY_SUFFIX}."
    )
