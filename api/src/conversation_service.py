import json
import os
import re
import time
from functools import lru_cache
from typing import Any, Literal

import anthropic
import httpx
from dotenv import load_dotenv
from openai import OpenAI

from .character_types import (
    DEFAULT_BUDDY_TYPE,
    get_buddy_type,
    get_friend_type,
)
from .prompts import (
    BUDDY_FEEDBACK_TRIGGER,
    BUDDY_SUPPORT_TRIGGER,
    build_buddy_feedback_system_prompt,
    build_buddy_support_system_prompt,
    build_buddy_system_prompt,
    build_friend_opening_prompt,
    build_friend_system_prompt,
    build_real_buddy_consult_system_prompt,
    build_real_buddy_feedback_system_prompt,
    build_ai_buddy_translate_system_prompt,
    build_real_buddy_support_system_prompt,
    build_real_partner_context,
    build_real_translate_system_prompt,
)
from .real_friends.storage import load_profile
from .scenarios import get_scenario

load_dotenv()

CLAUDE_MODEL = "claude-sonnet-4-6"
DEFAULT_AI_MODEL = "qwen"
QWEN_MODEL = os.environ.get("QWEN_MODEL", "qwen-plus")
QWEN_BASE_URL = os.environ.get(
    "QWEN_BASE_URL",
    "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
)

Character = Literal["friend", "buddy"]
RequestType = Literal["opening", "message"]
CoachMode = Literal["consult", "feedback", "support", "translate"]
ConversationMode = Literal["ai", "real"]
AiModel = Literal["claude", "qwen"]


def _get_claude_client() -> anthropic.Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY が設定されていません。")
    return anthropic.Anthropic(api_key=api_key)


@lru_cache(maxsize=1)
def _get_qwen_http_client() -> httpx.Client:
    # Cursor 等の HTTP_PROXY 経由だと DashScope へ 403 になるため、プロキシを使わない
    return httpx.Client(trust_env=False)


@lru_cache(maxsize=1)
def _get_qwen_client() -> OpenAI:
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        raise RuntimeError("DASHSCOPE_API_KEY が設定されていません。")
    return OpenAI(api_key=api_key, base_url=QWEN_BASE_URL, http_client=_get_qwen_http_client())


def _to_api_messages(messages: list[dict[str, Any]], character: Character) -> list[dict[str, str]]:
    api_messages: list[dict[str, str]] = []

    for message in messages:
        channel = message.get("channel")
        if character == "friend" and channel != "friend":
            continue

        speaker = message.get("speaker")
        content = message.get("content", "")

        if speaker == "user":
            api_messages.append({"role": "user", "content": content})
        elif speaker == character:
            api_messages.append({"role": "assistant", "content": content})
        else:
            label = "Partner" if speaker == "friend" else "Coach"
            api_messages.append({"role": "user", "content": f"[{label}]: {content}"})

    return api_messages


def _to_real_buddy_api_messages(
    messages: list[dict[str, Any]],
    mode: CoachMode,
) -> list[dict[str, str]]:
    """Real-mode buddy context: friend channel history only, plus the current consult question."""
    api_messages: list[dict[str, str]] = []

    for message in messages:
        if message.get("channel") != "friend":
            continue
        speaker = message.get("speaker")
        content = message.get("content", "")
        if not content:
            continue
        if speaker == "user":
            api_messages.append({"role": "user", "content": content})
        elif speaker == "friend":
            api_messages.append({"role": "user", "content": f"[Partner]: {content}"})

    if mode == "consult":
        trailing_consult: list[dict[str, str]] = []
        for message in reversed(messages):
            channel = message.get("channel")
            if channel != "buddy":
                break
            speaker = message.get("speaker")
            if speaker == "buddy":
                break
            if speaker == "user":
                content = message.get("content", "")
                if content:
                    trailing_consult.insert(0, {"role": "user", "content": content})
        api_messages.extend(trailing_consult)

    return api_messages


def _extract_claude_text(response: anthropic.types.Message) -> str:
    for block in response.content:
        if block.type == "text":
            return block.text
    raise RuntimeError("API からテキスト応答が返されませんでした。")


def _serialize_claude_usage(usage: anthropic.types.Usage) -> dict[str, Any]:
    result: dict[str, Any] = {
        "input_tokens": usage.input_tokens,
        "output_tokens": usage.output_tokens,
    }
    if usage.cache_creation_input_tokens is not None:
        result["cache_creation_input_tokens"] = usage.cache_creation_input_tokens
    if usage.cache_read_input_tokens is not None:
        result["cache_read_input_tokens"] = usage.cache_read_input_tokens
    if usage.service_tier is not None:
        result["service_tier"] = usage.service_tier
    return result


def _serialize_qwen_usage(usage: Any) -> dict[str, Any]:
    return {
        "input_tokens": usage.prompt_tokens,
        "output_tokens": usage.completion_tokens,
    }


def _call_claude(system_prompt: str, messages: list[dict[str, str]], max_tokens: int) -> dict[str, Any]:
    client = _get_claude_client()
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages,
    )
    return {
        "text": _extract_claude_text(response),
        "usage": _serialize_claude_usage(response.usage),
    }


def _call_qwen(system_prompt: str, messages: list[dict[str, str]], max_tokens: int) -> dict[str, Any]:
    # #region agent log
    def _dbg_qwen(message: str, data: dict[str, Any], hypothesis_id: str) -> None:
        try:
            with open("/Users/tadasuke/Documents/19_cursor/04_reticle/.cursor/debug-30c584.log", "a") as f:
                f.write(json.dumps({
                    "sessionId": "30c584",
                    "location": "conversation_service.py:_call_qwen",
                    "message": message,
                    "data": data,
                    "hypothesisId": hypothesis_id,
                    "timestamp": int(time.time() * 1000),
                }) + "\n")
        except OSError:
            pass
    # #endregion

    client = _get_qwen_client()
    try:
        completion = client.chat.completions.create(
            model=QWEN_MODEL,
            messages=[{"role": "system", "content": system_prompt}, *messages],
            max_tokens=max_tokens,
        )
    except Exception as exc:
        # #region agent log
        _dbg_qwen("qwen call failed", {"errorType": type(exc).__name__, "error": str(exc)}, "B")
        # #endregion
        raise RuntimeError(f"Qwen API 呼び出しに失敗しました: {exc}") from exc

    content = completion.choices[0].message.content
    if not content:
        raise RuntimeError("API からテキスト応答が返されませんでした。")
    if completion.usage is None:
        raise RuntimeError("API から usage 情報が返されませんでした。")
    # #region agent log
    _dbg_qwen("qwen call ok", {"outputTokens": completion.usage.completion_tokens}, "B")
    # #endregion
    return {
        "text": content,
        "usage": _serialize_qwen_usage(completion.usage),
    }


def _generate(
    ai_model: AiModel,
    system_prompt: str,
    messages: list[dict[str, str]],
    max_tokens: int,
) -> dict[str, Any]:
    if ai_model == "claude":
        return _call_claude(system_prompt, messages, max_tokens)
    return _call_qwen(system_prompt, messages, max_tokens)


def _parse_recommended_reply(text: str) -> dict[str, str | None]:
    match = re.search(
        r"【おすすめ返信】\s*\n英:\s*(.+?)\s*\n日:\s*(.+?)(?:\s*\n\s*\n|\s*$)",
        text,
        re.DOTALL,
    )
    if not match:
        return {"en": None, "ja": None}
    return {
        "en": match.group(1).strip(),
        "ja": match.group(2).strip(),
    }


def _attach_recommended_reply_fields(result: dict[str, Any]) -> dict[str, Any]:
    parsed = _parse_recommended_reply(result["text"])
    return {
        **result,
        "recommendedReplyEn": parsed["en"],
        "recommendedReplyJa": parsed["ja"],
    }


def _real_profile_context(real_friend_id: str) -> str:
    profile = load_profile(real_friend_id)
    return build_real_partner_context(
        {
            "label": profile.label,
            "age": str(profile.age),
            "nationality": profile.nationality,
            "gender": profile.gender,
            "sourceApp": profile.source_app,
            "bio": profile.bio,
            "notes": profile.notes,
        }
    )


def translate_real_text(
    real_friend_id: str,
    english_text: str,
    ai_model: AiModel = DEFAULT_AI_MODEL,
) -> dict[str, Any]:
    partner_context = _real_profile_context(real_friend_id)
    return _generate(
        ai_model,
        build_real_translate_system_prompt(partner_context),
        [{"role": "user", "content": english_text.strip()}],
        max_tokens=150,
    )


def translate_ai_buddy_text(
    scenario_id: str,
    friend_type_id: str,
    buddy_type_id: str,
    english_text: str,
    ai_model: AiModel = DEFAULT_AI_MODEL,
) -> dict[str, Any]:
    scenario = get_scenario(scenario_id)
    buddy_type = get_buddy_type(buddy_type_id)
    friend_type = get_friend_type(friend_type_id)
    return _generate(
        ai_model,
        build_ai_buddy_translate_system_prompt(scenario, buddy_type, friend_type),
        [{"role": "user", "content": english_text.strip()}],
        max_tokens=220,
    )


def generate_friend_opening(
    scenario_id: str,
    friend_type_id: str,
    ai_model: AiModel = DEFAULT_AI_MODEL,
) -> dict[str, Any]:
    scenario = get_scenario(scenario_id)
    friend_type = get_friend_type(friend_type_id)

    return _generate(
        ai_model,
        build_friend_system_prompt(scenario, friend_type),
        [{"role": "user", "content": build_friend_opening_prompt(scenario, friend_type)}],
        max_tokens=100,
    )


def send_message(
    character: Character,
    scenario_id: str,
    messages: list[dict[str, Any]],
    friend_type_id: str,
    buddy_type_id: str = DEFAULT_BUDDY_TYPE,
    mode: CoachMode = "consult",
    ai_model: AiModel = DEFAULT_AI_MODEL,
    conversation_mode: ConversationMode = "ai",
    real_friend_id: str | None = None,
) -> dict[str, Any]:
    scenario = get_scenario(scenario_id)
    buddy_type = get_buddy_type(buddy_type_id)

    if conversation_mode == "real":
        if not real_friend_id:
            raise ValueError("realFriendId is required for real mode")
        partner_context = _real_profile_context(real_friend_id)

        if character == "friend":
            raise ValueError("Friend replies are not supported in real mode")

        api_messages = _to_real_buddy_api_messages(messages, mode)

        if mode == "feedback":
            system_prompt = build_real_buddy_feedback_system_prompt(buddy_type, partner_context)
            api_messages = [*api_messages, {"role": "user", "content": BUDDY_FEEDBACK_TRIGGER}]
            max_tokens = 150
        elif mode == "support":
            system_prompt = build_real_buddy_support_system_prompt(buddy_type, partner_context)
            api_messages = [*api_messages, {"role": "user", "content": BUDDY_SUPPORT_TRIGGER}]
            max_tokens = 220
        else:
            system_prompt = build_real_buddy_consult_system_prompt(buddy_type, partner_context)
            max_tokens = 220

        result = _generate(ai_model, system_prompt, api_messages, max_tokens)
        if mode in ("support", "consult"):
            return _attach_recommended_reply_fields(result)
        return result

    api_messages = _to_api_messages(messages, character)
    friend_type = get_friend_type(friend_type_id)

    if character == "friend":
        system_prompt = build_friend_system_prompt(scenario, friend_type)
        max_tokens = 150
    elif mode == "feedback":
        system_prompt = build_buddy_feedback_system_prompt(scenario, buddy_type, friend_type)
        api_messages = [*api_messages, {"role": "user", "content": BUDDY_FEEDBACK_TRIGGER}]
        max_tokens = 150
    elif mode == "support":
        system_prompt = build_buddy_support_system_prompt(scenario, buddy_type, friend_type)
        api_messages = [*api_messages, {"role": "user", "content": BUDDY_SUPPORT_TRIGGER}]
        max_tokens = 200
    else:
        system_prompt = build_buddy_system_prompt(scenario, buddy_type, friend_type)
        max_tokens = 200

    return _generate(ai_model, system_prompt, api_messages, max_tokens)


def handle_conversation_request(body: dict[str, Any]) -> dict[str, Any]:
    request_type = body.get("type")
    conversation_mode = body.get("conversationMode", "ai")
    scenario_id = body.get("scenarioId", "sns")
    friend_type_id = body.get("friendType")
    real_friend_id = body.get("realFriendId")
    buddy_type_id = body.get("buddyType", DEFAULT_BUDDY_TYPE)
    ai_model = body.get("aiModel", DEFAULT_AI_MODEL)

    if conversation_mode not in ("ai", "real"):
        raise ValueError("conversationMode must be 'ai' or 'real'")
    if not scenario_id:
        raise ValueError("scenarioId is required")
    if ai_model not in ("claude", "qwen"):
        raise ValueError("aiModel must be 'claude' or 'qwen'")

    get_buddy_type(buddy_type_id)

    if conversation_mode == "ai":
        if not friend_type_id:
            raise ValueError("friendType is required for AI mode")
        get_friend_type(friend_type_id)
    else:
        if not real_friend_id:
            raise ValueError("realFriendId is required for real mode")
        load_profile(real_friend_id)

    if request_type == "opening":
        if conversation_mode == "real":
            raise ValueError("opening is not supported in real mode")
        return generate_friend_opening(scenario_id, friend_type_id, ai_model=ai_model)

    if request_type == "message":
        character = body.get("character")
        messages = body.get("messages")
        mode = body.get("mode", "consult")
        english_text = body.get("englishText")

        if mode == "translate":
            if not isinstance(english_text, str) or not english_text.strip():
                raise ValueError("englishText is required for translate mode")
            if conversation_mode == "real":
                return translate_real_text(real_friend_id, english_text, ai_model=ai_model)
            return translate_ai_buddy_text(
                scenario_id,
                friend_type_id,
                buddy_type_id,
                english_text,
                ai_model=ai_model,
            )

        if character not in ("friend", "buddy"):
            raise ValueError("character must be 'friend' or 'buddy'")
        if conversation_mode == "real" and character == "friend":
            raise ValueError("Friend replies are not supported in real mode")
        if mode not in ("consult", "feedback", "support", "translate"):
            raise ValueError("mode must be 'consult', 'feedback', 'support', or 'translate'")
        if not isinstance(messages, list):
            raise ValueError("messages must be an array")

        return send_message(
            character,
            scenario_id,
            messages,
            friend_type_id or "",
            buddy_type_id,
            mode=mode,
            ai_model=ai_model,
            conversation_mode=conversation_mode,
            real_friend_id=real_friend_id,
        )

    raise ValueError("type must be 'opening' or 'message'")
