from __future__ import annotations

from typing import Any

from src.db.client import get_table
from src.db.keys import profile_sk, user_pk
from src.token_ledger.repository import ensure_profile_token_fields

from .validation import now_iso


class UserNotFoundError(ValueError):
    pass


def _read_ai_tokens_used(item: dict[str, Any]) -> int:
    if "aiTokensUsed" in item:
        return int(item["aiTokensUsed"])
    return int(item.get("aiCreditsUsed", 0))


def _read_ai_token_balance(item: dict[str, Any]) -> int:
    if "aiTokenBalance" in item:
        return int(item["aiTokenBalance"])
    from src.token_ledger.constants import INITIAL_TOKEN_GRANT

    return max(0, INITIAL_TOKEN_GRANT - _read_ai_tokens_used(item))


def profile_to_api(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "userId": item["userId"],
        "createdAt": item["createdAt"],
        "lastLoginAt": item["lastLoginAt"],
        "aiTokenBalance": _read_ai_token_balance(item),
        "aiTokensUsed": _read_ai_tokens_used(item),
    }


def _profile_to_api(item: dict[str, Any]) -> dict[str, Any]:
    return profile_to_api(item)


def _load_profile_item(user_id: str) -> dict[str, Any] | None:
    table = get_table()
    response = table.get_item(
        Key={
            "PK": user_pk(user_id),
            "SK": profile_sk(),
        }
    )
    item = response.get("Item")
    if not item:
        return None
    return ensure_profile_token_fields(user_id, item)


def get_user(user_id: str) -> dict[str, Any] | None:
    item = _load_profile_item(user_id)
    if not item:
        return None
    return _profile_to_api(item)


def login_existing_user(user_id: str) -> dict[str, Any]:
    table = get_table()
    pk = user_pk(user_id)
    sk = profile_sk()
    now = now_iso()

    response = table.get_item(Key={"PK": pk, "SK": sk})
    existing = response.get("Item")
    if not existing:
        raise UserNotFoundError(f"User not found: {user_id}")

    existing = ensure_profile_token_fields(user_id, existing)
    table.update_item(
        Key={"PK": pk, "SK": sk},
        UpdateExpression="SET lastLoginAt = :lastLoginAt",
        ExpressionAttributeValues={":lastLoginAt": now},
    )
    return _profile_to_api({**existing, "lastLoginAt": now})
