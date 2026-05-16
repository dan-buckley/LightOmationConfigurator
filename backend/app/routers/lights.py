import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, model_validator
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import ChangeLog, Light, LightSegment
from app.schemas import PaginatedResponse, SuccessResponse

router = APIRouter(tags=["lights"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class SegmentIn(BaseModel):
    name: str | None = None
    start_led: int
    stop_led: int

    @model_validator(mode="after")
    def validate_range(self) -> "SegmentIn":
        if self.start_led >= self.stop_led:
            raise ValueError("start_led must be less than stop_led")
        return self


class LightIn(BaseModel):
    name: str
    ip_address: str | None = None
    mdns: str | None = None
    firmware_version: str | None = None
    total_leds: int
    location: str | None = None
    notes: str | None = None


class SegmentOut(BaseModel):
    id: int
    segment_index: int
    name: str | None
    start_led: int
    stop_led: int

    model_config = ConfigDict(from_attributes=True)


class LightOut(BaseModel):
    id: int
    name: str
    ip_address: str | None = None
    mdns: str | None = None
    firmware_version: str | None = None
    total_leds: int | None = None
    location: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    segments: list[SegmentOut] = []
    import_count: int = 0
    assignment_count: int = 0
    generated_file_count: int = 0


class LightSummary(BaseModel):
    id: int
    name: str
    ip_address: str | None = None
    total_leds: int | None = None
    segment_count: int = 0


class SegmentsResult(BaseModel):
    segments: list[SegmentOut]
    warnings: list[str]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _load_light(db: Session, light_id: int) -> Light:
    light = (
        db.query(Light)
        .options(
            selectinload(Light.segments),
            selectinload(Light.imported_files),
            selectinload(Light.preset_assignments),
            selectinload(Light.generated_files),
        )
        .filter(Light.id == light_id)
        .first()
    )
    if not light:
        raise HTTPException(status_code=404, detail=f"Light {light_id} not found")
    return light


def _make_light_out(light: Light) -> LightOut:
    return LightOut(
        id=light.id,
        name=light.name,
        ip_address=light.ip_address,
        mdns=light.mdns,
        firmware_version=light.firmware_version,
        total_leds=light.total_leds,
        location=light.location,
        notes=light.notes,
        created_at=light.created_at,
        updated_at=light.updated_at,
        segments=sorted(
            [SegmentOut.model_validate(s) for s in light.segments],
            key=lambda s: s.segment_index,
        ),
        import_count=len(light.imported_files),
        assignment_count=len(light.preset_assignments),
        generated_file_count=len(light.generated_files),
    )


def _light_snapshot(light: Light) -> dict:
    return {
        "name": light.name,
        "ip_address": light.ip_address,
        "mdns": light.mdns,
        "firmware_version": light.firmware_version,
        "total_leds": light.total_leds,
        "location": light.location,
        "notes": light.notes,
    }


def _log_change(
    db: Session,
    entity_type: str,
    entity_id: int,
    change_type: str,
    before: dict | None = None,
    after: dict | None = None,
) -> None:
    db.add(
        ChangeLog(
            entity_type=entity_type,
            entity_id=entity_id,
            change_type=change_type,
            before_json=json.dumps(before) if before is not None else None,
            after_json=json.dumps(after) if after is not None else None,
        )
    )


def _check_segment_coverage(
    segments: list[SegmentIn], total_leds: int | None
) -> list[str]:
    warnings: list[str] = []
    if not segments:
        return warnings
    sorted_segs = sorted(segments, key=lambda s: s.start_led)
    for i in range(1, len(sorted_segs)):
        prev, curr = sorted_segs[i - 1], sorted_segs[i]
        if curr.start_led < prev.stop_led:
            warnings.append(
                f"Overlap: segment starting at LED {curr.start_led} overlaps "
                f"with previous segment (ends at {prev.stop_led})"
            )
    cursor = 0
    for seg in sorted_segs:
        if seg.start_led > cursor:
            warnings.append(
                f"Gap: LEDs {cursor}–{seg.start_led} are not covered by any segment"
            )
        cursor = max(cursor, seg.stop_led)
    if total_leds is not None and cursor < total_leds:
        warnings.append(
            f"Gap: LEDs {cursor}–{total_leds} are not covered by any segment"
        )
    return warnings


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/", response_model=PaginatedResponse[LightSummary])
def list_lights(db: Session = Depends(get_db)) -> PaginatedResponse[LightSummary]:
    lights = (
        db.query(Light).options(selectinload(Light.segments)).all()
    )
    items = [
        LightSummary(
            id=l.id,
            name=l.name,
            ip_address=l.ip_address,
            total_leds=l.total_leds,
            segment_count=len(l.segments),
        )
        for l in lights
    ]
    return PaginatedResponse(items=items, total=len(items), page=1, page_size=len(items))


@router.post("/", response_model=SuccessResponse[LightOut], status_code=201)
def create_light(
    body: LightIn, db: Session = Depends(get_db)
) -> SuccessResponse[LightOut]:
    if db.query(Light).filter(Light.name == body.name).first():
        raise HTTPException(
            status_code=409, detail=f"A light named '{body.name}' already exists"
        )
    light = Light(**body.model_dump())
    db.add(light)
    db.flush()
    _log_change(db, "light", light.id, "created", after=body.model_dump())
    db.commit()
    return SuccessResponse(data=_make_light_out(_load_light(db, light.id)))


@router.get("/{light_id}", response_model=SuccessResponse[LightOut])
def get_light(
    light_id: int, db: Session = Depends(get_db)
) -> SuccessResponse[LightOut]:
    return SuccessResponse(data=_make_light_out(_load_light(db, light_id)))


@router.put("/{light_id}", response_model=SuccessResponse[LightOut])
def update_light(
    light_id: int, body: LightIn, db: Session = Depends(get_db)
) -> SuccessResponse[LightOut]:
    light = _load_light(db, light_id)
    if db.query(Light).filter(Light.name == body.name, Light.id != light_id).first():
        raise HTTPException(
            status_code=409, detail=f"A light named '{body.name}' already exists"
        )
    before = _light_snapshot(light)
    for field, value in body.model_dump().items():
        setattr(light, field, value)
    light.updated_at = datetime.utcnow()
    _log_change(db, "light", light.id, "updated", before=before, after=body.model_dump())
    db.commit()
    return SuccessResponse(data=_make_light_out(_load_light(db, light_id)))


@router.delete("/{light_id}", response_model=SuccessResponse[dict])
def delete_light(
    light_id: int, db: Session = Depends(get_db)
) -> SuccessResponse[dict]:
    light = _load_light(db, light_id)
    before = _light_snapshot(light)
    _log_change(db, "light", light.id, "deleted", before=before)
    db.delete(light)
    db.commit()
    return SuccessResponse(data={"deleted_id": light_id})


@router.get("/{light_id}/segments", response_model=SuccessResponse[list[SegmentOut]])
def get_segments(
    light_id: int, db: Session = Depends(get_db)
) -> SuccessResponse[list[SegmentOut]]:
    light = _load_light(db, light_id)
    segments = sorted(
        [SegmentOut.model_validate(s) for s in light.segments],
        key=lambda s: s.segment_index,
    )
    return SuccessResponse(data=segments)


@router.put("/{light_id}/segments", response_model=SuccessResponse[SegmentsResult])
def replace_segments(
    light_id: int, body: list[SegmentIn], db: Session = Depends(get_db)
) -> SuccessResponse[SegmentsResult]:
    light = _load_light(db, light_id)
    warnings = _check_segment_coverage(body, light.total_leds)
    before_segs = [
        {
            "segment_index": s.segment_index,
            "name": s.name,
            "start_led": s.start_led,
            "stop_led": s.stop_led,
        }
        for s in sorted(light.segments, key=lambda s: s.segment_index)
    ]
    for seg in list(light.segments):
        db.delete(seg)
    db.flush()
    for index, seg in enumerate(body):
        db.add(
            LightSegment(
                light_id=light_id,
                segment_index=index,
                name=seg.name,
                start_led=seg.start_led,
                stop_led=seg.stop_led,
            )
        )
    after_segs = [
        {"segment_index": i, "name": s.name, "start_led": s.start_led, "stop_led": s.stop_led}
        for i, s in enumerate(body)
    ]
    _log_change(
        db,
        "light_segments",
        light_id,
        "updated",
        before={"segments": before_segs},
        after={"segments": after_segs},
    )
    db.commit()
    db.refresh(light)
    out_segments = sorted(
        [SegmentOut.model_validate(s) for s in light.segments],
        key=lambda s: s.segment_index,
    )
    return SuccessResponse(data=SegmentsResult(segments=out_segments, warnings=warnings))
