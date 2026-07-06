from __future__ import annotations

from typing import Any

from .repository import (
    DuplicateIdempotencyKeyError,
    InsufficientTokenBalanceError,
    consume_tokens,
    get_profile_balance,
    grant_signup_tokens,
    list_ledger_entries,
    require_positive_balance,
)

__all__ = [
    "DuplicateIdempotencyKeyError",
    "InsufficientTokenBalanceError",
    "consume_user_tokens",
    "get_user_token_balance",
    "grant_signup_tokens",
    "list_user_token_ledger",
    "require_positive_token_balance",
]


def require_positive_token_balance(*, user_id: str) -> None:
    require_positive_balance(user_id)


def get_user_token_balance(*, user_id: str) -> int | None:
    return get_profile_balance(user_id)


def consume_user_tokens(
    *,
    user_id: str,
    amount: int,
    idempotency_key: str,
    usage: dict[str, Any] | None = None,
    source: dict[str, Any] | None = None,
) -> int | None:
    return consume_tokens(
        user_id,
        amount,
        idempotency_key=idempotency_key,
        usage=usage,
        source=source,
    )


def list_user_token_ledger(
    *,
    user_id: str,
    limit: int = 50,
    cursor: str | None = None,
) -> dict[str, Any]:
    return list_ledger_entries(user_id, limit=limit, cursor=cursor)
