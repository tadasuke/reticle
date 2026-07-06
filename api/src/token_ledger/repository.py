from __future__ import annotations

import base64
import json
import uuid
from decimal import Decimal
from typing import Any

from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from src.db.client import get_dynamodb_resource, get_table, get_table_name
from src.db.keys import ledger_idempotency_sk, ledger_sk, profile_sk, user_pk
from src.users.validation import now_iso

from .constants import INITIAL_TOKEN_GRANT


class InsufficientTokenBalanceError(Exception):
    pass


class DuplicateIdempotencyKeyError(Exception):
    pass


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


def _read_balance(item: dict[str, Any]) -> int:
    if "aiTokenBalance" in item:
        return int(item["aiTokenBalance"])
    used = int(item.get("aiTokensUsed", item.get("aiCreditsUsed", 0)))
    return max(0, INITIAL_TOKEN_GRANT - used)


def _read_tokens_used(item: dict[str, Any]) -> int:
    if "aiTokensUsed" in item:
        return int(item["aiTokensUsed"])
    return int(item.get("aiCreditsUsed", 0))


def _read_tokens_granted(item: dict[str, Any]) -> int:
    if "aiTokensGrantedLifetime" in item:
        return int(item["aiTokensGrantedLifetime"])
    if "aiTokenBalance" in item:
        return int(item["aiTokenBalance"]) + _read_tokens_used(item)
    return INITIAL_TOKEN_GRANT


def _encode_cursor(last_evaluated_key: dict[str, Any] | None) -> str | None:
    if not last_evaluated_key:
        return None
    return base64.urlsafe_b64encode(json.dumps(last_evaluated_key).encode("utf-8")).decode("ascii")


def _decode_cursor(cursor: str | None) -> dict[str, Any] | None:
    if not cursor:
        return None
    try:
        return json.loads(base64.urlsafe_b64decode(cursor.encode("ascii")).decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as exc:
        raise ValueError("Invalid cursor") from exc


def _ledger_entry_to_api(item: dict[str, Any]) -> dict[str, Any]:
    entry = {
        "eventId": item.get("eventId", ""),
        "type": item.get("type", ""),
        "tokens": int(item.get("tokens", 0)),
        "balanceAfter": int(item.get("balanceAfter", 0)),
        "occurredAt": item.get("occurredAt", ""),
    }
    if item.get("source"):
        entry["source"] = _to_json_value(item["source"])
    if item.get("usage"):
        entry["usage"] = _to_json_value(item["usage"])
    return entry


def ensure_profile_token_fields(user_id: str, item: dict[str, Any]) -> dict[str, Any]:
    if "aiTokenBalance" in item:
        return item

    balance = max(0, INITIAL_TOKEN_GRANT - _read_tokens_used(item))
    table = get_table()
    table.update_item(
        Key={"PK": user_pk(user_id), "SK": profile_sk()},
        UpdateExpression=(
            "SET aiTokenBalance = :balance, aiTokensGrantedLifetime = :granted "
            "REMOVE aiCreditsUsed"
        ),
        ExpressionAttributeValues={
            ":balance": balance,
            ":granted": INITIAL_TOKEN_GRANT,
        },
    )
    return {
        **item,
        "aiTokenBalance": balance,
        "aiTokensGrantedLifetime": INITIAL_TOKEN_GRANT,
    }


def get_profile_balance(user_id: str) -> int | None:
    table = get_table()
    response = table.get_item(Key={"PK": user_pk(user_id), "SK": profile_sk()})
    item = response.get("Item")
    if not item:
        return None
    item = ensure_profile_token_fields(user_id, item)
    return _read_balance(item)


def require_positive_balance(user_id: str) -> None:
    balance = get_profile_balance(user_id)
    if balance is None:
        raise InsufficientTokenBalanceError("User not found")
    if balance <= 0:
        raise InsufficientTokenBalanceError("AIトークンの残高がありません。")


def grant_signup_tokens(user_id: str, *, occurred_at: str | None = None) -> None:
    grant_new_user_tokens(
        user_id,
        INITIAL_TOKEN_GRANT,
        request_kind="signup_grant",
        occurred_at=occurred_at,
    )


def grant_new_user_tokens(
    user_id: str,
    amount: int,
    *,
    request_kind: str,
    occurred_at: str | None = None,
) -> None:
    if amount < 0:
        raise ValueError("Token amount must be zero or positive")

    now = occurred_at or now_iso()
    event_id = str(uuid.uuid4())
    pk = user_pk(user_id)
    sk_profile = profile_sk()

    profile_item = {
        "PK": pk,
        "SK": sk_profile,
        "entityType": "USER",
        "userId": user_id,
        "createdAt": now,
        "lastLoginAt": now,
        "aiTokenBalance": amount,
        "aiTokensUsed": 0,
        "aiTokensGrantedLifetime": amount,
    }

    transact_items: list[dict[str, Any]] = [
        {
            "Put": {
                "TableName": get_table_name(),
                "Item": profile_item,
                "ConditionExpression": "attribute_not_exists(PK)",
            }
        }
    ]

    if amount > 0:
        transact_items.append(
            {
                "Put": {
                    "TableName": get_table_name(),
                    "Item": {
                        "PK": pk,
                        "SK": ledger_sk(now, event_id),
                        "entityType": "TOKEN_LEDGER",
                        "eventId": event_id,
                        "type": "grant",
                        "tokens": amount,
                        "balanceAfter": amount,
                        "occurredAt": now,
                        "source": {"requestKind": request_kind},
                    },
                }
            }
        )

    client = get_dynamodb_resource().meta.client
    client.transact_write_items(TransactItems=transact_items)


def grant_tokens(
    user_id: str,
    amount: int,
    *,
    request_kind: str,
    occurred_at: str | None = None,
) -> int:
    if amount <= 0:
        raise ValueError("Token amount must be positive")

    table = get_table()
    pk = user_pk(user_id)
    sk_profile = profile_sk()

    response = table.get_item(Key={"PK": pk, "SK": sk_profile})
    item = response.get("Item")
    if not item:
        raise ValueError(f"User not found: {user_id}")

    item = ensure_profile_token_fields(user_id, item)
    current_balance = _read_balance(item)
    current_granted = _read_tokens_granted(item)
    new_balance = current_balance + amount
    new_granted = current_granted + amount

    now = occurred_at or now_iso()
    event_id = str(uuid.uuid4())

    ledger_item = {
        "PK": pk,
        "SK": ledger_sk(now, event_id),
        "entityType": "TOKEN_LEDGER",
        "eventId": event_id,
        "type": "grant",
        "tokens": amount,
        "balanceAfter": new_balance,
        "occurredAt": now,
        "source": {"requestKind": request_kind},
    }

    client = get_dynamodb_resource().meta.client
    client.transact_write_items(
        TransactItems=[
            {
                "Put": {
                    "TableName": get_table_name(),
                    "Item": ledger_item,
                }
            },
            {
                "Update": {
                    "TableName": get_table_name(),
                    "Key": {"PK": pk, "SK": sk_profile},
                    "UpdateExpression": (
                        "SET aiTokenBalance = :balance, aiTokensGrantedLifetime = :granted "
                        "REMOVE aiCreditsUsed"
                    ),
                    "ExpressionAttributeValues": {
                        ":balance": new_balance,
                        ":granted": new_granted,
                    },
                    "ConditionExpression": "attribute_exists(PK)",
                }
            },
        ]
    )
    return new_balance


def consume_tokens(
    user_id: str,
    amount: int,
    *,
    idempotency_key: str,
    usage: dict[str, Any] | None = None,
    source: dict[str, Any] | None = None,
) -> int | None:
    if amount <= 0:
        return get_profile_balance(user_id)

    table = get_table()
    pk = user_pk(user_id)
    sk_profile = profile_sk()

    response = table.get_item(Key={"PK": pk, "SK": sk_profile})
    item = response.get("Item")
    if not item:
        return None

    item = ensure_profile_token_fields(user_id, item)
    current_balance = _read_balance(item)
    current_used = _read_tokens_used(item)
    new_balance = current_balance - amount
    new_used = current_used + amount

    now = now_iso()
    event_id = str(uuid.uuid4())
    sk_idem = ledger_idempotency_sk(idempotency_key)
    sk_ledger = ledger_sk(now, event_id)

    ledger_item: dict[str, Any] = {
        "PK": pk,
        "SK": sk_ledger,
        "entityType": "TOKEN_LEDGER",
        "eventId": event_id,
        "type": "consume",
        "tokens": amount,
        "balanceAfter": new_balance,
        "occurredAt": now,
        "idempotencyKey": idempotency_key,
    }
    if source:
        ledger_item["source"] = source
    if usage:
        ledger_item["usage"] = usage

    idem_item = {
        "PK": pk,
        "SK": sk_idem,
        "entityType": "TOKEN_LEDGER_IDEM",
        "idempotencyKey": idempotency_key,
        "ledgerSk": sk_ledger,
        "occurredAt": now,
    }

    client = get_dynamodb_resource().meta.client
    try:
        client.transact_write_items(
            TransactItems=[
                {
                    "Put": {
                        "TableName": get_table_name(),
                        "Item": idem_item,
                        "ConditionExpression": "attribute_not_exists(PK)",
                    }
                },
                {
                    "Put": {
                        "TableName": get_table_name(),
                        "Item": ledger_item,
                    }
                },
                {
                    "Update": {
                        "TableName": get_table_name(),
                        "Key": {"PK": pk, "SK": sk_profile},
                        "UpdateExpression": (
                            "SET aiTokenBalance = :balance, aiTokensUsed = :used "
                            "REMOVE aiCreditsUsed"
                        ),
                        "ExpressionAttributeValues": {
                            ":balance": new_balance,
                            ":used": new_used,
                        },
                        "ConditionExpression": "attribute_exists(PK)",
                    }
                },
            ]
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "TransactionCanceledException":
            reasons = exc.response.get("CancellationReasons", [])
            if reasons and reasons[0].get("Code") == "ConditionalCheckFailed":
                existing = table.get_item(Key={"PK": pk, "SK": sk_idem}).get("Item")
                if existing:
                    return _read_balance(
                        table.get_item(Key={"PK": pk, "SK": sk_profile}).get("Item") or {}
                    )
                raise DuplicateIdempotencyKeyError(idempotency_key) from exc
        raise

    return new_balance


def list_ledger_entries(
    user_id: str,
    *,
    limit: int = 50,
    cursor: str | None = None,
) -> dict[str, Any]:
    bounded_limit = max(1, min(limit, 100))
    table = get_table()
    query_kwargs: dict[str, Any] = {
        "KeyConditionExpression": Key("PK").eq(user_pk(user_id))
        & Key("SK").begins_with("LEDGER#"),
        "ScanIndexForward": False,
        "Limit": bounded_limit,
    }
    exclusive_start_key = _decode_cursor(cursor)
    if exclusive_start_key:
        query_kwargs["ExclusiveStartKey"] = exclusive_start_key

    response = table.query(**query_kwargs)
    items = [
        _ledger_entry_to_api(item)
        for item in response.get("Items", [])
        if str(item.get("SK", "")).startswith("LEDGER#")
        and not str(item.get("SK", "")).startswith("LEDGER#IDEM#")
    ]
    return {
        "entries": items,
        "nextCursor": _encode_cursor(response.get("LastEvaluatedKey")),
    }
