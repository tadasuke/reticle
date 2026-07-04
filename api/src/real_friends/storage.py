import json
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml

from src.assets_paths import get_real_friends_root

from .specs import (
    ID_PREFIX,
    ID_WIDTH,
    RealFriendPhotoSpec,
    RealFriendProfileSpec,
    build_subtitle,
    validate_real_friend_id,
)

PROFILE_FILENAME = "profile.yaml"
MESSAGES_FILENAME = "messages.json"
PHOTOS_DIRNAME = "photos"


def get_real_friend_dir(friend_id: str) -> Path:
    return get_real_friends_root() / friend_id


def _profile_path(friend_id: str) -> Path:
    return get_real_friend_dir(friend_id) / PROFILE_FILENAME


def _messages_path(friend_id: str) -> Path:
    return get_real_friend_dir(friend_id) / MESSAGES_FILENAME


def _now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def photo_public_url(friend_id: str, filename: str) -> str:
    return f"/media/real-friends/{friend_id}/{PHOTOS_DIRNAME}/{filename}"


def _parse_photos(data: dict[str, Any]) -> list[RealFriendPhotoSpec]:
    raw_photos = data.get("photos", [])
    if not isinstance(raw_photos, list):
        return []

    photos: list[RealFriendPhotoSpec] = []
    for item in raw_photos:
        if not isinstance(item, dict):
            continue
        photo_id = str(item.get("id", "")).strip()
        filename = str(item.get("filename", "")).strip()
        if not photo_id or not filename:
            continue
        created_at = str(item.get("createdAt", "")).strip() or _now_iso()
        photos.append(RealFriendPhotoSpec(id=photo_id, filename=filename, created_at=created_at))
    return photos


def _resolve_default_photo_id(photos: list[RealFriendPhotoSpec], default_photo_id: str | None) -> str | None:
    if not photos:
        return None
    if default_photo_id and any(photo.id == default_photo_id for photo in photos):
        return default_photo_id
    return photos[0].id


def _avatar_url(spec: RealFriendProfileSpec) -> str | None:
    photos = spec.photos or []
    if not photos:
        return None
    default_id = _resolve_default_photo_id(photos, spec.default_photo_id)
    target = next((photo for photo in photos if photo.id == default_id), photos[0])
    return photo_public_url(spec.id, target.filename)


def photos_to_api_list(spec: RealFriendProfileSpec) -> list[dict[str, Any]]:
    photos = spec.photos or []
    default_id = _resolve_default_photo_id(photos, spec.default_photo_id)
    return [
        {
            "id": photo.id,
            "url": photo_public_url(spec.id, photo.filename),
            "createdAt": photo.created_at,
            "isDefault": photo.id == default_id,
        }
        for photo in photos
    ]


def list_real_friend_ids() -> list[str]:
    root = get_real_friends_root()
    if not root.exists():
        return []
    ids: list[str] = []
    for path in sorted(root.iterdir()):
        if path.is_dir() and (path / PROFILE_FILENAME).exists():
            ids.append(path.name)
    return ids


def generate_real_friend_id() -> str:
    existing = set(list_real_friend_ids())
    max_num = 0
    for friend_id in existing:
        if friend_id.startswith(ID_PREFIX):
            suffix = friend_id[len(ID_PREFIX) :]
            if suffix.isdigit():
                max_num = max(max_num, int(suffix))
    return f"{ID_PREFIX}{max_num + 1:0{ID_WIDTH}d}"


def _parse_profile_data(friend_id: str, data: dict[str, Any]) -> RealFriendProfileSpec:
    label = str(data.get("label", "")).strip()
    if not label:
        raise ValueError("label is required")

    age_raw = data.get("age")
    if age_raw is None:
        raise ValueError("age is required")
    age = int(age_raw)
    if age < 1 or age > 120:
        raise ValueError("age must be between 1 and 120")

    nationality = str(data.get("nationality", "")).strip()
    gender = str(data.get("gender", "")).strip()
    source_app = str(data.get("sourceApp", "")).strip()
    bio = str(data.get("bio", "")).strip()
    notes = str(data.get("notes", "")).strip()
    created_at = str(data.get("createdAt", "")).strip() or _now_iso()
    updated_at = str(data.get("updatedAt", "")).strip() or created_at
    last_interaction_at = str(data.get("lastInteractionAt", "")).strip() or created_at
    photos = _parse_photos(data)
    default_photo_id_raw = data.get("defaultPhotoId")
    default_photo_id = str(default_photo_id_raw).strip() if default_photo_id_raw else None
    default_photo_id = _resolve_default_photo_id(photos, default_photo_id)

    return RealFriendProfileSpec(
        id=friend_id,
        label=label,
        age=age,
        nationality=nationality,
        gender=gender,
        source_app=source_app,
        bio=bio,
        notes=notes,
        created_at=created_at,
        updated_at=updated_at,
        last_interaction_at=last_interaction_at,
        photos=photos,
        default_photo_id=default_photo_id,
    )


def load_profile(friend_id: str) -> RealFriendProfileSpec:
    friend_id = validate_real_friend_id(friend_id)
    path = _profile_path(friend_id)
    if not path.exists():
        raise ValueError(f"Real friend not found: {friend_id}")

    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    return _parse_profile_data(friend_id, data)


def _profile_to_dict(spec: RealFriendProfileSpec) -> dict[str, Any]:
    result: dict[str, Any] = {
        "id": spec.id,
        "label": spec.label,
        "age": spec.age,
        "nationality": spec.nationality,
        "gender": spec.gender,
        "sourceApp": spec.source_app,
        "bio": spec.bio,
        "notes": spec.notes,
        "createdAt": spec.created_at,
        "updatedAt": spec.updated_at,
        "lastInteractionAt": spec.last_interaction_at or spec.created_at,
    }
    photos = spec.photos or []
    if photos:
        result["photos"] = [
            {"id": photo.id, "filename": photo.filename, "createdAt": photo.created_at}
            for photo in photos
        ]
    if spec.default_photo_id:
        result["defaultPhotoId"] = spec.default_photo_id
    return result


def save_profile(spec: RealFriendProfileSpec) -> RealFriendProfileSpec:
    friend_id = validate_real_friend_id(spec.id)
    friend_dir = get_real_friend_dir(friend_id)
    friend_dir.mkdir(parents=True, exist_ok=True)

    with _profile_path(friend_id).open("w", encoding="utf-8") as f:
        yaml.dump(
            _profile_to_dict(spec),
            f,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
        )
    return spec


def create_profile(
    *,
    friend_id: str | None,
    label: str,
    age: int,
    nationality: str = "",
    gender: str = "",
    source_app: str = "",
    bio: str = "",
    notes: str = "",
) -> RealFriendProfileSpec:
    resolved_id = (
        validate_real_friend_id(friend_id.strip()) if friend_id and friend_id.strip() else generate_real_friend_id()
    )
    while _profile_path(resolved_id).exists():
        if friend_id and friend_id.strip():
            raise ValueError(f"Real friend already exists: {resolved_id}")
        suffix = resolved_id[len(ID_PREFIX) :]
        next_num = int(suffix) + 1 if suffix.isdigit() else 1
        resolved_id = f"{ID_PREFIX}{next_num:0{ID_WIDTH}d}"

    now = _now_iso()
    spec = _parse_profile_data(
        resolved_id,
        {
            "label": label,
            "age": age,
            "nationality": nationality,
            "gender": gender,
            "sourceApp": source_app,
            "bio": bio,
            "notes": notes,
            "createdAt": now,
            "updatedAt": now,
            "lastInteractionAt": now,
        },
    )
    saved = save_profile(spec)
    save_messages(resolved_id, [])
    return saved


def update_profile(
    friend_id: str,
    *,
    label: str,
    age: int,
    nationality: str = "",
    gender: str = "",
    source_app: str = "",
    bio: str = "",
    notes: str = "",
) -> RealFriendProfileSpec:
    friend_id = validate_real_friend_id(friend_id)
    if not _profile_path(friend_id).exists():
        raise ValueError(f"Real friend not found: {friend_id}")

    existing = load_profile(friend_id)
    spec = _parse_profile_data(
        friend_id,
        {
            "label": label,
            "age": age,
            "nationality": nationality,
            "gender": gender,
            "sourceApp": source_app,
            "bio": bio,
            "notes": notes,
            "createdAt": existing.created_at,
            "updatedAt": _now_iso(),
            "lastInteractionAt": existing.last_interaction_at or existing.created_at,
            "photos": [
                {"id": photo.id, "filename": photo.filename, "createdAt": photo.created_at}
                for photo in (existing.photos or [])
            ],
            "defaultPhotoId": existing.default_photo_id,
        },
    )
    return save_profile(spec)


def delete_profile(friend_id: str) -> None:
    friend_id = validate_real_friend_id(friend_id)
    friend_dir = get_real_friend_dir(friend_id)
    if not friend_dir.exists():
        raise ValueError(f"Real friend not found: {friend_id}")

    shutil.rmtree(friend_dir)


def _friend_channel_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [message for message in messages if message.get("channel") == "friend"]


def _last_friend_message(messages: list[dict[str, Any]]) -> dict[str, str] | None:
    for message in reversed(_friend_channel_messages(messages)):
        speaker = message.get("speaker")
        if speaker not in ("user", "friend"):
            continue
        content = str(message.get("content", "")).strip()
        if content:
            return {"preview": content[:80], "speaker": speaker}
    return None


def load_messages(friend_id: str) -> list[dict[str, Any]]:
    friend_id = validate_real_friend_id(friend_id)
    if not _profile_path(friend_id).exists():
        raise ValueError(f"Real friend not found: {friend_id}")

    path = _messages_path(friend_id)
    if not path.exists():
        return []

    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    messages = data.get("messages", [])
    if not isinstance(messages, list):
        raise ValueError("messages must be an array")
    return messages


def _last_interaction_at(messages: list[dict[str, Any]], fallback: str) -> str:
    timestamps = [
        int(message.get("timestamp", 0))
        for message in _friend_channel_messages(messages)
        if message.get("timestamp")
    ]
    if not timestamps:
        return fallback
    return datetime.fromtimestamp(max(timestamps) / 1000, tz=UTC).replace(microsecond=0).isoformat()


def save_messages(friend_id: str, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    friend_id = validate_real_friend_id(friend_id)
    if not _profile_path(friend_id).exists():
        raise ValueError(f"Real friend not found: {friend_id}")

    friend_dir = get_real_friend_dir(friend_id)
    friend_dir.mkdir(parents=True, exist_ok=True)

    with _messages_path(friend_id).open("w", encoding="utf-8") as f:
        json.dump({"messages": messages}, f, ensure_ascii=False, indent=2)

    profile = load_profile(friend_id)
    last_interaction = _last_interaction_at(messages, profile.last_interaction_at or profile.created_at)
    save_profile(
        RealFriendProfileSpec(
            id=profile.id,
            label=profile.label,
            age=profile.age,
            nationality=profile.nationality,
            gender=profile.gender,
            source_app=profile.source_app,
            bio=profile.bio,
            notes=profile.notes,
            created_at=profile.created_at,
            updated_at=_now_iso(),
            last_interaction_at=last_interaction,
            photos=profile.photos,
            default_photo_id=profile.default_photo_id,
        )
    )
    return messages


def profile_to_list_item(spec: RealFriendProfileSpec, messages: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    if messages is None:
        try:
            messages = load_messages(spec.id)
        except ValueError:
            messages = []

    last_friend = _last_friend_message(messages)

    return {
        "id": spec.id,
        "label": spec.label,
        "subtitle": build_subtitle(spec.age, spec.nationality, spec.gender, spec.source_app),
        "age": spec.age,
        "nationality": spec.nationality,
        "gender": spec.gender,
        "sourceApp": spec.source_app,
        "bio": spec.bio,
        "notes": spec.notes,
        "createdAt": spec.created_at,
        "updatedAt": spec.updated_at,
        "lastInteractionAt": _last_interaction_at(messages, spec.last_interaction_at or spec.created_at),
        "lastMessagePreview": last_friend["preview"] if last_friend else None,
        "lastMessageSpeaker": last_friend["speaker"] if last_friend else None,
        "messageCount": len(messages),
        "avatarUrl": _avatar_url(spec),
    }


def profile_to_detail(spec: RealFriendProfileSpec) -> dict[str, Any]:
    messages = load_messages(spec.id)
    return {
        **profile_to_list_item(spec, messages),
        "photos": photos_to_api_list(spec),
    }
