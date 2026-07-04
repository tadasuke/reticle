from pathlib import Path
from typing import Any

from .specs import PHOTO_ID_PREFIX, PHOTO_ID_WIDTH, RealFriendPhotoSpec, validate_real_friend_id
from .storage import (
    _now_iso,
    get_real_friend_dir,
    load_profile,
    photo_public_url,
    photos_to_api_list,
    save_profile,
)

PHOTOS_DIRNAME = "photos"
MAX_PHOTO_BYTES = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
CONTENT_TYPE_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def _photos_dir(friend_id: str) -> Path:
    return get_real_friend_dir(friend_id) / PHOTOS_DIRNAME


def _generate_photo_id(existing_ids: set[str]) -> str:
    max_num = 0
    for photo_id in existing_ids:
        if photo_id.startswith(PHOTO_ID_PREFIX):
            suffix = photo_id[len(PHOTO_ID_PREFIX) :]
            if suffix.isdigit():
                max_num = max(max_num, int(suffix))
    return f"{PHOTO_ID_PREFIX}{max_num + 1:0{PHOTO_ID_WIDTH}d}"


def _detect_extension(content: bytes, content_type: str) -> str:
    ext = CONTENT_TYPE_TO_EXT.get(content_type.strip().lower())
    if ext:
        return ext

    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return ".webp"
    raise ValueError("Unsupported image format. Use JPEG, PNG, or WebP.")


def list_friend_photos(friend_id: str) -> list[dict[str, Any]]:
    spec = load_profile(friend_id)
    return photos_to_api_list(spec)


def upload_friend_photo(friend_id: str, content: bytes, content_type: str) -> list[dict[str, Any]]:
    friend_id = validate_real_friend_id(friend_id)
    if not content:
        raise ValueError("Empty file")
    if len(content) > MAX_PHOTO_BYTES:
        raise ValueError("Image must be 5MB or smaller")

    ext = _detect_extension(content, content_type)
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported image format. Use JPEG, PNG, or WebP.")

    spec = load_profile(friend_id)
    photos = list(spec.photos or [])
    photo_id = _generate_photo_id({photo.id for photo in photos})
    filename = f"{photo_id}{ext}"

    photos_dir = _photos_dir(friend_id)
    photos_dir.mkdir(parents=True, exist_ok=True)
    target = photos_dir / filename
    target.write_bytes(content)

    new_photo = RealFriendPhotoSpec(id=photo_id, filename=filename, created_at=_now_iso())
    photos.append(new_photo)
    default_photo_id = spec.default_photo_id or photo_id

    save_profile(
        spec.__class__(
            id=spec.id,
            label=spec.label,
            age=spec.age,
            nationality=spec.nationality,
            gender=spec.gender,
            source_app=spec.source_app,
            bio=spec.bio,
            notes=spec.notes,
            created_at=spec.created_at,
            updated_at=_now_iso(),
            last_interaction_at=spec.last_interaction_at,
            photos=photos,
            default_photo_id=default_photo_id,
        )
    )
    updated = load_profile(friend_id)
    return photos_to_api_list(updated)


def set_default_friend_photo(friend_id: str, photo_id: str) -> list[dict[str, Any]]:
    friend_id = validate_real_friend_id(friend_id)
    photo_id = photo_id.strip()
    if not photo_id:
        raise ValueError("photoId is required")

    spec = load_profile(friend_id)
    photos = list(spec.photos or [])
    if not any(photo.id == photo_id for photo in photos):
        raise ValueError(f"Photo not found: {photo_id}")

    save_profile(
        spec.__class__(
            id=spec.id,
            label=spec.label,
            age=spec.age,
            nationality=spec.nationality,
            gender=spec.gender,
            source_app=spec.source_app,
            bio=spec.bio,
            notes=spec.notes,
            created_at=spec.created_at,
            updated_at=_now_iso(),
            last_interaction_at=spec.last_interaction_at,
            photos=photos,
            default_photo_id=photo_id,
        )
    )
    updated = load_profile(friend_id)
    return photos_to_api_list(updated)


def delete_friend_photo(friend_id: str, photo_id: str) -> list[dict[str, Any]]:
    friend_id = validate_real_friend_id(friend_id)
    photo_id = photo_id.strip()
    if not photo_id:
        raise ValueError("photoId is required")

    spec = load_profile(friend_id)
    photos = list(spec.photos or [])
    target = next((photo for photo in photos if photo.id == photo_id), None)
    if target is None:
        raise ValueError(f"Photo not found: {photo_id}")

    file_path = _photos_dir(friend_id) / target.filename
    if file_path.exists():
        file_path.unlink()

    remaining = [photo for photo in photos if photo.id != photo_id]
    default_photo_id = spec.default_photo_id
    if default_photo_id == photo_id:
        default_photo_id = remaining[0].id if remaining else None

    save_profile(
        spec.__class__(
            id=spec.id,
            label=spec.label,
            age=spec.age,
            nationality=spec.nationality,
            gender=spec.gender,
            source_app=spec.source_app,
            bio=spec.bio,
            notes=spec.notes,
            created_at=spec.created_at,
            updated_at=_now_iso(),
            last_interaction_at=spec.last_interaction_at,
            photos=remaining,
            default_photo_id=default_photo_id,
        )
    )
    updated = load_profile(friend_id)
    return photos_to_api_list(updated)
