#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from boto3.dynamodb.conditions import Attr
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "api"
sys.path.insert(0, str(API_DIR))

DEFAULT_ENDPOINT = "http://localhost:8001"
DEFAULT_TABLE_NAME = "buddy-talk"
DEFAULT_REGION = "ap-northeast-1"


def configure_dynamodb_env() -> str:
    load_dotenv(API_DIR / ".env")

    endpoint = os.environ.get("DYNAMODB_ENDPOINT", DEFAULT_ENDPOINT)
    os.environ.setdefault("DYNAMODB_ENDPOINT", endpoint)
    os.environ.setdefault("DYNAMODB_TABLE_NAME", DEFAULT_TABLE_NAME)
    os.environ.setdefault("AWS_REGION", DEFAULT_REGION)

    if os.environ.get("DYNAMODB_ENDPOINT"):
        os.environ.setdefault("AWS_ACCESS_KEY_ID", "local")
        os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "local")

    return os.environ["DYNAMODB_ENDPOINT"]


def collect_user_items() -> list[dict]:
    from src.db.client import get_table
    from src.db.keys import USER_PK_PREFIX

    table = get_table()
    items: list[dict] = []
    scan_kwargs = {
        "FilterExpression": Attr("PK").begins_with(USER_PK_PREFIX),
    }
    while True:
        response = table.scan(**scan_kwargs)
        items.extend(response.get("Items", []))
        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        scan_kwargs["ExclusiveStartKey"] = last_key
    return items


def delete_user_items(items: list[dict]) -> int:
    from src.db.client import get_table

    table = get_table()
    deleted = 0
    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
            deleted += 1
    return deleted


def main() -> int:
    parser = argparse.ArgumentParser(description="Delete all DynamoDB user data (USER#* items).")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show how many items would be deleted without deleting.",
    )
    args = parser.parse_args()

    endpoint = configure_dynamodb_env()
    table_name = os.environ.get("DYNAMODB_TABLE_NAME", DEFAULT_TABLE_NAME)
    print(f"Target: {table_name} @ {endpoint}")

    items = collect_user_items()
    user_ids = sorted({str(item.get("userId", "")) for item in items if item.get("SK") == "PROFILE"})
    print(f"Found {len(items)} items across {len(user_ids)} user profiles.")

    if args.dry_run:
        if user_ids:
            print("User IDs:", ", ".join(user_ids))
        return 0

    if not items:
        print("Nothing to delete.")
        return 0

    deleted = delete_user_items(items)
    print(f"Deleted {deleted} items.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
