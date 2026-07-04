from __future__ import annotations

ID_PREFIX = "conv-"
ID_WIDTH = 4

SCENARIO_IDS = {"casual", "cafe", "bar", "sns"}
SUPPORT_TYPES = {"high", "middle", "low"}


def validate_conversation_id(conversation_id: str) -> str:
    normalized = conversation_id.strip()
    if not normalized.startswith(ID_PREFIX):
        raise ValueError(f"Invalid conversation id: {conversation_id}")
    suffix = normalized[len(ID_PREFIX) :]
    if not suffix.isdigit():
        raise ValueError(f"Invalid conversation id: {conversation_id}")
    return normalized
