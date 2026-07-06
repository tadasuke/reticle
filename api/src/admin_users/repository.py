from __future__ import annotations

from typing import Any

from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError

from src.db.client import get_table
from src.db.keys import conversation_sk, profile_sk, user_pk
from src.token_ledger.repository import ensure_profile_token_fields, grant_new_user_tokens, grant_tokens
from src.users.repository import get_user, profile_to_api
from src.users.validation import validate_user_id


class UserNotFoundError(ValueError):
    pass


class UserAlreadyExistsError(ValueError):
    pass


class InvalidTokenAmountError(ValueError):
    pass


def list_all_profiles() -> list[dict[str, Any]]:
    table = get_table()
    items: list[dict[str, Any]] = []
    scan_kwargs: dict[str, Any] = {
        "FilterExpression": Attr("SK").eq(profile_sk()),
    }
    while True:
        response = table.scan(**scan_kwargs)
        items.extend(response.get("Items", []))
        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        scan_kwargs["ExclusiveStartKey"] = last_key

    profiles: list[dict[str, Any]] = []
    for item in items:
        user_id = str(item["userId"])
        normalized = ensure_profile_token_fields(user_id, item)
        profiles.append(profile_to_api(normalized))

    profiles.sort(key=lambda profile: profile.get("lastLoginAt", ""), reverse=True)
    return profiles


def count_conversations(user_id: str) -> int:
    table = get_table()
    total = 0
    query_kwargs: dict[str, Any] = {
        "KeyConditionExpression": Key("PK").eq(user_pk(user_id)) & Key("SK").begins_with("CONV#"),
        "Select": "COUNT",
    }
    while True:
        response = table.query(**query_kwargs)
        total += int(response.get("Count", 0))
        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        query_kwargs["ExclusiveStartKey"] = last_key
    return total


def get_admin_user_detail(user_id: str) -> dict[str, Any] | None:
    user = get_user(user_id)
    if not user:
        return None
    return {
        **user,
        "conversationCount": count_conversations(user_id),
    }


def create_admin_user(user_id: str, initial_tokens: int) -> dict[str, Any]:
    normalized = validate_user_id(user_id)
    if initial_tokens < 0:
        raise InvalidTokenAmountError("initialTokens must be zero or positive")

    if get_user(normalized):
        raise UserAlreadyExistsError(f"User already exists: {normalized}")

    try:
        grant_new_user_tokens(
            normalized,
            initial_tokens,
            request_kind="admin_signup",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "TransactionCanceledException":
            raise UserAlreadyExistsError(f"User already exists: {normalized}") from exc
        raise

    detail = get_admin_user_detail(normalized)
    if not detail:
        raise UserNotFoundError(f"User not found: {normalized}")
    return detail


def grant_admin_user_tokens(user_id: str, tokens: int) -> dict[str, Any]:
    normalized = validate_user_id(user_id)
    if tokens < 1:
        raise InvalidTokenAmountError("tokens must be at least 1")

    if not get_user(normalized):
        raise UserNotFoundError(f"User not found: {normalized}")

    grant_tokens(normalized, tokens, request_kind="admin_grant")

    detail = get_admin_user_detail(normalized)
    if not detail:
        raise UserNotFoundError(f"User not found: {normalized}")
    return detail


def delete_admin_user(user_id: str) -> None:
    normalized = validate_user_id(user_id)
    table = get_table()
    pk = user_pk(normalized)
    items: list[dict[str, Any]] = []
    query_kwargs: dict[str, Any] = {
        "KeyConditionExpression": Key("PK").eq(pk),
    }
    while True:
        response = table.query(**query_kwargs)
        items.extend(response.get("Items", []))
        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        query_kwargs["ExclusiveStartKey"] = last_key

    if not items:
        raise UserNotFoundError(f"User not found: {normalized}")

    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
