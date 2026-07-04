"""Qwen チャット API の薄いラッパー（OpenAI 互換エンドポイント）。"""

from __future__ import annotations

from openai import OpenAI

from config import QwenConfig, load_config


def create_client(config: QwenConfig | None = None) -> tuple[OpenAI, QwenConfig]:
    cfg = config or load_config()
    client = OpenAI(api_key=cfg.api_key, base_url=cfg.base_url)
    return client, cfg


def chat(
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 256,
    temperature: float = 0.7,
    config: QwenConfig | None = None,
) -> str:
    client, cfg = create_client(config)
    completion = client.chat.completions.create(
        model=cfg.model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    content = completion.choices[0].message.content
    if not content:
        raise RuntimeError("Qwen API が空の応答を返しました。")
    return content.strip()
