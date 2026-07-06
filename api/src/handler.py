import json
import re
from typing import Any
from urllib.parse import unquote

from .admin_users.handler import (
    InvalidTokenAmountError,
    UserAlreadyExistsError,
    UserNotFoundError,
    create_user,
    delete_user,
    get_user_detail,
    grant_user_tokens,
    list_users,
)
from .conversation_service import handle_conversation_request
from .users.handler import InvalidUserIdError, UserNotFoundError as LoginUserNotFoundError, login_user

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
}


def _response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, ensure_ascii=False),
    }


def _request_path(event: dict[str, Any]) -> str:
    raw_path = event.get("rawPath") or event.get("path") or "/"
    stage = event.get("requestContext", {}).get("stage")
    if stage and raw_path.startswith(f"/{stage}/"):
        return raw_path[len(stage) + 1 :]
    return raw_path


def _path_parameters(event: dict[str, Any]) -> dict[str, str]:
    params = event.get("pathParameters") or {}
    return {key: unquote(str(value)) for key, value in params.items() if value is not None}


def _parse_body(event: dict[str, Any]) -> dict[str, Any]:
    raw_body = event.get("body") or "{}"
    return json.loads(raw_body) if isinstance(raw_body, str) else raw_body


def _handle_admin_users_list() -> dict[str, Any]:
    try:
        return _response(200, list_users())
    except Exception:
        return _response(500, {"error": "Internal server error"})


def _handle_admin_user_detail(user_id: str) -> dict[str, Any]:
    try:
        return _response(200, get_user_detail(user_id))
    except UserNotFoundError as exc:
        return _response(404, {"error": str(exc)})
    except Exception:
        return _response(500, {"error": "Internal server error"})


def _handle_admin_user_create(event: dict[str, Any]) -> dict[str, Any]:
    try:
        body = _parse_body(event)
        return _response(
            200,
            create_user(
                user_id=str(body.get("userId", "")),
                initial_tokens=int(body.get("initialTokens", 0)),
            ),
        )
    except InvalidUserIdError as exc:
        return _response(400, {"error": str(exc)})
    except InvalidTokenAmountError as exc:
        return _response(400, {"error": str(exc)})
    except UserAlreadyExistsError as exc:
        return _response(409, {"error": str(exc)})
    except (TypeError, ValueError) as exc:
        return _response(400, {"error": str(exc)})
    except Exception:
        return _response(500, {"error": "Internal server error"})


def _handle_admin_user_grant(user_id: str, event: dict[str, Any]) -> dict[str, Any]:
    try:
        body = _parse_body(event)
        return _response(
            200,
            grant_user_tokens(user_id=user_id, tokens=int(body.get("tokens", 0))),
        )
    except InvalidUserIdError as exc:
        return _response(400, {"error": str(exc)})
    except InvalidTokenAmountError as exc:
        return _response(400, {"error": str(exc)})
    except UserNotFoundError as exc:
        return _response(404, {"error": str(exc)})
    except (TypeError, ValueError) as exc:
        return _response(400, {"error": str(exc)})
    except Exception:
        return _response(500, {"error": "Internal server error"})


def _handle_admin_user_delete(user_id: str) -> dict[str, Any]:
    try:
        return _response(200, delete_user(user_id))
    except InvalidUserIdError as exc:
        return _response(400, {"error": str(exc)})
    except UserNotFoundError as exc:
        return _response(404, {"error": str(exc)})
    except Exception:
        return _response(500, {"error": "Internal server error"})


def _handle_user_login(event: dict[str, Any]) -> dict[str, Any]:
    try:
        body = _parse_body(event)
        return _response(200, login_user(user_id=str(body.get("userId", ""))))
    except InvalidUserIdError as exc:
        return _response(400, {"error": str(exc)})
    except LoginUserNotFoundError:
        return _response(404, {"error": "登録されていないユーザー ID です"})
    except Exception:
        return _response(500, {"error": "Internal server error"})


def _handle_conversation(event: dict[str, Any]) -> dict[str, Any]:
    try:
        body = _parse_body(event)
        result = handle_conversation_request(body)
        return _response(200, result)
    except ValueError as exc:
        return _response(400, {"error": str(exc)})
    except RuntimeError as exc:
        return _response(500, {"error": str(exc)})
    except Exception:
        return _response(500, {"error": "Internal server error"})


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod")

    if method == "OPTIONS":
        return {"statusCode": 204, "headers": CORS_HEADERS, "body": ""}

    path = _request_path(event)
    params = _path_parameters(event)

    if method == "GET" and path == "/admin/users":
        return _handle_admin_users_list()

    if method == "POST" and path == "/admin/users":
        return _handle_admin_user_create(event)

    if method == "POST" and path == "/users/login":
        return _handle_user_login(event)

    if method == "GET":
        detail_match = re.fullmatch(r"/admin/users/(?P<user_id>[^/]+)", path)
        if detail_match:
            user_id = params.get("user_id") or detail_match.group("user_id")
            return _handle_admin_user_detail(user_id)

    grant_match = re.fullmatch(r"/admin/users/(?P<user_id>[^/]+)/token-grants", path)
    if method == "POST" and grant_match:
        user_id = params.get("user_id") or grant_match.group("user_id")
        return _handle_admin_user_grant(user_id, event)

    delete_match = re.fullmatch(r"/admin/users/(?P<user_id>[^/]+)", path)
    if method == "DELETE" and delete_match:
        user_id = params.get("user_id") or delete_match.group("user_id")
        return _handle_admin_user_delete(user_id)

    if method == "POST" and path == "/conversation":
        return _handle_conversation(event)

    return _response(405, {"error": "Method not allowed"})
