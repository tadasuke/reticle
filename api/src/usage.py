from __future__ import annotations

from typing import Any


def total_tokens_from_usage(usage: dict[str, Any]) -> int:
    return (
        int(usage.get("input_tokens", 0))
        + int(usage.get("output_tokens", 0))
        + int(usage.get("cache_creation_input_tokens", 0))
        + int(usage.get("cache_read_input_tokens", 0))
    )
