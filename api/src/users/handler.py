from __future__ import annotations

from typing import Any

from .repository import login_or_create_user
from .validation import InvalidUserIdError, validate_user_id


def login_user(*, user_id: str) -> dict[str, Any]:
    normalized = validate_user_id(user_id)
    user, is_new = login_or_create_user(normalized)
    return {"user": user, "isNew": is_new}


def normalize_user_id(user_id: str) -> str:
    return validate_user_id(user_id)


__all__ = ["InvalidUserIdError", "login_user", "normalize_user_id"]
