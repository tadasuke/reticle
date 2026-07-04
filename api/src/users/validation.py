from __future__ import annotations

import re
from datetime import UTC, datetime

USER_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{3,32}$")


class InvalidUserIdError(ValueError):
    pass


def validate_user_id(user_id: str) -> str:
    normalized = user_id.strip()
    if not USER_ID_PATTERN.match(normalized):
        raise InvalidUserIdError(
            "userId must be 3-32 characters and contain only letters, numbers, underscores, or hyphens."
        )
    return normalized


def now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()
