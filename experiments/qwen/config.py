"""Qwen (DashScope) 接続設定。Reticle 本体とは独立した検証用モジュール。"""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class QwenConfig:
    api_key: str
    base_url: str
    model: str


def load_config() -> QwenConfig:
    api_key = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    if not api_key or api_key in {"sk-xxxxxxxx", "your_key_here", "sk-xxx"}:
        raise RuntimeError(
            "DASHSCOPE_API_KEY が未設定です。"
            " experiments/qwen/README.md の手順で Model Studio（Singapore）の API キーを作成し、"
            " .env に設定してください。"
        )

    base_url = os.environ.get(
        "QWEN_BASE_URL",
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    ).strip()
    model = os.environ.get("QWEN_MODEL", "qwen3.7-plus").strip()

    return QwenConfig(api_key=api_key, base_url=base_url, model=model)
