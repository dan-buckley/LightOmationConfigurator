"""
Module 1.2.1 — Segment Config Discovery

Provides CRUD for named segment configurations per light, plus a scan endpoint
that discovers unique segment layouts from an imported presets.json.
"""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import (
    ImportedFile,
    Light,
    LightSegmentConfig,
    LightSegmentConfigEntry,
    MasterPreset,
)
from app.schemas import PaginatedResponse, SuccessResponse

router = APIRouter(tags=["segment-configs"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class SegmentConfigEntryIn(BaseModel):
    segment_index: int
    name: str | None = None
    start_led: int
    stop_led: int


class SegmentConfigIn(BaseModel):
    name: str
    entries: list[SegmentConfigEntryIn]


class SegmentConfigEntryOut(BaseModel):
    id: int
    segment_index: int
    name: str | None = None
    start_led: int
    stop_led: int

    model_config = ConfigDict(from_attributes=True)


class SegmentConfigOut(BaseModel):
    id: int
    light_id: int
    name: str
    source_import_id: int | None = None
    created_at: datetime
    entries: list[SegmentConfigEntryOut]

    model_config = ConfigDict(from_attributes=True)


class ScannedConfig(BaseModel):
    name: str
    entries: list[SegmentConfigEntryOut]
    persisted: bool
    config_id: int | None = None


class ScanResult(BaseModel):
    total_presets_scanned: int
    unique_configs_found: int
    new_configs_created: int
    configs: list[ScannedConfig]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _fingerprint(entries: list[tuple[int, int]]) -> str:
    """Canonical fingerprint for a segment layout: sorted list of (start, stop) pairs."""
    return json.dumps(sorted(entries))


def _existing_fingerprints(light_id: int, db: Session) -> dict[str, int]:
    """Return {fingerprint: config_id} for all existing configs of a light."""
    configs = (
        db.query(LightSegmentConfig)
        .options(selectinload(LightSegmentConfig.entries))
        .filter(LightSegmentConfig.light_id == light_id)
        .all()
    )
    result: dict[str, int] = {}
    for cfg in configs:
        fp = _fingerprint([(e.start_led, e.stop_led) for e in cfg.entries])
        result[fp] = cfg.id
    return result


def _scan_presets_json(raw: str) -> list[tuple[str, list[tuple[int, int]]]]:
    """
    Parse a WLED presets.json and return distinct segment layouts as
    [(preset_name, [(start, stop), ...]), ...] — deduplicated by fingerprint.
    Playlists and presets with no seg array are skipped.
    """
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []

    seen: dict[str, str] = {}  # fingerprint -> first preset name
    ordered: list[tuple[str, list[tuple[int, int]]]] = []

    for _key, preset in data.items():
        if not isinstance(preset, dict):
            continue
        # skip playlists
        if "playlist" in preset:
            continue
        seg_list = preset.get("seg")
        if not seg_list or not isinstance(seg_list, list):
            continue

        # collect active segments
        pairs: list[tuple[int, int]] = []
        for seg in seg_list:
            if not isinstance(seg, dict):
                continue
            # skip explicitly off segments
            if seg.get("on") is False:
                continue
            start = seg.get("start")
            stop = seg.get("stop")
            if start is None or stop is None:
                continue
            pairs.append((int(start), int(stop)))

        if not pairs:
            continue

        fp = _fingerprint(pairs)
        if fp in seen:
            continue

        name = preset.get("n") or f"Config {len(ordered) + 1}"
        seen[fp] = name
        ordered.append((name, pairs))

    return ordered


def _config_with_entries(config_id: int, db: Session) -> LightSegmentConfig:
    return (
        db.query(LightSegmentConfig)
        .options(selectinload(LightSegmentConfig.entries))
        .filter(LightSegmentConfig.id == config_id)
        .one()
    )


# ---------------------------------------------------------------------------
# CRUD routes  — mounted under /api/v1/lights/{light_id}/segment-configs
# ---------------------------------------------------------------------------


@router.get("/", response_model=PaginatedResponse[SegmentConfigOut])
def list_configs(light_id: int, db: Session = Depends(get_db)) -> PaginatedResponse[SegmentConfigOut]:
    light = db.query(Light).filter(Light.id == light_id).first()
    if not light:
        raise HTTPException(status_code=404, detail=f"Light {light_id} not found")
    configs = (
        db.query(LightSegmentConfig)
        .options(selectinload(LightSegmentConfig.entries))
        .filter(LightSegmentConfig.light_id == light_id)
        .order_by(LightSegmentConfig.created_at)
        .all()
    )
    items = [SegmentConfigOut.model_validate(c) for c in configs]
    return PaginatedResponse(items=items, total=len(items), page=1, page_size=len(items))


@router.post("/", response_model=SuccessResponse[SegmentConfigOut], status_code=201)
def create_config(
    light_id: int,
    body: SegmentConfigIn,
    db: Session = Depends(get_db),
) -> SuccessResponse[SegmentConfigOut]:
    light = db.query(Light).filter(Light.id == light_id).first()
    if not light:
        raise HTTPException(status_code=404, detail=f"Light {light_id} not found")

    existing = (
        db.query(LightSegmentConfig)
        .filter(LightSegmentConfig.light_id == light_id, LightSegmentConfig.name == body.name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"A config named '{body.name}' already exists for this light")

    cfg = LightSegmentConfig(light_id=light_id, name=body.name)
    db.add(cfg)
    db.flush()
    for entry in body.entries:
        db.add(
            LightSegmentConfigEntry(
                config_id=cfg.id,
                segment_index=entry.segment_index,
                name=entry.name,
                start_led=entry.start_led,
                stop_led=entry.stop_led,
            )
        )
    db.commit()
    return SuccessResponse(data=SegmentConfigOut.model_validate(_config_with_entries(cfg.id, db)))


@router.get("/{config_id}", response_model=SuccessResponse[SegmentConfigOut])
def get_config(
    light_id: int, config_id: int, db: Session = Depends(get_db)
) -> SuccessResponse[SegmentConfigOut]:
    cfg = (
        db.query(LightSegmentConfig)
        .options(selectinload(LightSegmentConfig.entries))
        .filter(LightSegmentConfig.id == config_id, LightSegmentConfig.light_id == light_id)
        .first()
    )
    if not cfg:
        raise HTTPException(status_code=404, detail=f"Segment config {config_id} not found for light {light_id}")
    return SuccessResponse(data=SegmentConfigOut.model_validate(cfg))


@router.put("/{config_id}", response_model=SuccessResponse[SegmentConfigOut])
def update_config(
    light_id: int,
    config_id: int,
    body: SegmentConfigIn,
    db: Session = Depends(get_db),
) -> SuccessResponse[SegmentConfigOut]:
    cfg = (
        db.query(LightSegmentConfig)
        .filter(LightSegmentConfig.id == config_id, LightSegmentConfig.light_id == light_id)
        .first()
    )
    if not cfg:
        raise HTTPException(status_code=404, detail=f"Segment config {config_id} not found for light {light_id}")

    # name uniqueness check (ignore self)
    conflict = (
        db.query(LightSegmentConfig)
        .filter(
            LightSegmentConfig.light_id == light_id,
            LightSegmentConfig.name == body.name,
            LightSegmentConfig.id != config_id,
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=409, detail=f"A config named '{body.name}' already exists for this light")

    cfg.name = body.name
    db.query(LightSegmentConfigEntry).filter(LightSegmentConfigEntry.config_id == config_id).delete()
    for entry in body.entries:
        db.add(
            LightSegmentConfigEntry(
                config_id=config_id,
                segment_index=entry.segment_index,
                name=entry.name,
                start_led=entry.start_led,
                stop_led=entry.stop_led,
            )
        )
    db.commit()
    return SuccessResponse(data=SegmentConfigOut.model_validate(_config_with_entries(config_id, db)))


@router.delete("/{config_id}", status_code=204)
def delete_config(
    light_id: int, config_id: int, db: Session = Depends(get_db)
) -> None:
    cfg = (
        db.query(LightSegmentConfig)
        .filter(LightSegmentConfig.id == config_id, LightSegmentConfig.light_id == light_id)
        .first()
    )
    if not cfg:
        raise HTTPException(status_code=404, detail=f"Segment config {config_id} not found for light {light_id}")

    # refuse if referenced by any master preset
    ref = db.query(MasterPreset).filter(MasterPreset.segment_config_id == config_id).first()
    if ref:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete: one or more master presets reference this config",
        )

    db.delete(cfg)
    db.commit()
