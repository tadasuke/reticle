import base64
import mimetypes
import os
import random
from typing import Any

import dashscope
import requests
from dashscope import MultiModalConversation

from .prompts import (
    STRESS_TEST_SCENES,
    build_edit_prompt,
    build_portrait_prompt,
    build_stress_test_prompt,
)
from .storage import (
    load_spec,
    resolve_image_path,
    save_generated_image,
)

DASHSCOPE_BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1"
DEFAULT_IMAGE_MODEL = os.environ.get("QWEN_IMAGE_MODEL", "qwen-image-2.0-pro")
DEFAULT_EDIT_MODEL = os.environ.get("QWEN_IMAGE_EDIT_MODEL", "qwen-image-edit-max")
PORTRAIT_SIZE = "1024*1024"
EDIT_SIZE = "768*1024"


def _get_api_key() -> str:
    api_key = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("DASHSCOPE_API_KEY が設定されていません。")
    return api_key


def _configure_dashscope() -> None:
    dashscope.base_http_api_url = DASHSCOPE_BASE_URL


def _encode_image_file(image_path: str) -> str:
    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type or not mime_type.startswith("image/"):
        mime_type = "image/png"
    with open(image_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def _download_image(url: str) -> bytes:
    response = requests.get(url, stream=True, timeout=300)
    response.raise_for_status()
    return response.content


def _moderation_error_message(code: str, message: str) -> str:
    if code == "DataInspectionFailed":
        return (
            "DashScope のコンテンツ審査によりブロックされました。"
            " visual_anchor や negative_prompt からセクシー・露出・暴力的な表現を避け、"
            "修正指示も穏やかな言い回しに変えて再試行してください。"
            " negative_prompt に「nudity」などの単語を書くと逆にブロックされることがあります。"
        )
    return f"DashScope image API error ({code}): {message}"


def _extract_image_urls(response: Any) -> list[str]:
    if response.status_code != 200:
        code = getattr(response, "code", "Unknown")
        message = getattr(response, "message", "Image API request failed")
        raise RuntimeError(_moderation_error_message(str(code), str(message)))

    urls: list[str] = []
    choices = response.output.choices
    for choice in choices:
        for item in choice.message.content:
            if isinstance(item, dict) and item.get("image"):
                urls.append(item["image"])
    if not urls:
        raise RuntimeError("DashScope image API が画像 URL を返しませんでした。")
    return urls


def _call_text_to_image(
    *,
    model: str,
    prompt: str,
    negative_prompt: str,
    seed: int | None,
    size: str = PORTRAIT_SIZE,
) -> list[str]:
    _configure_dashscope()
    messages = [{"role": "user", "content": [{"text": prompt}]}]
    kwargs: dict[str, Any] = {
        "api_key": _get_api_key(),
        "model": model,
        "messages": messages,
        "stream": False,
        "n": 1,
        "watermark": False,
        "negative_prompt": negative_prompt,
        "prompt_extend": False,
        "size": size,
    }
    if seed is not None:
        kwargs["seed"] = seed

    response = MultiModalConversation.call(**kwargs)
    return _extract_image_urls(response)


def _call_image_edit(
    *,
    model: str,
    image_path: str,
    prompt: str,
    negative_prompt: str,
    seed: int | None,
    size: str = EDIT_SIZE,
) -> list[str]:
    _configure_dashscope()
    encoded = _encode_image_file(image_path)
    messages = [
        {
            "role": "user",
            "content": [
                {"image": encoded},
                {"text": prompt},
            ],
        }
    ]
    kwargs: dict[str, Any] = {
        "api_key": _get_api_key(),
        "model": model,
        "messages": messages,
        "stream": False,
        "n": 1,
        "watermark": False,
        "negative_prompt": negative_prompt,
        "prompt_extend": False,
        "size": size,
    }
    if seed is not None:
        kwargs["seed"] = seed

    response = MultiModalConversation.call(**kwargs)
    return _extract_image_urls(response)


def generate_candidates(
    friend_type_id: str,
    *,
    count: int,
    seed: int | None = None,
) -> list[dict[str, Any]]:
    spec = load_spec(friend_type_id)
    prompt = build_portrait_prompt(spec)
    results: list[dict[str, Any]] = []

    for i in range(count):
        current_seed = seed + i if seed is not None else random.randint(0, 2_147_483_647)
        urls = _call_text_to_image(
            model=DEFAULT_IMAGE_MODEL,
            prompt=prompt,
            negative_prompt=spec.negative_prompt,
            seed=current_seed,
        )
        image_bytes = _download_image(urls[0])
        entry = save_generated_image(
            friend_type_id,
            kind="candidate",
            image_bytes=image_bytes,
            model=DEFAULT_IMAGE_MODEL,
            prompt=prompt,
            seed=current_seed,
        )
        results.append(entry)

    return results


def edit_image(
    friend_type_id: str,
    *,
    source_image_id: str,
    instruction: str,
    seed: int | None = None,
) -> dict[str, Any]:
    spec = load_spec(friend_type_id)
    source_path, _ = resolve_image_path(friend_type_id, source_image_id)
    prompt = build_edit_prompt(instruction)
    current_seed = seed if seed is not None else random.randint(0, 2_147_483_647)

    urls = _call_image_edit(
        model=DEFAULT_EDIT_MODEL,
        image_path=str(source_path),
        prompt=prompt,
        negative_prompt=spec.negative_prompt,
        seed=current_seed,
    )
    image_bytes = _download_image(urls[0])
    return save_generated_image(
        friend_type_id,
        kind="candidate",
        image_bytes=image_bytes,
        model=DEFAULT_EDIT_MODEL,
        prompt=prompt,
        seed=current_seed,
        parent_id=source_image_id,
        instruction=instruction,
    )


def run_stress_test(
    friend_type_id: str,
    *,
    source_image_id: str,
    seed: int | None = None,
) -> list[dict[str, Any]]:
    spec = load_spec(friend_type_id)
    source_path, _ = resolve_image_path(friend_type_id, source_image_id)
    results: list[dict[str, Any]] = []

    for scene in STRESS_TEST_SCENES:
        prompt = build_stress_test_prompt(scene["instruction"])
        current_seed = seed if seed is not None else random.randint(0, 2_147_483_647)
        urls = _call_image_edit(
            model=DEFAULT_EDIT_MODEL,
            image_path=str(source_path),
            prompt=prompt,
            negative_prompt=spec.negative_prompt,
            seed=current_seed,
        )
        image_bytes = _download_image(urls[0])
        entry = save_generated_image(
            friend_type_id,
            kind="stress-test",
            image_bytes=image_bytes,
            model=DEFAULT_EDIT_MODEL,
            prompt=prompt,
            seed=current_seed,
            parent_id=source_image_id,
            scene_id=scene["id"],
            instruction=scene["instruction"],
        )
        entry["scene_label"] = scene["label"]
        results.append(entry)

    return results
