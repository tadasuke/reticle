from __future__ import annotations

import os
import unittest

import boto3
from moto import mock_aws

from src.db.keys import profile_sk, user_pk
from src.token_ledger.constants import INITIAL_TOKEN_GRANT
from src.token_ledger.repository import (
    InsufficientTokenBalanceError,
    consume_tokens,
    ensure_profile_token_fields,
    get_profile_balance,
    grant_signup_tokens,
    list_ledger_entries,
    require_positive_balance,
)
from src.users.repository import UserNotFoundError, get_user, login_existing_user


TABLE_NAME = "buddy-talk-test"


def _create_table() -> None:
    client = boto3.client("dynamodb", region_name="ap-northeast-1")
    client.create_table(
        TableName=TABLE_NAME,
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )


@mock_aws
class TokenLedgerRepositoryTests(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["DYNAMODB_TABLE_NAME"] = TABLE_NAME
        os.environ.pop("DYNAMODB_ENDPOINT", None)
        os.environ["AWS_ACCESS_KEY_ID"] = "testing"
        os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
        os.environ["AWS_REGION"] = "ap-northeast-1"
        _create_table()

    def test_signup_grants_one_million_tokens(self) -> None:
        grant_signup_tokens("user-new")

        user = get_user("user-new")
        assert user is not None
        self.assertEqual(user["aiTokenBalance"], INITIAL_TOKEN_GRANT)
        self.assertEqual(user["aiTokensUsed"], 0)

        ledger = list_ledger_entries("user-new")
        self.assertEqual(len(ledger["entries"]), 1)
        self.assertEqual(ledger["entries"][0]["type"], "grant")
        self.assertEqual(ledger["entries"][0]["tokens"], INITIAL_TOKEN_GRANT)

    def test_consume_tokens_updates_balance_and_ledger(self) -> None:
        grant_signup_tokens("user-consume")
        balance = consume_tokens(
            "user-consume",
            250,
            idempotency_key="idem-1",
            usage={"input_tokens": 200, "output_tokens": 50},
            source={"requestKind": "friend_reply"},
        )
        self.assertEqual(balance, INITIAL_TOKEN_GRANT - 250)

        user = get_user("user-consume")
        assert user is not None
        self.assertEqual(user["aiTokenBalance"], INITIAL_TOKEN_GRANT - 250)
        self.assertEqual(user["aiTokensUsed"], 250)

        ledger = list_ledger_entries("user-consume")
        consume_entries = [entry for entry in ledger["entries"] if entry["type"] == "consume"]
        self.assertEqual(len(consume_entries), 1)
        self.assertEqual(consume_entries[0]["tokens"], 250)

    def test_idempotency_prevents_double_consume(self) -> None:
        grant_signup_tokens("user-idem")
        first = consume_tokens("user-idem", 100, idempotency_key="same-key")
        second = consume_tokens("user-idem", 100, idempotency_key="same-key")
        self.assertEqual(first, INITIAL_TOKEN_GRANT - 100)
        self.assertEqual(second, INITIAL_TOKEN_GRANT - 100)

        user = get_user("user-idem")
        assert user is not None
        self.assertEqual(user["aiTokensUsed"], 100)

    def test_require_positive_balance_blocks_zero(self) -> None:
        grant_signup_tokens("user-zero")
        table = boto3.resource("dynamodb", region_name="ap-northeast-1").Table(TABLE_NAME)
        table.update_item(
            Key={"PK": user_pk("user-zero"), "SK": profile_sk()},
            UpdateExpression="SET aiTokenBalance = :zero",
            ExpressionAttributeValues={":zero": 0},
        )

        with self.assertRaises(InsufficientTokenBalanceError):
            require_positive_balance("user-zero")

    def test_lazy_migration_sets_balance_from_used(self) -> None:
        table = boto3.resource("dynamodb", region_name="ap-northeast-1").Table(TABLE_NAME)
        table.put_item(
            Item={
                "PK": user_pk("legacy-user"),
                "SK": profile_sk(),
                "entityType": "USER",
                "userId": "legacy-user",
                "createdAt": "2026-01-01T00:00:00Z",
                "lastLoginAt": "2026-01-01T00:00:00Z",
                "aiTokensUsed": 5000,
            }
        )

        balance = get_profile_balance("legacy-user")
        self.assertEqual(balance, INITIAL_TOKEN_GRANT - 5000)

        user = get_user("legacy-user")
        assert user is not None
        self.assertEqual(user["aiTokenBalance"], INITIAL_TOKEN_GRANT - 5000)

    def test_login_existing_user_rejects_unknown_user(self) -> None:
        with self.assertRaises(UserNotFoundError):
            login_existing_user("unknown-user")


if __name__ == "__main__":
    unittest.main()
