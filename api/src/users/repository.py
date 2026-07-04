from __future__ import annotations

from typing import Any

from botocore.exceptions import ClientError

from src.db.client import get_table
from src.db.keys import profile_sk, user_pk

from .validation import now_iso


def _profile_to_api(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "userId": item["userId"],
        "createdAt": item["createdAt"],
        "lastLoginAt": item["lastLoginAt"],
    }


def get_user(user_id: str) -> dict[str, Any] | None:
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
    return _profile_to_api(item)


def login_or_create_user(user_id: str) -> tuple[dict[str, Any], bool]:
    table = get_table()
    pk = user_pk(user_id)
    sk = profile_sk()
    now = now_iso()

    try:
        response = table.get_item(Key={"PK": pk, "SK": sk})
        existing = response.get("Item")
        if existing:
            table.update_item(
                Key={"PK": pk, "SK": sk},
                UpdateExpression="SET lastLoginAt = :lastLoginAt",
                ExpressionAttributeValues={":lastLoginAt": now},
            )
            user = _profile_to_api({**existing, "lastLoginAt": now})
            return user, False

        item = {
            "PK": pk,
            "SK": sk,
            "entityType": "USER",
            "userId": user_id,
            "createdAt": now,
            "lastLoginAt": now,
        }
        table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(PK)",
        )
        return _profile_to_api(item), True
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            existing = get_user(user_id)
            if existing:
                table.update_item(
                    Key={"PK": pk, "SK": sk},
                    UpdateExpression="SET lastLoginAt = :lastLoginAt",
                    ExpressionAttributeValues={":lastLoginAt": now},
                )
                return {**existing, "lastLoginAt": now}, False
        raise
