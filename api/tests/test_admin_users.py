from __future__ import annotations

import os
import unittest

import boto3
from moto import mock_aws

from src.admin_users.handler import (
    InvalidTokenAmountError,
    UserAlreadyExistsError,
    UserNotFoundError,
    create_user,
    delete_user,
    get_user_detail,
    grant_user_tokens,
    list_users,
)
from src.db.keys import conversation_sk, user_pk
from src.db.client import get_table
from src.token_ledger.repository import list_ledger_entries
from src.users.handler import UserNotFoundError as LoginUserNotFoundError, login_user
from src.users.repository import get_user


TABLE_NAME = "buddy-talk-admin-users-test"


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
class AdminUsersHandlerTests(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["DYNAMODB_TABLE_NAME"] = TABLE_NAME
        os.environ.pop("DYNAMODB_ENDPOINT", None)
        os.environ["AWS_ACCESS_KEY_ID"] = "testing"
        os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
        os.environ["AWS_REGION"] = "ap-northeast-1"
        _create_table()

    def test_create_user_and_list(self) -> None:
        create_user(user_id="alpha", initial_tokens=1000)
        create_user(user_id="beta", initial_tokens=0)

        result = list_users()
        user_ids = {user["userId"] for user in result["users"]}
        self.assertEqual(user_ids, {"alpha", "beta"})

        alpha = get_user_detail("alpha")["user"]
        self.assertEqual(alpha["aiTokenBalance"], 1000)
        self.assertEqual(alpha["conversationCount"], 0)

    def test_create_duplicate_user_raises(self) -> None:
        create_user(user_id="dup-user", initial_tokens=100)
        with self.assertRaises(UserAlreadyExistsError):
            create_user(user_id="dup-user", initial_tokens=200)

    def test_grant_user_tokens_updates_balance_and_ledger(self) -> None:
        create_user(user_id="grant-user", initial_tokens=100)
        result = grant_user_tokens(user_id="grant-user", tokens=250)
        user = result["user"]
        self.assertEqual(user["aiTokenBalance"], 350)

        ledger = list_ledger_entries("grant-user")
        grant_kinds = {
            entry["source"]["requestKind"]
            for entry in ledger["entries"]
            if entry["type"] == "grant"
        }
        self.assertEqual(grant_kinds, {"admin_signup", "admin_grant"})

    def test_grant_invalid_amount_raises(self) -> None:
        create_user(user_id="invalid-grant", initial_tokens=0)
        with self.assertRaises(InvalidTokenAmountError):
            grant_user_tokens(user_id="invalid-grant", tokens=0)

    def test_delete_user_removes_all_items(self) -> None:
        create_user(user_id="delete-user", initial_tokens=500)
        table = get_table()
        now = "2026-07-04T00:00:00+00:00"
        table.put_item(
            Item={
                "PK": user_pk("delete-user"),
                "SK": conversation_sk("conv-0001"),
                "entityType": "AI_CONVERSATION",
                "conversationId": "conv-0001",
                "scenarioId": "sns",
                "friendTypeId": "friend-0001",
                "buddyTypeId": "coach",
                "supportType": "middle",
                "threadIndex": 1,
                "threadLabel": "test",
                "createdAt": now,
                "updatedAt": now,
                "lastInteractionAt": now,
                "messages": [],
            }
        )

        delete_user("delete-user")

        with self.assertRaises(UserNotFoundError):
            get_user_detail("delete-user")
        self.assertIsNone(get_user("delete-user"))

    def test_get_user_detail_not_found(self) -> None:
        with self.assertRaises(UserNotFoundError):
            get_user_detail("missing-user")


@mock_aws
class UserLoginTests(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["DYNAMODB_TABLE_NAME"] = TABLE_NAME
        os.environ.pop("DYNAMODB_ENDPOINT", None)
        os.environ["AWS_ACCESS_KEY_ID"] = "testing"
        os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
        os.environ["AWS_REGION"] = "ap-northeast-1"
        _create_table()

    def test_login_requires_admin_created_user(self) -> None:
        with self.assertRaises(LoginUserNotFoundError):
            login_user(user_id="unknown-user")

        create_user(user_id="known-user", initial_tokens=100)
        result = login_user(user_id="known-user")
        self.assertEqual(result["user"]["userId"], "known-user")


if __name__ == "__main__":
    unittest.main()
