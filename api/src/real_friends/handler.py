from typing import Any

from .photos import (
    delete_friend_photo,
    list_friend_photos,
    set_default_friend_photo,
    upload_friend_photo,
)
from .storage import (
    create_profile,
    delete_profile,
    load_messages,
    load_profile,
    profile_to_detail,
    profile_to_list_item,
    save_messages,
    update_profile,
)


def list_real_friends() -> list[dict[str, Any]]:
    from .storage import list_real_friend_ids

    items: list[dict[str, Any]] = []
    for friend_id in list_real_friend_ids():
        spec = load_profile(friend_id)
        items.append(profile_to_list_item(spec))
    items.sort(key=lambda item: item.get("lastInteractionAt", ""), reverse=True)
    return items


def get_real_friend_detail(friend_id: str) -> dict[str, Any]:
    spec = load_profile(friend_id)
    return profile_to_detail(spec)


def create_real_friend(
    *,
    friend_id: str | None,
    label: str,
    age: int,
    nationality: str,
    gender: str,
    source_app: str,
    bio: str,
    notes: str,
) -> dict[str, Any]:
    spec = create_profile(
        friend_id=friend_id,
        label=label,
        age=age,
        nationality=nationality,
        gender=gender,
        source_app=source_app,
        bio=bio,
        notes=notes,
    )
    return profile_to_detail(spec)


def update_real_friend(
    friend_id: str,
    *,
    label: str,
    age: int,
    nationality: str,
    gender: str,
    source_app: str,
    bio: str,
    notes: str,
) -> dict[str, Any]:
    spec = update_profile(
        friend_id,
        label=label,
        age=age,
        nationality=nationality,
        gender=gender,
        source_app=source_app,
        bio=bio,
        notes=notes,
    )
    return profile_to_detail(spec)


def delete_real_friend(friend_id: str) -> None:
    delete_profile(friend_id)


def get_real_friend_messages(friend_id: str) -> dict[str, Any]:
    load_profile(friend_id)
    messages = load_messages(friend_id)
    return {"messages": messages}


def put_real_friend_messages(friend_id: str, messages: list[dict[str, Any]]) -> dict[str, Any]:
    load_profile(friend_id)
    saved = save_messages(friend_id, messages)
    return {"messages": saved}


def get_real_friend_photos(friend_id: str) -> dict[str, Any]:
    return {"photos": list_friend_photos(friend_id)}


def upload_real_friend_photo(friend_id: str, content: bytes, content_type: str) -> dict[str, Any]:
    photos = upload_friend_photo(friend_id, content, content_type)
    return {"photos": photos}


def set_real_friend_default_photo(friend_id: str, photo_id: str) -> dict[str, Any]:
    photos = set_default_friend_photo(friend_id, photo_id)
    return {"photos": photos}


def delete_real_friend_photo(friend_id: str, photo_id: str) -> dict[str, Any]:
    photos = delete_friend_photo(friend_id, photo_id)
    return {"photos": photos}
