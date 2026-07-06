from __future__ import annotations

USER_PK_PREFIX = "USER#"
CONV_SK_PREFIX = "CONV#"
LEDGER_SK_PREFIX = "LEDGER#"
LEDGER_IDEM_SK_PREFIX = "LEDGER#IDEM#"
PROFILE_SK = "PROFILE"


def user_pk(user_id: str) -> str:
    return f"{USER_PK_PREFIX}{user_id}"


def profile_sk() -> str:
    return PROFILE_SK


def conversation_sk(conversation_id: str) -> str:
    return f"{CONV_SK_PREFIX}{conversation_id}"


def ledger_sk(occurred_at: str, event_id: str) -> str:
    return f"{LEDGER_SK_PREFIX}{occurred_at}#{event_id}"


def ledger_idempotency_sk(idempotency_key: str) -> str:
    return f"{LEDGER_IDEM_SK_PREFIX}{idempotency_key}"
