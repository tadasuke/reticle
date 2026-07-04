from __future__ import annotations

from typing import Any

from .repository import (
    ConversationNotFoundError,
    create_conversation,
    get_conversation,
    list_conversations,
    save_messages,
    update_conversation,
)


def list_user_conversations(user_id: str) -> dict[str, Any]:
    return {"conversations": list_conversations(user_id)}


def create_user_conversation(
    user_id: str,
    *,
    scenario_id: str,
    friend_type_id: str,
    buddy_type_id: str,
    support_type: str,
) -> dict[str, Any]:
    return create_conversation(
        user_id,
        scenario_id=scenario_id,
        friend_type_id=friend_type_id,
        buddy_type_id=buddy_type_id,
        support_type=support_type,
    )


def get_user_conversation(user_id: str, conversation_id: str) -> dict[str, Any]:
    return get_conversation(user_id, conversation_id)


def put_user_conversation_messages(
    user_id: str,
    conversation_id: str,
    messages: list[dict[str, Any]],
) -> dict[str, Any]:
    return save_messages(user_id, conversation_id, messages)


def patch_user_conversation(
    user_id: str,
    conversation_id: str,
    *,
    support_type: str | None = None,
    buddy_type_id: str | None = None,
) -> dict[str, Any]:
    return update_conversation(
        user_id,
        conversation_id,
        support_type=support_type,
        buddy_type_id=buddy_type_id,
    )


__all__ = [
    "ConversationNotFoundError",
    "create_user_conversation",
    "get_user_conversation",
    "list_user_conversations",
    "patch_user_conversation",
    "put_user_conversation_messages",
]
