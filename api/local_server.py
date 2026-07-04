import logging
import os
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.assets_paths import get_buddies_root, get_friends_root, get_images_root, get_real_friends_root
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
from src.users.handler import InvalidUserIdError, login_user, normalize_user_id
from src.buddy_characters.handler import list_buddy_types
from src.friend_characters.handler import (
    create_friend_type,
    delete_friend_type,
    get_friend_type_detail,
    list_friend_types,
    update_friend_type,
)
from src.real_friends.handler import (
    create_real_friend,
    delete_real_friend,
    delete_real_friend_photo,
    get_real_friend_detail,
    get_real_friend_messages,
    get_real_friend_photos,
    list_real_friends,
    put_real_friend_messages,
    set_real_friend_default_photo,
    update_real_friend,
    upload_real_friend_photo,
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
real_friends_root = get_real_friends_root()
friends_root.mkdir(parents=True, exist_ok=True)
buddies_root.mkdir(parents=True, exist_ok=True)
images_root.mkdir(parents=True, exist_ok=True)
real_friends_root.mkdir(parents=True, exist_ok=True)
app.mount("/media/friends", StaticFiles(directory=str(friends_root)), name="friend-assets")
app.mount("/media/buddies", StaticFiles(directory=str(buddies_root)), name="buddy-assets")
app.mount("/media/images", StaticFiles(directory=str(images_root)), name="image-assets")
app.mount("/media/real-friends", StaticFiles(directory=str(real_friends_root)), name="real-friend-assets")


class MessagePayload(BaseModel):
    id: str
    speaker: Literal["user", "friend", "buddy"]
    channel: Literal["friend", "buddy"]
    content: str
    timestamp: int
    translationJa: str | None = None
    recommendedReplyEn: str | None = None
    recommendedReplyJa: str | None = None


class ConversationRequest(BaseModel):
    type: Literal["opening", "message"]
    conversationMode: Literal["ai", "real"] = "ai"
    scenarioId: Literal["casual", "cafe", "bar", "sns"] = "sns"
    friendType: str | None = None
    realFriendId: str | None = None
    buddyType: str = DEFAULT_BUDDY_TYPE
    aiModel: Literal["qwen", "claude"] = "qwen"
    character: Literal["friend", "buddy"] | None = None
    mode: Literal["consult", "feedback", "support", "translate"] | None = None
    englishText: str | None = None
    messages: list[MessagePayload] | None = Field(default=None)


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


class RealFriendCreateRequest(BaseModel):
    id: str | None = None
    label: str
    age: int = Field(ge=1, le=120)
    nationality: str = ""
    gender: str = ""
    sourceApp: str = ""
    bio: str = ""
    notes: str = ""


class RealFriendUpdateRequest(BaseModel):
    label: str
    age: int = Field(ge=1, le=120)
    nationality: str = ""
    gender: str = ""
    sourceApp: str = ""
    bio: str = ""
    notes: str = ""


class RealFriendMessagesRequest(BaseModel):
    messages: list[MessagePayload]


class RealFriendDefaultPhotoRequest(BaseModel):
    photoId: str


class UserLoginRequest(BaseModel):
    userId: str


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


@app.get("/friend-types")
def public_list_friend_types() -> dict[str, Any]:
    return {"friendTypes": list_friend_types(include_disabled=False)}


@app.get("/buddy-types")
def public_list_buddy_types() -> dict[str, Any]:
    return {"buddyTypes": list_buddy_types(include_disabled=False)}


@app.post("/users/login")
def public_login_user(request: UserLoginRequest) -> dict[str, Any]:
    try:
        return login_user(user_id=request.userId)
    except InvalidUserIdError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error in user login")
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
def conversation(request: ConversationRequest) -> dict[str, Any]:
    if request.conversationMode == "ai":
        if not request.friendType:
            raise HTTPException(status_code=400, detail="friendType is required for AI mode")
        valid_friend = is_valid_friend_type(request.friendType)
        if not valid_friend:
            raise HTTPException(status_code=400, detail=f"Unknown friendType: {request.friendType}")
    if not is_valid_buddy_type(request.buddyType):
        raise HTTPException(status_code=400, detail=f"Unknown buddyType: {request.buddyType}")

    body: dict[str, Any] = request.model_dump(exclude_none=True)

    try:
        return handle_conversation_request(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled error in conversation handler")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.get("/real-friends")
def public_list_real_friends() -> dict[str, Any]:
    return {"realFriends": list_real_friends()}


@app.post("/real-friends")
def public_create_real_friend(request: RealFriendCreateRequest) -> dict[str, Any]:
    try:
        return create_real_friend(
            friend_id=request.id,
            label=request.label,
            age=request.age,
            nationality=request.nationality,
            gender=request.gender,
            source_app=request.sourceApp,
            bio=request.bio,
            notes=request.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/real-friends/{friend_id}")
def public_get_real_friend(friend_id: str) -> dict[str, Any]:
    try:
        return get_real_friend_detail(friend_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put("/real-friends/{friend_id}")
def public_update_real_friend(friend_id: str, request: RealFriendUpdateRequest) -> dict[str, Any]:
    try:
        return update_real_friend(
            friend_id,
            label=request.label,
            age=request.age,
            nationality=request.nationality,
            gender=request.gender,
            source_app=request.sourceApp,
            bio=request.bio,
            notes=request.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/real-friends/{friend_id}")
def public_delete_real_friend(friend_id: str) -> dict[str, Any]:
    try:
        delete_real_friend(friend_id)
        return {"ok": True}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/real-friends/{friend_id}/messages")
def public_get_real_friend_messages(friend_id: str) -> dict[str, Any]:
    try:
        return get_real_friend_messages(friend_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put("/real-friends/{friend_id}/messages")
def public_put_real_friend_messages(friend_id: str, request: RealFriendMessagesRequest) -> dict[str, Any]:
    try:
        return put_real_friend_messages(
            friend_id,
            [message.model_dump() for message in request.messages],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/real-friends/{friend_id}/photos")
def public_get_real_friend_photos(friend_id: str) -> dict[str, Any]:
    try:
        return get_real_friend_photos(friend_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/real-friends/{friend_id}/photos")
async def public_upload_real_friend_photo(
    friend_id: str,
    file: UploadFile = File(...),
) -> dict[str, Any]:
    try:
        content = await file.read()
        content_type = file.content_type or "application/octet-stream"
        return upload_real_friend_photo(friend_id, content, content_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put("/real-friends/{friend_id}/photos/default")
def public_set_real_friend_default_photo(
    friend_id: str,
    request: RealFriendDefaultPhotoRequest,
) -> dict[str, Any]:
    try:
        return set_real_friend_default_photo(friend_id, request.photoId)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/real-friends/{friend_id}/photos/{photo_id}")
def public_delete_real_friend_photo(friend_id: str, photo_id: str) -> dict[str, Any]:
    try:
        return delete_real_friend_photo(friend_id, photo_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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
