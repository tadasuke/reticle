import json
import shutil
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

import yaml

from src.assets_paths import get_images_root

from .specs import DEFAULT_NEGATIVE_PROMPT, CharacterVisualSpec, validate_character_id

ImageKind = Literal["candidate", "stress-test", "reference"]


@dataclass
class StoredImageMeta:
    id: str
    kind: ImageKind
    filename: str
    model: str
    prompt: str
    created_at: str
    seed: int | None = None
    parent_id: str | None = None
    scene_id: str | None = None
    instruction: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


def get_assets_root() -> Path:
    return get_images_root()


def get_character_dir(character_id: str) -> Path:
    return get_assets_root() / character_id


def ensure_character_dirs(character_id: str) -> Path:
    char_dir = get_character_dir(character_id)
    (char_dir / "candidates").mkdir(parents=True, exist_ok=True)
    (char_dir / "stress-test").mkdir(parents=True, exist_ok=True)
    return char_dir


def _spec_path(character_id: str) -> Path:
    return get_character_dir(character_id) / "spec.yaml"


ID_PREFIX = "img-"
ID_WIDTH = 4


def list_character_ids() -> list[str]:
    root = get_assets_root()
    if not root.exists():
        return []
    ids: list[str] = []
    for path in sorted(root.iterdir()):
        if path.is_dir() and (path / "spec.yaml").exists():
            ids.append(path.name)
    return ids


def generate_character_id() -> str:
    existing = list_character_ids()
    max_num = 0
    for character_id in existing:
        if character_id.startswith(ID_PREFIX):
            suffix = character_id[len(ID_PREFIX) :]
            if suffix.isdigit():
                max_num = max(max_num, int(suffix))
    return f"{ID_PREFIX}{max_num + 1:0{ID_WIDTH}d}"


def load_spec(character_id: str) -> CharacterVisualSpec:
    character_id = validate_character_id(character_id)
    path = _spec_path(character_id)
    if not path.exists():
        raise ValueError(f"Character not found: {character_id}")

    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    return CharacterVisualSpec(
        character_id=character_id,
        label=str(data.get("label", character_id)).strip() or character_id,
        visual_anchor=str(data.get("visual_anchor", "")).strip(),
        must_avoid=str(data.get("must_avoid", "")).strip(),
        negative_prompt=str(data.get("negative_prompt", DEFAULT_NEGATIVE_PROMPT)).strip(),
    )


def save_spec(
    character_id: str,
    *,
    visual_anchor: str,
    must_avoid: str,
    negative_prompt: str,
) -> CharacterVisualSpec:
    character_id = validate_character_id(character_id)
    ensure_character_dirs(character_id)
    spec = CharacterVisualSpec(
        character_id=character_id,
        label=character_id,
        visual_anchor=visual_anchor.strip(),
        must_avoid=must_avoid.strip(),
        negative_prompt=negative_prompt.strip() or DEFAULT_NEGATIVE_PROMPT,
    )
    data = {
        "id": spec.character_id,
        "label": spec.label,
        "visual_anchor": spec.visual_anchor,
        "must_avoid": spec.must_avoid,
        "negative_prompt": spec.negative_prompt,
    }
    with _spec_path(character_id).open("w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
    return spec


def create_character(
    *,
    visual_anchor: str,
    must_avoid: str = "",
    negative_prompt: str = DEFAULT_NEGATIVE_PROMPT,
) -> CharacterVisualSpec:
    if not visual_anchor.strip():
        raise ValueError("visual_anchor is required")
    character_id = generate_character_id()
    while _spec_path(character_id).exists():
        suffix = character_id[len(ID_PREFIX) :]
        next_num = int(suffix) + 1 if suffix.isdigit() else 1
        character_id = f"{ID_PREFIX}{next_num:0{ID_WIDTH}d}"
    return save_spec(
        character_id,
        visual_anchor=visual_anchor,
        must_avoid=must_avoid,
        negative_prompt=negative_prompt,
    )


def _meta_path_for_file(image_path: Path) -> Path:
    return image_path.with_suffix(".meta.json")


def _read_meta(image_path: Path) -> StoredImageMeta | None:
    meta_path = _meta_path_for_file(image_path)
    if not meta_path.exists():
        return None
    with meta_path.open(encoding="utf-8") as f:
        data = json.load(f)
    return StoredImageMeta(**data)


def _write_meta(image_path: Path, meta: StoredImageMeta) -> None:
    with _meta_path_for_file(image_path).open("w", encoding="utf-8") as f:
        json.dump(meta.to_dict(), f, ensure_ascii=False, indent=2)


def _image_url_path(character_id: str, kind: ImageKind, filename: str) -> str:
    if kind == "reference":
        return f"/media/images/{character_id}/{filename}"
    subdir = "candidates" if kind == "candidate" else "stress-test"
    return f"/media/images/{character_id}/{subdir}/{filename}"


def _gallery_entry(character_id: str, image_path: Path, kind: ImageKind) -> dict[str, Any]:
    meta = _read_meta(image_path)
    if meta is None:
        meta = StoredImageMeta(
            id=image_path.stem,
            kind=kind,
            filename=image_path.name,
            model="unknown",
            prompt="",
            created_at=datetime.fromtimestamp(image_path.stat().st_mtime, tz=timezone.utc).isoformat(),
        )
    return {
        **meta.to_dict(),
        "url": _image_url_path(character_id, kind, image_path.name),
    }


def list_gallery_images(character_id: str) -> list[dict[str, Any]]:
    char_dir = ensure_character_dirs(character_id)
    entries: list[dict[str, Any]] = []

    for subdir, kind in [("candidates", "candidate"), ("stress-test", "stress-test")]:
        folder = char_dir / subdir
        if not folder.exists():
            continue
        for image_path in sorted(folder.glob("*.png"), key=lambda p: p.stat().st_mtime, reverse=True):
            entries.append(_gallery_entry(character_id, image_path, kind))  # type: ignore[arg-type]

    entries.sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return entries


def get_reference_info(character_id: str) -> dict[str, Any] | None:
    char_dir = get_character_dir(character_id)
    ref_path = char_dir / "reference.png"
    if not ref_path.exists():
        return None

    meta_path = char_dir / "reference.meta.json"
    meta: dict[str, Any] = {}
    if meta_path.exists():
        with meta_path.open(encoding="utf-8") as f:
            meta = json.load(f)

    return {
        "id": "reference",
        "kind": "reference",
        "filename": "reference.png",
        "url": _image_url_path(character_id, "reference", "reference.png"),
        **meta,
    }


def resolve_image_path(character_id: str, image_id: str) -> tuple[Path, ImageKind]:
    char_dir = get_character_dir(character_id)

    for subdir, kind in [("candidates", "candidate"), ("stress-test", "stress-test")]:
        path = char_dir / subdir / f"{image_id}.png"
        if path.exists():
            return path, kind  # type: ignore[return-value]

    ref_path = char_dir / "reference.png"
    if image_id == "reference" and ref_path.exists():
        return ref_path, "reference"

    raise ValueError(f"Image not found: {image_id}")


def save_generated_image(
    character_id: str,
    *,
    kind: ImageKind,
    image_bytes: bytes,
    model: str,
    prompt: str,
    seed: int | None = None,
    parent_id: str | None = None,
    scene_id: str | None = None,
    instruction: str | None = None,
) -> dict[str, Any]:
    char_dir = ensure_character_dirs(character_id)
    subdir = "candidates" if kind == "candidate" else "stress-test"
    image_id = f"{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}_{uuid4().hex[:8]}"
    filename = f"{image_id}.png"
    image_path = char_dir / subdir / filename
    image_path.write_bytes(image_bytes)

    meta = StoredImageMeta(
        id=image_id,
        kind=kind,
        filename=filename,
        model=model,
        prompt=prompt,
        created_at=datetime.now(timezone.utc).isoformat(),
        seed=seed,
        parent_id=parent_id,
        scene_id=scene_id,
        instruction=instruction,
    )
    _write_meta(image_path, meta)
    return _gallery_entry(character_id, image_path, kind)


def adopt_image(character_id: str, source_image_id: str) -> dict[str, Any]:
    source_path, kind = resolve_image_path(character_id, source_image_id)
    char_dir = ensure_character_dirs(character_id)
    ref_path = char_dir / "reference.png"

    shutil.copy2(source_path, ref_path)

    source_meta = _read_meta(source_path)
    adopted_at = datetime.now(timezone.utc).isoformat()
    ref_meta = {
        "adopted_at": adopted_at,
        "source_image_id": source_image_id,
        "source_kind": kind,
    }
    if source_meta:
        ref_meta.update(
            {
                "model": source_meta.model,
                "prompt": source_meta.prompt,
                "seed": source_meta.seed,
                "parent_id": source_meta.parent_id,
            }
        )

    with (char_dir / "reference.meta.json").open("w", encoding="utf-8") as f:
        json.dump(ref_meta, f, ensure_ascii=False, indent=2)

    return get_reference_info(character_id)  # type: ignore[return-value]


def count_candidates(character_id: str) -> int:
    folder = get_character_dir(character_id) / "candidates"
    if not folder.exists():
        return 0
    return len(list(folder.glob("*.png")))
