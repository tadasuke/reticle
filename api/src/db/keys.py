from __future__ import annotations

USER_PK_PREFIX = "USER#"
CONV_SK_PREFIX = "CONV#"
PROFILE_SK = "PROFILE"


def user_pk(user_id: str) -> str:
    return f"{USER_PK_PREFIX}{user_id}"


def profile_sk() -> str:
    return PROFILE_SK


def conversation_sk(conversation_id: str) -> str:
    return f"{CONV_SK_PREFIX}{conversation_id}"
