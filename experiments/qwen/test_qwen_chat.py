"""Qwen (qwen-plus) 接続テスト。Reticle の会話フローに近いケースを検証する。"""

from __future__ import annotations

import re

import pytest

from client import chat


@pytest.fixture(scope="module")
def english_reply() -> str:
    return chat(
        [
            {
                "role": "system",
                "content": (
                    "You are a friendly English conversation partner. "
                    "Reply in 1-2 short sentences using simple words. English only."
                ),
            },
            {"role": "user", "content": "Hi! Nice to meet you."},
        ],
        max_tokens=120,
    )


def test_basic_chat_returns_non_empty_text() -> None:
    reply = chat([{"role": "user", "content": "Say hello in one short sentence."}])
    assert reply
    assert len(reply) > 0


def test_system_prompt_english_only(english_reply: str) -> None:
    # 日本語が混ざっていないこと（簡易チェック）
    assert not re.search(r"[\u3040-\u30ff\u4e00-\u9fff]", english_reply)
    assert len(english_reply.split()) >= 2


def test_multi_turn_conversation() -> None:
    reply = chat(
        [
            {
                "role": "system",
                "content": "You are a friendly cafe staff. Reply briefly in English.",
            },
            {"role": "user", "content": "I'd like a latte, please."},
            {"role": "assistant", "content": "Sure! Hot or iced?"},
            {"role": "user", "content": "Hot, please."},
        ],
        max_tokens=120,
    )
    assert reply
    assert "hot" in reply.lower() or "latte" in reply.lower() or "here" in reply.lower()


def test_japanese_coach_style() -> None:
    reply = chat(
        [
            {
                "role": "system",
                "content": (
                    "あなたは英会話コーチのチサトです。"
                    "ユーザーの英語に対して日本語で2-3文の短いフィードバックを返してください。"
                ),
            },
            {"role": "user", "content": "I go to cafe yesterday."},
        ],
        max_tokens=200,
    )
    assert re.search(r"[\u3040-\u30ff\u4e00-\u9fff]", reply)
