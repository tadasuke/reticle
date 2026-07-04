#!/usr/bin/env python3
"""手動スモークテスト。pytest なしで単発実行する場合に使う。"""

from __future__ import annotations

from client import chat, create_client


def main() -> None:
    client, cfg = create_client()
    print(f"base_url: {cfg.base_url}")
    print(f"model:    {cfg.model}")
    print("---")

    reply = chat(
        [
            {"role": "user", "content": "Reply with exactly: Qwen connection OK"},
        ],
        max_tokens=32,
        config=cfg,
    )
    print("reply:", reply)
    assert "OK" in reply or "ok" in reply.lower(), f"Unexpected reply: {reply!r}"
    print("smoke test passed")


if __name__ == "__main__":
    main()
