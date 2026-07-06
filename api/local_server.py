import logging
import os
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.assets_paths import get_buddies_root, get_friends_root, get_images_root
from src.character_image_studio.handler import (
    adopt_reference,
    create_new_character,
    edit_image,
    generate_images,
    get_character_detail,
    list_characters,
    stress_test,
    update_spec,
)
from src.character_types import DEFAULT_BUDDY_TYPE, is_valid_buddy_type, is_valid_friend_type
from src.conversation_service import handle_conversation_request
from src.ai_conversations.handler import (
    ConversationNotFoundError,
    create_user_conversation,
    get_user_conversation,
    list_user_conversations,
    patch_user_conversation,
    put_user_conversation_messages,
)
from src.usage import total_tokens_from_usage
from src.users.handler import (
    InvalidUserIdError,
    UserNotFoundError as LoginUserNotFoundError,
    get_user_profile,
    login_user,
    normalize_user_id,
)
from src.admin_users.handler import (
    InvalidTokenAmountError,
    UserAlreadyExistsError,
    UserNotFoundError,
    create_user,
    delete_user,
    get_user_detail,
    grant_user_tokens,
    list_users,
)
from src.token_ledger.handler import (
    InsufficientTokenBalanceError,
    consume_user_tokens,
    list_user_token_ledger,
    require_positive_token_balance,
)
from src.buddy_characters.handler import list_buddy_types
from src.friend_characters.handler import (
    create_friend_type,
    delete_friend_type,
    get_friend_type_detail,
    list_friend_types,
    update_friend_type,
)

load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(title="Buddy Talk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

friends_root = get_friends_root()
buddies_root = get_buddies_root()
images_root = get_images_root()
friends_root.mkdir(parents=True, exist_ok=True)
buddies_root.mkdir(parents=True, exist_ok=True)
images_root.mkdir(parents=True, exist_ok=True)
app.mount("/media/friends", StaticFiles(directory=str(friends_root)), name="friend-assets")
app.mount("/media/buddies", StaticFiles(directory=str(buddies_root)), name="buddy-assets")
app.mount("/media/images", StaticFiles(directory=str(images_root)), name="image-assets")


class MessagePayload(BaseModel):
    id: str
    speaker: Literal["user", "friend", "buddy"]
    channel: Literal["friend", "buddy"]
    content: str
    timestamp: int


class ConversationRequest(BaseModel):
    type: Literal["opening", "message"]
    scenarioId: Literal["casual", "cafe", "bar", "sns"] = "sns"
    friendType: str | None = None
    buddyType: str = DEFAULT_BUDDY_TYPE
    aiModel: Literal["qwen", "claude"] = "qwen"
    character: Literal["friend", "buddy"] | None = None
    mode: Literal["consult", "feedback", "support", "translate"] | None = None
    englishText: str | None = None
    messages: list[MessagePayload] | None = Field(default=None)
    conversationId: str | None = None


class SpecUpdateRequest(BaseModel):
    visual_anchor: str
    must_avoid: str = ""
    negative_prompt: str


class CharacterCreateRequest(BaseModel):
    visual_anchor: str
    must_avoid: str = ""
    negative_prompt: str = ""


class GenerateRequest(BaseModel):
    count: int = Field(default=1, ge=1, le=4)
    seed: int | None = None


class EditRequest(BaseModel):
    sourceImageId: str
    instruction: str
    seed: int | None = None


class StressTestRequest(BaseModel):
    sourceImageId: str
    seed: int | None = None


class AdoptRequest(BaseModel):
    sourceImageId: str


class FriendTypeCreateRequest(BaseModel):
    id: str | None = None
    label: str
    age: int = Field(ge=1, le=120)
    nationality: str = ""
    gender: str = ""
    subtitle: str = ""
    description: str = ""
    persona: str
    enabled: bool = True


class FriendTypeUpdateRequest(BaseModel):
    label: str
    age: int = Field(ge=1, le=120)
    nationality: str = ""
    gender: str = ""
    subtitle: str = ""
    description: str = ""
    persona: str
    enabled: bool = True


class UserLoginRequest(BaseModel):
    userId: str


class AdminUserCreateRequest(BaseModel):
    userId: str = Field(min_length=1)
    initialTokens: int = Field(ge=0)


class AdminTokenGrantRequest(BaseModel):
    tokens: int = Field(ge=1)


class AiConversationCreateRequest(BaseModel):
    scenarioId: Literal["casual", "cafe", "bar", "sns"] = "sns"
    friendTypeId: str
    buddyTypeId: str
    supportType: Literal["high", "middle", "low"] = "middle"


class AiConversationMessagesRequest(BaseModel):
    messages: list[MessagePayload]


class AiConversationPatchRequest(BaseModel):
    supportType: Literal["high", "middle", "low"] | None = None
    buddyTypeId: str | None = None


def require_matching_user(user_id: str, x_user_id: str | None) -> str:
    try:
        normalized_path = normalize_user_id(user_id)
    except InvalidUserIdError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header is required")
    try:
        normalized_header = normalize_user_id(x_user_id)
    except InvalidUserIdError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    if normalized_header != normalized_path:
        raise HTTPException(status_code=403, detail="X-User-Id does not match path userId")
    return normalized_path


def infer_token_request_kind(request: ConversationRequest) -> str:
    if request.type == "opening":
        return "friend_opening"
    if request.character == "friend":
        return "friend_reply"
    mode = request.mode or "consult"
    return f"buddy_{mode}"


@app.get("/friend-types")
def public_list_friend_types() -> dict[str, Any]:
    return {"friendTypes": list_friend_types(include_disabled=False)}


@app.get("/buddy-types")
def public_list_buddy_types() -> dict[str, Any]:
    return {"buddyTypes": list_buddy_types(include_disabled=False)}


@app.post("/users/login")
def public_login_user(request: UserLoginRequest) -> dict[str, Any]:
    # #region agent log
    import json, time
    try:
        with open("/Users/tadasuke/Documents/19_cursor/04_reticle/.cursor/debug-fe457c.log", "a") as _f:
            _f.write(json.dumps({"sessionId":"fe457c","location":"local_server.py:public_login_user:entry","message":"login endpoint hit","data":{"userIdLength":len(request.userId)},"timestamp":int(time.time()*1000),"hypothesisId":"A"}) + "\n")
    except Exception:
        pass
    # #endregion
    try:
        result = login_user(user_id=request.userId)
        return result
    except InvalidUserIdError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LoginUserNotFoundError as exc:
        raise HTTPException(status_code=404, detail="登録されていないユーザー ID です") from exc
    except Exception as exc:
        # #region agent log
        try:
            with open("/Users/tadasuke/Documents/19_cursor/04_reticle/.cursor/debug-fe457c.log", "a") as _f:
                _f.write(json.dumps({"sessionId":"fe457c","location":"local_server.py:public_login_user:error","message":"login failed with exception","data":{"errorType":type(exc).__name__,"errorMessage":str(exc)},"timestamp":int(time.time()*1000),"hypothesisId":"D"}) + "\n")
        except Exception:
            pass
        # #endregion
        logger.exception("Unhandled error in user login")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.get("/users/{user_id}")
def public_get_user(
    user_id: str,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict[str, Any]:
    normalized = require_matching_user(user_id, x_user_id)
    try:
        return get_user_profile(user_id=normalized)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error getting user profile")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.get("/users/{user_id}/token-ledger")
def public_list_token_ledger(
    user_id: str,
    limit: int = 50,
    cursor: str | None = None,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict[str, Any]:
    normalized = require_matching_user(user_id, x_user_id)
    try:
        return list_user_token_ledger(user_id=normalized, limit=limit, cursor=cursor)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error listing token ledger")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.get("/users/{user_id}/ai-conversations")
def public_list_ai_conversations(
    user_id: str,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict[str, Any]:
    normalized = require_matching_user(user_id, x_user_id)
    try:
        return list_user_conversations(normalized)
    except Exception as exc:
        logger.exception("Unhandled error listing ai conversations")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.post("/users/{user_id}/ai-conversations")
def public_create_ai_conversation(
    user_id: str,
    request: AiConversationCreateRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict[str, Any]:
    normalized = require_matching_user(user_id, x_user_id)
    try:
        return create_user_conversation(
            normalized,
            scenario_id=request.scenarioId,
            friend_type_id=request.friendTypeId,
            buddy_type_id=request.buddyTypeId,
            support_type=request.supportType,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error creating ai conversation")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.get("/users/{user_id}/ai-conversations/{conversation_id}")
def public_get_ai_conversation(
    user_id: str,
    conversation_id: str,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict[str, Any]:
    normalized = require_matching_user(user_id, x_user_id)
    try:
        return get_user_conversation(normalized, conversation_id)
    except ConversationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error getting ai conversation")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.put("/users/{user_id}/ai-conversations/{conversation_id}/messages")
def public_put_ai_conversation_messages(
    user_id: str,
    conversation_id: str,
    request: AiConversationMessagesRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict[str, Any]:
    normalized = require_matching_user(user_id, x_user_id)
    try:
        return put_user_conversation_messages(
            normalized,
            conversation_id,
            [message.model_dump() for message in request.messages],
        )
    except ConversationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error saving ai conversation messages")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.patch("/users/{user_id}/ai-conversations/{conversation_id}")
def public_patch_ai_conversation(
    user_id: str,
    conversation_id: str,
    request: AiConversationPatchRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict[str, Any]:
    normalized = require_matching_user(user_id, x_user_id)
    try:
        return patch_user_conversation(
            normalized,
            conversation_id,
            support_type=request.supportType,
            buddy_type_id=request.buddyTypeId,
        )
    except ConversationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error patching ai conversation")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.post("/conversation")
def conversation(
    request: ConversationRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_idempotency_key: str | None = Header(default=None, alias="X-Idempotency-Key"),
) -> dict[str, Any]:
    if not request.friendType:
        raise HTTPException(status_code=400, detail="friendType is required")
    valid_friend = is_valid_friend_type(request.friendType)
    if not valid_friend:
        raise HTTPException(status_code=400, detail=f"Unknown friendType: {request.friendType}")
    if not is_valid_buddy_type(request.buddyType):
        raise HTTPException(status_code=400, detail=f"Unknown buddyType: {request.buddyType}")

    normalized_user_id: str | None = None
    if x_user_id:
        try:
            normalized_user_id = normalize_user_id(x_user_id)
        except InvalidUserIdError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc

        try:
            require_positive_token_balance(user_id=normalized_user_id)
        except InsufficientTokenBalanceError as exc:
            raise HTTPException(status_code=402, detail=str(exc)) from exc

    body: dict[str, Any] = request.model_dump(exclude_none=True)

    try:
        result = handle_conversation_request(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error in conversation handler")
        raise HTTPException(status_code=500, detail="Internal server error") from exc

    if normalized_user_id:
        usage = result.get("usage")
        if isinstance(usage, dict):
            tokens = total_tokens_from_usage(usage)
            if not x_idempotency_key:
                raise HTTPException(status_code=400, detail="X-Idempotency-Key header is required")
            source: dict[str, Any] = {
                "conversationMode": "ai",
                "requestKind": infer_token_request_kind(request),
                "friendTypeId": request.friendType,
                "buddyTypeId": request.buddyType,
            }
            if request.conversationId:
                source["conversationId"] = request.conversationId
            ai_token_balance = consume_user_tokens(
                user_id=normalized_user_id,
                amount=tokens,
                idempotency_key=x_idempotency_key,
                usage=usage,
                source=source,
            )
            if ai_token_balance is not None:
                result = {**result, "aiTokenBalance": ai_token_balance}

    return result


@app.get("/admin/characters")
def admin_list_characters() -> dict[str, Any]:
    return {"characters": list_characters()}


@app.post("/admin/characters")
def admin_create_character(request: CharacterCreateRequest) -> dict[str, Any]:
    try:
        return create_new_character(
            request.visual_anchor,
            request.must_avoid,
            request.negative_prompt,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/characters/{character_id}")
def admin_get_character(character_id: str) -> dict[str, Any]:
    try:
        return get_character_detail(character_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put("/admin/characters/{character_id}/spec")
def admin_update_spec(character_id: str, request: SpecUpdateRequest) -> dict[str, Any]:
    try:
        return update_spec(
            character_id,
            request.visual_anchor,
            request.must_avoid,
            request.negative_prompt,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/admin/characters/{character_id}/generate")
def admin_generate(character_id: str, request: GenerateRequest) -> dict[str, Any]:
    try:
        images = generate_images(character_id, request.count, request.seed)
        return {"images": images}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/admin/characters/{character_id}/edit")
def admin_edit(character_id: str, request: EditRequest) -> dict[str, Any]:
    try:
        image = edit_image(
            character_id,
            request.sourceImageId,
            request.instruction,
            request.seed,
        )
        return {"image": image}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/admin/characters/{character_id}/stress-test")
def admin_stress_test(character_id: str, request: StressTestRequest) -> dict[str, Any]:
    try:
        images = stress_test(character_id, request.sourceImageId, request.seed)
        return {"images": images}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/admin/characters/{character_id}/adopt")
def admin_adopt(character_id: str, request: AdoptRequest) -> dict[str, Any]:
    try:
        reference = adopt_reference(character_id, request.sourceImageId)
        return {"reference": reference}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/users")
def admin_list_users() -> dict[str, Any]:
    try:
        return list_users()
    except Exception as exc:
        logger.exception("Unhandled error listing admin users")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.get("/admin/users/{user_id}")
def admin_get_user(user_id: str) -> dict[str, Any]:
    try:
        return get_user_detail(user_id)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error getting admin user detail")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.post("/admin/users")
def admin_create_user(request: AdminUserCreateRequest) -> dict[str, Any]:
    try:
        return create_user(user_id=request.userId, initial_tokens=request.initialTokens)
    except InvalidUserIdError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except InvalidTokenAmountError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except UserAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error creating admin user")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.post("/admin/users/{user_id}/token-grants")
def admin_grant_user_tokens(user_id: str, request: AdminTokenGrantRequest) -> dict[str, Any]:
    try:
        return grant_user_tokens(user_id=user_id, tokens=request.tokens)
    except InvalidUserIdError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except InvalidTokenAmountError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error granting admin user tokens")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: str) -> dict[str, Any]:
    try:
        return delete_user(user_id)
    except InvalidUserIdError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error deleting admin user")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.get("/admin/friend-types")
def admin_list_friend_types() -> dict[str, Any]:
    return {"friendTypes": list_friend_types(include_disabled=True)}


@app.post("/admin/friend-types")
def admin_create_friend_type(request: FriendTypeCreateRequest) -> dict[str, Any]:
    try:
        return create_friend_type(
            friend_id=request.id,
            label=request.label,
            age=request.age,
            nationality=request.nationality,
            gender=request.gender,
            subtitle=request.subtitle,
            description=request.description,
            persona=request.persona,
            enabled=request.enabled,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/admin/friend-types/{friend_id}")
def admin_get_friend_type(friend_id: str) -> dict[str, Any]:
    try:
        return get_friend_type_detail(friend_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put("/admin/friend-types/{friend_id}")
def admin_update_friend_type(friend_id: str, request: FriendTypeUpdateRequest) -> dict[str, Any]:
    try:
        return update_friend_type(
            friend_id,
            label=request.label,
            age=request.age,
            nationality=request.nationality,
            gender=request.gender,
            subtitle=request.subtitle,
            description=request.description,
            persona=request.persona,
            enabled=request.enabled,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/admin/friend-types/{friend_id}")
def admin_delete_friend_type(friend_id: str) -> dict[str, Any]:
    try:
        delete_friend_type(friend_id)
        return {"ok": True}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("local_server:app", host="0.0.0.0", port=port, reload=True)
