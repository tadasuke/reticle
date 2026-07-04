from typing import Any

from .http_router import dispatch


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    return dispatch(event)
