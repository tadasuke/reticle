from __future__ import annotations

import os

import boto3
from boto3.resources.base import ServiceResource

DEFAULT_TABLE_NAME = "buddy-talk"
DEFAULT_REGION = "ap-northeast-1"


def get_table_name() -> str:
    return os.environ.get("DYNAMODB_TABLE_NAME", DEFAULT_TABLE_NAME)


def get_dynamodb_resource() -> ServiceResource:
    region = os.environ.get("AWS_REGION", DEFAULT_REGION)
    endpoint = os.environ.get("DYNAMODB_ENDPOINT")

    kwargs: dict[str, str] = {"region_name": region}
    if endpoint:
        kwargs["endpoint_url"] = endpoint
        kwargs.setdefault("aws_access_key_id", os.environ.get("AWS_ACCESS_KEY_ID", "local"))
        kwargs.setdefault("aws_secret_access_key", os.environ.get("AWS_SECRET_ACCESS_KEY", "local"))

    return boto3.resource("dynamodb", **kwargs)


def get_table():
    return get_dynamodb_resource().Table(get_table_name())
