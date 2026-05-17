import json
from datetime import datetime

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import ChangeLog, ImportedFile, Light, LightSegment
from app.schemas import PaginatedResponse, SuccessResponse

router = APIRouter(tags=["imports"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ImportOut(BaseModel):
    id: int
    light_id: int
    light_name: str
    file_type: str
    source: str
    imported_at: datetime
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ImportDetail(ImportOut):
    raw_json: str


class ExtractedSegment(BaseModel):
    name: str | None
    start_led: int
    stop_led: int


class ExtractPreview(BaseModel):
    total_leds: int | None
    segments: list[ExtractedSegment]
    applied: bool
    warnings: list[str]


class ExtractRequest(BaseModel):
    apply: bool = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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


def _make_import_out(imp: ImportedFile) -> ImportOut:
    return ImportOut(
        id=imp.id,
        light_id=imp.light_id,
        light_name=imp.light.name,
        file_type=imp.file_type,
        source=imp.source,
        imported_at=imp.imported_at,
        notes=imp.notes,
    )


def _make_import_detail(imp: ImportedFile) -> ImportDetail:
    return ImportDetail(
        id=imp.id,
        light_id=imp.light_id,
        light_name=imp.light.name,
        file_type=imp.file_type,
        source=imp.source,
        imported_at=imp.imported_at,
        notes=imp.notes,
        raw_json=imp.raw_json,
    )


def _parse_cfg_profile(raw: str) -> tuple[int | None, list[ExtractedSegment], list[str]]:
    """Extract total_leds and segments from a WLED cfg.json payload."""
    warnings: list[str] = []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None, [], ["raw_json is not valid JSON"]

    hw_led = data.get("hw", {}).get("led", {})
    total_leds: int | None = hw_led.get("total")

    ins = hw_led.get("ins", [])
    if not ins:
        warnings.append("No LED strip definitions (hw.led.ins) found in cfg.json")

    segments: list[ExtractedSegment] = []
    for i, strip in enumerate(ins):
        start = strip.get("start", 0)
        length = strip.get("len")
        if length is None:
            warnings.append(f"Strip {i} has no 'len' field; skipping")
            continue
        segments.append(
            ExtractedSegment(
                name=f"Strip {i + 1}" if len(ins) > 1 else None,
                start_led=start,
                stop_led=start + length,
            )
        )

    return total_leds, segments, warnings


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/upload", response_model=SuccessResponse[ImportDetail], status_code=201)
async def upload_file(
    light_id: int = Form(...),
    file_type: str = Form(...),
    file: UploadFile = ...,
    db: Session = Depends(get_db),
) -> SuccessResponse[ImportDetail]:
    if file_type not in ("presets", "cfg"):
        raise HTTPException(
            status_code=422,
            detail="file_type must be 'presets' or 'cfg'",
        )
    light = db.query(Light).filter(Light.id == light_id).first()
    if not light:
        raise HTTPException(status_code=404, detail=f"Light {light_id} not found")

    raw = await file.read()
    try:
        raw_text = raw.decode("utf-8")
        json.loads(raw_text)  # validate before writing
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"File is not valid JSON: {exc}",
        )

    imp = ImportedFile(
        light_id=light_id,
        file_type=file_type,
        raw_json=raw_text,
        source="manual",
    )
    db.add(imp)
    db.flush()
    _log_change(
        db,
        "imported_file",
        imp.id,
        "created",
        after={"light_id": light_id, "file_type": file_type, "source": "manual"},
    )
    db.commit()
    db.refresh(imp)
    # eager-load light for name
    imp = (
        db.query(ImportedFile)
        .options(selectinload(ImportedFile.light))
        .filter(ImportedFile.id == imp.id)
        .one()
    )
    return SuccessResponse(data=_make_import_detail(imp))


@router.post(
    "/network/{light_id}",
    response_model=SuccessResponse[ImportDetail],
    status_code=501,
)
def fetch_from_network(light_id: int) -> SuccessResponse[ImportDetail]:  # type: ignore[return]
    raise HTTPException(
        status_code=501,
        detail="Network fetch is not yet available (Module 3.2 — WLED Network Connector)",
    )


@router.get("/", response_model=PaginatedResponse[ImportOut])
def list_imports(
    light_id: int | None = None,
    db: Session = Depends(get_db),
) -> PaginatedResponse[ImportOut]:
    q = db.query(ImportedFile).options(selectinload(ImportedFile.light))
    if light_id is not None:
        q = q.filter(ImportedFile.light_id == light_id)
    records = q.order_by(ImportedFile.imported_at.desc()).all()
    items = [_make_import_out(r) for r in records]
    return PaginatedResponse(items=items, total=len(items), page=1, page_size=len(items))


@router.get("/{import_id}", response_model=SuccessResponse[ImportDetail])
def get_import(
    import_id: int, db: Session = Depends(get_db)
) -> SuccessResponse[ImportDetail]:
    imp = (
        db.query(ImportedFile)
        .options(selectinload(ImportedFile.light))
        .filter(ImportedFile.id == import_id)
        .first()
    )
    if not imp:
        raise HTTPException(status_code=404, detail=f"Import {import_id} not found")
    return SuccessResponse(data=_make_import_detail(imp))


@router.post("/{import_id}/extract-profile", response_model=SuccessResponse[ExtractPreview])
def extract_profile(
    import_id: int,
    body: ExtractRequest,
    db: Session = Depends(get_db),
) -> SuccessResponse[ExtractPreview]:
    imp = (
        db.query(ImportedFile)
        .options(selectinload(ImportedFile.light))
        .filter(ImportedFile.id == import_id)
        .first()
    )
    if not imp:
        raise HTTPException(status_code=404, detail=f"Import {import_id} not found")
    if imp.file_type != "cfg":
        raise HTTPException(
            status_code=422,
            detail="extract-profile is only available for cfg imports",
        )

    total_leds, segments, warnings = _parse_cfg_profile(imp.raw_json)
    applied = False

    if body.apply:
        light = imp.light
        before = {
            "total_leds": light.total_leds,
            "segments": [
                {"name": s.name, "start_led": s.start_led, "stop_led": s.stop_led}
                for s in light.segments
            ],
        }
        light.total_leds = total_leds
        light.updated_at = datetime.utcnow()
        # replace segments
        db.query(LightSegment).filter(LightSegment.light_id == light.id).delete()
        for idx, seg in enumerate(segments):
            db.add(
                LightSegment(
                    light_id=light.id,
                    segment_index=idx,
                    name=seg.name,
                    start_led=seg.start_led,
                    stop_led=seg.stop_led,
                )
            )
        after = {
            "total_leds": total_leds,
            "segments": [
                {"name": s.name, "start_led": s.start_led, "stop_led": s.stop_led}
                for s in segments
            ],
        }
        _log_change(db, "light", light.id, "updated", before=before, after=after)
        db.commit()
        applied = True

    return SuccessResponse(
        data=ExtractPreview(
            total_leds=total_leds,
            segments=segments,
            applied=applied,
            warnings=warnings,
        )
    )
