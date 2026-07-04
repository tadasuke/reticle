from __future__ import annotations

import os
from typing import Any

import boto3
import yaml
from botocore.exceptions import ClientError


def get_media_bucket() -> str | None:
    bucket = os.environ.get("MEDIA_BUCKET", "").strip()
    return bucket or None


def list_asset_ids(category: str) -> list[str]:
    bucket = get_media_bucket()
    if not bucket:
        return []

    client = boto3.client("s3")
    prefix = f"{category}/"
    paginator = client.get_paginator("list_objects_v2")
    ids: set[str] = set()
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix, Delimiter="/"):
        for entry in page.get("CommonPrefixes", []):
            raw = entry.get("Prefix", "")
            asset_id = raw.removeprefix(prefix).strip("/")
            if asset_id:
                ids.add(asset_id)
    return sorted(ids)


def load_persona_yaml(category: str, asset_id: str) -> dict[str, Any] | None:
    bucket = get_media_bucket()
    if not bucket:
        return None

    key = f"{category}/{asset_id}/persona.yaml"
    client = boto3.client("s3")
    try:
        response = client.get_object(Bucket=bucket, Key=key)
    except ClientError:
        return None
    data = yaml.safe_load(response["Body"].read().decode("utf-8")) or {}
    return data if isinstance(data, dict) else {}


def has_reference_object(category: str, asset_id: str) -> bool:
    bucket = get_media_bucket()
    if not bucket:
        return False

    key = f"{category}/{asset_id}/reference.png"
    client = boto3.client("s3")
    try:
        client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError:
        return False
