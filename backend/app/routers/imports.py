import json
from datetime import datetime

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import ChangeLog, ImportedFile, Light, LightSegment, LightSegmentConfig, LightSegmentConfigEntry
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


class UploadResult(ImportDetail):
    light_created: bool = False


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


class ScannedConfigEntry(BaseModel):
    segment_index: int
    start_led: int
    stop_led: int


class ScannedConfig(BaseModel):
    name: str
    entries: list[ScannedConfigEntry]
    persisted: bool
    config_id: int | None = None


class ScanResult(BaseModel):
    total_presets_scanned: int
    unique_configs_found: int
    new_configs_created: int
    configs: list[ScannedConfig]


class ScanRequest(BaseModel):
    apply: bool = True


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


@router.post("/upload", response_model=SuccessResponse[UploadResult], status_code=201)
async def upload_file(
    light_id: int | None = Form(None),
    file_type: str = Form(...),
    file: UploadFile = ...,
    db: Session = Depends(get_db),
) -> SuccessResponse[UploadResult]:
    if file_type not in ("presets", "cfg"):
        raise HTTPException(
            status_code=422,
            detail="file_type must be 'presets' or 'cfg'",
        )

    # Read and validate file content upfront (stream can only be read once)
    raw = await file.read()
    try:
        raw_text = raw.decode("utf-8")
        data = json.loads(raw_text)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"File is not valid JSON: {exc}",
        )

    # Resolve (or auto-create) the light
    light_created = False
    if light_id is None:
        if file_type != "cfg":
            raise HTTPException(
                status_code=422,
                detail="light_id is required for presets imports",
            )
        try:
            auto_name: str = data["id"]["name"]
        except (KeyError, TypeError):
            raise HTTPException(
                status_code=422,
                detail="cfg.json is missing id.name — cannot auto-create light",
            )
        auto_total: int | None = data.get("hw", {}).get("led", {}).get("total")

        light = db.query(Light).filter(Light.name == auto_name).first()
        if not light:
            light = Light(name=auto_name, total_leds=auto_total)
            db.add(light)
            db.flush()
            _log_change(
                db,
                "light",
                light.id,
                "created",
                after={"name": auto_name, "total_leds": auto_total},
            )
            light_created = True
        light_id = light.id
    else:
        light = db.query(Light).filter(Light.id == light_id).first()
        if not light:
            raise HTTPException(status_code=404, detail=f"Light {light_id} not found")

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
    result = UploadResult(
        id=imp.id,
        light_id=imp.light_id,
        light_name=imp.light.name,
        file_type=imp.file_type,
        source=imp.source,
        imported_at=imp.imported_at,
        notes=imp.notes,
        raw_json=imp.raw_json,
        light_created=light_created,
    )
    return SuccessResponse(data=result)


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
        # replace reference segments
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

        # also write / update a named segment config "Hardware default"
        _upsert_hardware_default_config(db, light.id, imp.id, segments)

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


def _upsert_hardware_default_config(
    db: Session,
    light_id: int,
    import_id: int,
    segments: list[ExtractedSegment],
) -> LightSegmentConfig:
    """Create or replace the 'Hardware default' segment config for a light."""
    cfg = (
        db.query(LightSegmentConfig)
        .filter(LightSegmentConfig.light_id == light_id, LightSegmentConfig.name == "Hardware default")
        .first()
    )
    if cfg is None:
        cfg = LightSegmentConfig(light_id=light_id, name="Hardware default", source_import_id=import_id)
        db.add(cfg)
        db.flush()
    else:
        cfg.source_import_id = import_id
        db.query(LightSegmentConfigEntry).filter(LightSegmentConfigEntry.config_id == cfg.id).delete()

    for idx, seg in enumerate(segments):
        db.add(
            LightSegmentConfigEntry(
                config_id=cfg.id,
                segment_index=idx,
                name=seg.name,
                start_led=seg.start_led,
                stop_led=seg.stop_led,
            )
        )
    return cfg


# ---------------------------------------------------------------------------
# Segment scan helpers (presets.json)
# ---------------------------------------------------------------------------


def _fingerprint(pairs: list[tuple[int, int]]) -> str:
    return json.dumps(sorted(pairs))


def _existing_fingerprints(light_id: int, db: Session) -> dict[str, int]:
    from sqlalchemy.orm import selectinload as _sel
    configs = (
        db.query(LightSegmentConfig)
        .options(_sel(LightSegmentConfig.entries))
        .filter(LightSegmentConfig.light_id == light_id)
        .all()
    )
    result: dict[str, int] = {}
    for cfg in configs:
        fp = _fingerprint([(e.start_led, e.stop_led) for e in cfg.entries])
        result[fp] = cfg.id
    return result


def _scan_presets_json_raw(raw: str) -> list[tuple[str, list[tuple[int, int]]]]:
    """Return [(preset_name, [(start, stop), ...]), ...] for unique segment layouts."""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []

    seen: dict[str, str] = {}
    ordered: list[tuple[str, list[tuple[int, int]]]] = []

    for _key, preset in data.items():
        if not isinstance(preset, dict):
            continue
        if "playlist" in preset:
            continue
        seg_list = preset.get("seg")
        if not seg_list or not isinstance(seg_list, list):
            continue

        pairs: list[tuple[int, int]] = []
        for seg in seg_list:
            if not isinstance(seg, dict):
                continue
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


# ---------------------------------------------------------------------------
# Scan endpoint
# ---------------------------------------------------------------------------


@router.post("/{import_id}/scan-segments", response_model=SuccessResponse[ScanResult])
def scan_segments(
    import_id: int,
    body: ScanRequest,
    db: Session = Depends(get_db),
) -> SuccessResponse[ScanResult]:
    """
    Scan a presets.json import for unique segment configurations.
    When apply=True (default), persist any newly discovered configs.
    Idempotent: re-scanning the same file does not create duplicates.
    """
    imp = (
        db.query(ImportedFile)
        .options(selectinload(ImportedFile.light))
        .filter(ImportedFile.id == import_id)
        .first()
    )
    if not imp:
        raise HTTPException(status_code=404, detail=f"Import {import_id} not found")
    if imp.file_type != "presets":
        raise HTTPException(
            status_code=422,
            detail="scan-segments is only available for presets imports",
        )

    discovered = _scan_presets_json_raw(imp.raw_json)
    existing = _existing_fingerprints(imp.light_id, db)

    output_configs: list[ScannedConfig] = []
    new_count = 0

    for name, pairs in discovered:
        fp = _fingerprint(pairs)
        if fp in existing:
            # already known — return without creating
            output_configs.append(
                ScannedConfig(
                    name=name,
                    entries=[ScannedConfigEntry(segment_index=i, start_led=s, stop_led=e) for i, (s, e) in enumerate(pairs)],
                    persisted=True,
                    config_id=existing[fp],
                )
            )
            continue

        if body.apply:
            cfg = LightSegmentConfig(light_id=imp.light_id, name=name, source_import_id=import_id)
            db.add(cfg)
            db.flush()
            for idx, (start, stop) in enumerate(pairs):
                db.add(
                    LightSegmentConfigEntry(
                        config_id=cfg.id,
                        segment_index=idx,
                        start_led=start,
                        stop_led=stop,
                    )
                )
            existing[fp] = cfg.id
            new_count += 1
            output_configs.append(
                ScannedConfig(
                    name=name,
                    entries=[ScannedConfigEntry(segment_index=i, start_led=s, stop_led=e) for i, (s, e) in enumerate(pairs)],
                    persisted=True,
                    config_id=cfg.id,
                )
            )
        else:
            output_configs.append(
                ScannedConfig(
                    name=name,
                    entries=[ScannedConfigEntry(segment_index=i, start_led=s, stop_led=e) for i, (s, e) in enumerate(pairs)],
                    persisted=False,
                    config_id=None,
                )
            )

    if body.apply and new_count:
        db.commit()

    return SuccessResponse(
        data=ScanResult(
            total_presets_scanned=len(json.loads(imp.raw_json)) if imp.raw_json else 0,
            unique_configs_found=len(discovered),
            new_configs_created=new_count,
            configs=output_configs,
        )
    )
