from __future__ import annotations

import json
import os
import re
from typing import Any
from urllib.parse import unquote

from src.ai_conversations.handler import (
    ConversationNotFoundError,
    create_user_conversation,
    get_user_conversation,
    list_user_conversations,
    patch_user_conversation,
    put_user_conversation_messages,
)
from src.buddy_characters.handler import list_buddy_types
from src.character_types import DEFAULT_BUDDY_TYPE, is_valid_buddy_type, is_valid_friend_type
from src.conversation_service import handle_conversation_request
from src.friend_characters.handler import list_friend_types
from src.media.handler import media_response
from src.users.handler import InvalidUserIdError, login_user, normalize_user_id

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
    "Access-Control-Allow-Headers": "Content-Type,X-User-Id",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
}


def _json_response(status_code: int, body: dict[str, Any] | list[Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }


def _error_response(status_code: int, message: str) -> dict[str, Any]:
    return _json_response(status_code, {"error": message})


def _parse_body(event: dict[str, Any]) -> dict[str, Any]:
    raw_body = event.get("body") or "{}"
    if event.get("isBase64Encoded") and isinstance(raw_body, str):
        import base64

        raw_body = base64.b64decode(raw_body).decode("utf-8")
    if isinstance(raw_body, str):
        return json.loads(raw_body) if raw_body else {}
    return raw_body


def _get_header(event: dict[str, Any], name: str) -> str | None:
    headers = event.get("headers") or {}
    for key, value in headers.items():
        if key.lower() == name.lower():
            return value
    return None


def _require_matching_user(user_id: str, x_user_id: str | None) -> str:
    try:
        normalized_path = normalize_user_id(user_id)
    except InvalidUserIdError as exc:
        raise ValueError(str(exc)) from exc

    if not x_user_id:
        raise PermissionError("X-User-Id header is required")
    try:
        normalized_header = normalize_user_id(x_user_id)
    except InvalidUserIdError as exc:
        raise PermissionError(str(exc)) from exc
    if normalized_header != normalized_path:
        raise PermissionError("X-User-Id does not match path userId")
    return normalized_path


def _route_key(event: dict[str, Any]) -> tuple[str, str]:
    method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or "GET"
    ).upper()
    raw_path = event.get("rawPath") or event.get("path") or "/"
    path = unquote(raw_path)
    stage = event.get("requestContext", {}).get("stage", "")
    if stage and path.startswith(f"/{stage}"):
        path = path[len(stage) + 1 :] or "/"
    return method, path


_USER_CONVERSATIONS_RE = re.compile(r"^/users/(?P<user_id>[^/]+)/ai-conversations$")
_USER_CONVERSATION_RE = re.compile(r"^/users/(?P<user_id>[^/]+)/ai-conversations/(?P<conversation_id>[^/]+)$")
_USER_CONVERSATION_MESSAGES_RE = re.compile(
    r"^/users/(?P<user_id>[^/]+)/ai-conversations/(?P<conversation_id>[^/]+)/messages$"
)
_MEDIA_RE = re.compile(r"^/media/(?P<relative_key>(?:friends|buddies)/.+)$")


def dispatch(event: dict[str, Any]) -> dict[str, Any]:
    method, path = _route_key(event)

    if method == "OPTIONS":
        return {"statusCode": 204, "headers": CORS_HEADERS, "body": ""}

    try:
        if method == "GET" and path == "/friend-types":
            return _json_response(200, {"friendTypes": list_friend_types(include_disabled=False)})

        if method == "GET" and path == "/buddy-types":
            return _json_response(200, {"buddyTypes": list_buddy_types(include_disabled=False)})

        if method == "POST" and path == "/users/login":
            body = _parse_body(event)
            return _json_response(200, login_user(user_id=str(body.get("userId", ""))))

        if method == "POST" and path == "/conversation":
            body = _parse_body(event)
            if body.get("conversationMode", "ai") == "ai":
                friend_type = body.get("friendType")
                if not friend_type:
                    return _error_response(400, "friendType is required for AI mode")
                if not is_valid_friend_type(friend_type):
                    return _error_response(400, f"Unknown friendType: {friend_type}")
            buddy_type = body.get("buddyType", DEFAULT_BUDDY_TYPE)
            if not is_valid_buddy_type(buddy_type):
                return _error_response(400, f"Unknown buddyType: {buddy_type}")
            return _json_response(200, handle_conversation_request(body))

        media_match = _MEDIA_RE.match(path)
        if method == "GET" and media_match:
            response = media_response(media_match.group("relative_key"))
            if response is None:
                return _error_response(404, "Media not found")
            return response

        user_conversations_match = _USER_CONVERSATIONS_RE.match(path)
        if user_conversations_match:
            user_id = user_conversations_match.group("user_id")
            normalized = _require_matching_user(user_id, _get_header(event, "X-User-Id"))
            if method == "GET":
                return _json_response(200, list_user_conversations(normalized))
            if method == "POST":
                body = _parse_body(event)
                return _json_response(
                    200,
                    create_user_conversation(
                        normalized,
                        scenario_id=body.get("scenarioId", "sns"),
                        friend_type_id=body["friendTypeId"],
                        buddy_type_id=body.get("buddyTypeId", DEFAULT_BUDDY_TYPE),
                        support_type=body.get("supportType", "middle"),
                    ),
                )

        messages_match = _USER_CONVERSATION_MESSAGES_RE.match(path)
        if messages_match and method == "PUT":
            user_id = messages_match.group("user_id")
            conversation_id = messages_match.group("conversation_id")
            normalized = _require_matching_user(user_id, _get_header(event, "X-User-Id"))
            body = _parse_body(event)
            return _json_response(
                200,
                put_user_conversation_messages(normalized, conversation_id, body.get("messages", [])),
            )

        conversation_match = _USER_CONVERSATION_RE.match(path)
        if conversation_match:
            user_id = conversation_match.group("user_id")
            conversation_id = conversation_match.group("conversation_id")
            normalized = _require_matching_user(user_id, _get_header(event, "X-User-Id"))
            if method == "GET":
                return _json_response(200, get_user_conversation(normalized, conversation_id))
            if method == "PATCH":
                body = _parse_body(event)
                return _json_response(
                    200,
                    patch_user_conversation(
                        normalized,
                        conversation_id,
                        support_type=body.get("supportType"),
                        buddy_type_id=body.get("buddyTypeId"),
                    ),
                )

        return _error_response(404, "Not found")

    except InvalidUserIdError as exc:
        return _error_response(400, str(exc))
    except PermissionError as exc:
        message = str(exc)
        status = 401 if "required" in message else 403
        return _error_response(status, message)
    except ConversationNotFoundError as exc:
        return _error_response(404, str(exc))
    except ValueError as exc:
        return _error_response(400, str(exc))
    except RuntimeError as exc:
        return _error_response(500, str(exc))
    except json.JSONDecodeError:
        return _error_response(400, "Invalid JSON body")
    except KeyError as exc:
        return _error_response(400, f"Missing field: {exc.args[0]}")
    except Exception:
        return _error_response(500, "Internal server error")
