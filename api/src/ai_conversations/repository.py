from __future__ import annotations

from decimal import Decimal
from typing import Any

from boto3.dynamodb.conditions import Key

from src.db.client import get_table
from src.db.keys import conversation_sk, user_pk

from .specs import ID_PREFIX, ID_WIDTH, SCENARIO_IDS, SUPPORT_TYPES, validate_conversation_id
from src.character_types import get_buddy_type
from src.users.validation import now_iso


class ConversationNotFoundError(ValueError):
    pass


def _strip_usage(message: dict[str, Any]) -> dict[str, Any]:
    cleaned = {key: value for key, value in message.items() if key != "usage"}
    return cleaned


def _sanitize_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [_strip_usage(message) for message in messages]


def _to_json_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        if value % 1 == 0:
            return int(value)
        return float(value)
    if isinstance(value, list):
        return [_to_json_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _to_json_value(item) for key, item in value.items()}
    return value


def _item_to_list_entry(item: dict[str, Any]) -> dict[str, Any]:
    messages = item.get("messages") or []
    last_message_preview = ""
    if messages:
        last_message_preview = str(messages[-1].get("content", ""))[:120]

    return {
        "conversationId": item["conversationId"],
        "scenarioId": item["scenarioId"],
        "friendTypeId": item["friendTypeId"],
        "buddyTypeId": item["buddyTypeId"],
        "supportType": item["supportType"],
        "createdAt": item["createdAt"],
        "updatedAt": item["updatedAt"],
        "lastInteractionAt": item["lastInteractionAt"],
        "lastMessagePreview": last_message_preview,
    }


def _item_to_detail(item: dict[str, Any]) -> dict[str, Any]:
    messages = _to_json_value(item.get("messages") or [])
    return {
        **_item_to_list_entry(item),
        "messages": messages,
    }


def _next_conversation_id(user_id: str) -> str:
    table = get_table()
    response = table.query(
        KeyConditionExpression=Key("PK").eq(user_pk(user_id)) & Key("SK").begins_with("CONV#"),
        ProjectionExpression="conversationId",
    )
    max_num = 0
    for item in response.get("Items", []):
        conversation_id = str(item.get("conversationId", ""))
        if conversation_id.startswith(ID_PREFIX):
            suffix = conversation_id[len(ID_PREFIX) :]
            if suffix.isdigit():
                max_num = max(max_num, int(suffix))
    return f"{ID_PREFIX}{max_num + 1:0{ID_WIDTH}d}"


def _get_conversation_item(user_id: str, conversation_id: str) -> dict[str, Any]:
    validate_conversation_id(conversation_id)
    table = get_table()
    response = table.get_item(
        Key={
            "PK": user_pk(user_id),
            "SK": conversation_sk(conversation_id),
        }
    )
    item = response.get("Item")
    if not item:
        raise ConversationNotFoundError(f"Conversation not found: {conversation_id}")
    return item


def list_conversations(user_id: str) -> list[dict[str, Any]]:
    table = get_table()
    response = table.query(
        KeyConditionExpression=Key("PK").eq(user_pk(user_id)) & Key("SK").begins_with("CONV#"),
    )
    items = [_item_to_list_entry(item) for item in response.get("Items", [])]
    items.sort(key=lambda item: item.get("lastInteractionAt", ""), reverse=True)
    return items


def create_conversation(
    user_id: str,
    *,
    scenario_id: str,
    friend_type_id: str,
    buddy_type_id: str,
    support_type: str,
) -> dict[str, Any]:
    if scenario_id not in SCENARIO_IDS:
        raise ValueError(f"Unknown scenarioId: {scenario_id}")
    if support_type not in SUPPORT_TYPES:
        raise ValueError(f"Unknown supportType: {support_type}")
    if not friend_type_id.strip() or not buddy_type_id.strip():
        raise ValueError("friendTypeId and buddyTypeId are required")

    conversation_id = _next_conversation_id(user_id)
    now = now_iso()
    item = {
        "PK": user_pk(user_id),
        "SK": conversation_sk(conversation_id),
        "entityType": "AI_CONVERSATION",
        "conversationId": conversation_id,
        "scenarioId": scenario_id,
        "friendTypeId": friend_type_id.strip(),
        "buddyTypeId": buddy_type_id.strip(),
        "supportType": support_type,
        "createdAt": now,
        "updatedAt": now,
        "lastInteractionAt": now,
        "messages": [],
    }
    get_table().put_item(Item=item)
    return _item_to_detail(item)


def get_conversation(user_id: str, conversation_id: str) -> dict[str, Any]:
    item = _get_conversation_item(user_id, conversation_id)
    return _item_to_detail(item)


def save_messages(user_id: str, conversation_id: str, messages: list[dict[str, Any]]) -> dict[str, Any]:
    item = _get_conversation_item(user_id, conversation_id)
    now = now_iso()
    sanitized = _sanitize_messages(messages)
    table = get_table()
    table.update_item(
        Key={
            "PK": user_pk(user_id),
            "SK": conversation_sk(conversation_id),
        },
        UpdateExpression="SET messages = :messages, updatedAt = :updatedAt, lastInteractionAt = :lastInteractionAt",
        ExpressionAttributeValues={
            ":messages": sanitized,
            ":updatedAt": now,
            ":lastInteractionAt": now,
        },
    )
    return _item_to_detail({**item, "messages": sanitized, "updatedAt": now, "lastInteractionAt": now})


def update_conversation(
    user_id: str,
    conversation_id: str,
    *,
    support_type: str | None = None,
    buddy_type_id: str | None = None,
) -> dict[str, Any]:
    item = _get_conversation_item(user_id, conversation_id)
    updates: list[str] = []
    values: dict[str, Any] = {}

    if support_type is not None:
        if support_type not in SUPPORT_TYPES:
            raise ValueError(f"Unknown supportType: {support_type}")
        updates.append("supportType = :supportType")
        values[":supportType"] = support_type
        item = {**item, "supportType": support_type}

    if buddy_type_id is not None:
        normalized = buddy_type_id.strip()
        if not normalized:
            raise ValueError("buddyTypeId must not be empty")
        get_buddy_type(normalized)
        updates.append("buddyTypeId = :buddyTypeId")
        values[":buddyTypeId"] = normalized
        item = {**item, "buddyTypeId": normalized}

    if updates:
        now = now_iso()
        updates.append("updatedAt = :updatedAt")
        values[":updatedAt"] = now
        item = {**item, "updatedAt": now}
        get_table().update_item(
            Key={
                "PK": user_pk(user_id),
                "SK": conversation_sk(conversation_id),
            },
            UpdateExpression=f"SET {', '.join(updates)}",
            ExpressionAttributeValues=values,
        )

    return _item_to_detail(item)
