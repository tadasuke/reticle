import os
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _resolve_assets_dir(env_key: str, default_relative: str) -> Path:
    env_path = os.environ.get(env_key, "").strip()
    if env_path:
        path = Path(env_path)
        if not path.is_absolute():
            path = _repo_root() / path
        return path.resolve()
    return (_repo_root() / default_relative).resolve()


def get_friends_root() -> Path:
    return _resolve_assets_dir("FRIEND_ASSETS_DIR", "assets/friends")


def get_buddies_root() -> Path:
    return _resolve_assets_dir("BUDDY_ASSETS_DIR", "assets/buddies")


def get_images_root() -> Path:
    return _resolve_assets_dir("IMAGE_ASSETS_DIR", "assets/images")
