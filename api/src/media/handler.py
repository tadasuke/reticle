from __future__ import annotations

import base64
import mimetypes
import os
from pathlib import PurePosixPath

import boto3
from botocore.exceptions import ClientError

from src.assets_paths import get_buddies_root, get_friends_root

ALLOWED_PREFIXES = ("friends/", "buddies/")


def _get_media_bucket() -> str | None:
    bucket = os.environ.get("MEDIA_BUCKET", "").strip()
    return bucket or None


def _local_media_path(relative_key: str) -> str | None:
    path = PurePosixPath(relative_key)
    if len(path.parts) < 3:
        return None
    category, asset_id, filename = path.parts[0], path.parts[1], path.parts[2]
    if category == "friends":
        local_path = get_friends_root() / asset_id / filename
    elif category == "buddies":
        local_path = get_buddies_root() / asset_id / filename
    else:
        return None
    if not local_path.is_file():
        return None
    return str(local_path)


def get_media_object(relative_key: str) -> dict[str, str | bytes] | None:
    if not relative_key or ".." in relative_key:
        return None
    if not relative_key.startswith(ALLOWED_PREFIXES):
        return None

    bucket = _get_media_bucket()
    if bucket:
        client = boto3.client("s3")
        try:
            response = client.get_object(Bucket=bucket, Key=relative_key)
        except ClientError:
            return None
        body = response["Body"].read()
        content_type = response.get("ContentType") or mimetypes.guess_type(relative_key)[0] or "application/octet-stream"
        return {"body": body, "content_type": content_type, "is_base64": True}

    local_path = _local_media_path(relative_key)
    if not local_path:
        return None
    with open(local_path, "rb") as file:
        body = file.read()
    content_type = mimetypes.guess_type(local_path)[0] or "application/octet-stream"
    return {"body": body, "content_type": content_type, "is_base64": True}


def media_response(relative_key: str) -> dict[str, object] | None:
    payload = get_media_object(relative_key)
    if payload is None:
        return None
    body = payload["body"]
    if isinstance(body, bytes):
        encoded = base64.b64encode(body).decode("ascii")
    else:
        encoded = body
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": str(payload["content_type"]),
            "Cache-Control": "public, max-age=3600",
        },
        "body": encoded,
        "isBase64Encoded": True,
    }
