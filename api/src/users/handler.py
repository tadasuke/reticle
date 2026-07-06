from __future__ import annotations

from typing import Any

from .repository import UserNotFoundError, get_user, login_existing_user
from .validation import InvalidUserIdError, validate_user_id


def login_user(*, user_id: str) -> dict[str, Any]:
    normalized = validate_user_id(user_id)
    user = login_existing_user(normalized)
    return {"user": user}


def get_user_profile(*, user_id: str) -> dict[str, Any]:
    normalized = validate_user_id(user_id)
    user = get_user(normalized)
    if not user:
        raise ValueError(f"User not found: {normalized}")
    return {"user": user}


def normalize_user_id(user_id: str) -> str:
    return validate_user_id(user_id)


__all__ = [
    "InvalidUserIdError",
    "UserNotFoundError",
    "get_user_profile",
    "login_user",
    "normalize_user_id",
]
