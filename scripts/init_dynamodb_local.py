#!/usr/bin/env python3
"""Create the buddy-talk DynamoDB table on DynamoDB Local if it does not exist."""

from __future__ import annotations

import os
import sys

import boto3
from botocore.exceptions import ClientError

DEFAULT_ENDPOINT = "http://localhost:8001"
DEFAULT_TABLE_NAME = "buddy-talk"
DEFAULT_REGION = "ap-northeast-1"


def main() -> int:
    endpoint = os.environ.get("DYNAMODB_ENDPOINT", DEFAULT_ENDPOINT)
    table_name = os.environ.get("DYNAMODB_TABLE_NAME", DEFAULT_TABLE_NAME)
    region = os.environ.get("AWS_REGION", DEFAULT_REGION)

    client = boto3.client(
        "dynamodb",
        endpoint_url=endpoint,
        region_name=region,
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "local"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "local"),
    )

    try:
        client.describe_table(TableName=table_name)
        print(f"Table '{table_name}' already exists.")
        return 0
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ResourceNotFoundException":
            raise

    client.create_table(
        TableName=table_name,
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
    waiter = client.get_waiter("table_exists")
    waiter.wait(TableName=table_name)
    print(f"Created table '{table_name}' at {endpoint}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
