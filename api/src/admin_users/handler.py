from __future__ import annotations

from typing import Any

from .repository import (
    InvalidTokenAmountError,
    UserAlreadyExistsError,
    UserNotFoundError,
    create_admin_user,
    delete_admin_user,
    get_admin_user_detail,
    grant_admin_user_tokens,
    list_all_profiles,
)


def list_users() -> dict[str, Any]:
    profiles = list_all_profiles()
    users = [
        {
            "userId": profile["userId"],
            "lastLoginAt": profile["lastLoginAt"],
            "aiTokenBalance": profile["aiTokenBalance"],
        }
        for profile in profiles
    ]
    return {"users": users}


def get_user_detail(user_id: str) -> dict[str, Any]:
    detail = get_admin_user_detail(user_id)
    if not detail:
        raise UserNotFoundError(f"User not found: {user_id}")
    return {"user": detail}


def create_user(*, user_id: str, initial_tokens: int) -> dict[str, Any]:
    detail = create_admin_user(user_id, initial_tokens)
    return {"user": detail}


def grant_user_tokens(*, user_id: str, tokens: int) -> dict[str, Any]:
    detail = grant_admin_user_tokens(user_id, tokens)
    return {"user": detail}


def delete_user(user_id: str) -> dict[str, Any]:
    delete_admin_user(user_id)
    return {"ok": True}


__all__ = [
    "InvalidTokenAmountError",
    "UserAlreadyExistsError",
    "UserNotFoundError",
    "create_user",
    "delete_user",
    "get_user_detail",
    "grant_user_tokens",
    "list_users",
]
