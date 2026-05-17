"""
Module 1.3 — Master Preset Library

Central store of reusable WLED preset templates. Source assets for the
transposition and generation engines (Modules 2.1 / 2.2).
"""
import json
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    ChangeLog,
    ImportedFile,
    Light,
    LightPresetAssignment,
    MasterPreset,
    PresetCategory,
)
from app.schemas import PaginatedResponse, SuccessResponse

router = APIRouter(tags=["presets"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Quick-label prefix pattern: optional digits + space at the start of a name,
# e.g. "01 Rainbow" → "Rainbow", "7 Fire 2" → "Fire 2", "All White" unchanged.
_QUICK_LABEL_RE = re.compile(r"^\d+\s+")


def _strip_prefix(name: str) -> str:
    return _QUICK_LABEL_RE.sub("", name).strip()


def _log(
    db: Session,
    entity_id: int,
    change_type: str,
    before: dict | None = None,
    after: dict | None = None,
) -> None:
    db.add(
        ChangeLog(
            entity_type="master_preset",
            entity_id=entity_id,
            change_type=change_type,
            before_json=json.dumps(before) if before is not None else None,
            after_json=json.dumps(after) if after is not None else None,
        )
    )


def _preset_snapshot(p: MasterPreset) -> dict:
    return {
        "name": p.name,
        "category_id": p.category_id,
        "segment_config_id": p.segment_config_id,
        "source_light_id": p.source_light_id,
        "source_preset_id": p.source_preset_id,
        "segment_group_hint": p.segment_group_hint,
        "notes": p.notes,
    }


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class PresetCategoryOut(BaseModel):
    id: int
    name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class MasterPresetOut(BaseModel):
    id: int
    name: str
    category_id: int | None = None
    category_name: str | None = None
    segment_config_id: int | None = None
    preset_data: str
    source_light_id: int | None = None
    source_light_name: str | None = None
    source_preset_id: int | None = None
    segment_group_hint: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_with_joins(cls, p: MasterPreset) -> "MasterPresetOut":
        return cls(
            id=p.id,
            name=p.name,
            category_id=p.category_id,
            category_name=p.category.name if p.category else None,
            segment_config_id=p.segment_config_id,
            preset_data=p.preset_data,
            source_light_id=p.source_light_id,
            source_light_name=p.source_light.name if p.source_light else None,
            source_preset_id=p.source_preset_id,
            segment_group_hint=p.segment_group_hint,
            notes=p.notes,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )


class MasterPresetIn(BaseModel):
    name: str
    category_id: int | None = None
    segment_config_id: int | None = None
    preset_data: str
    segment_group_hint: str | None = None
    notes: str | None = None


class MasterPresetUpdate(BaseModel):
    name: str | None = None
    category_id: int | None = None
    segment_config_id: int | None = None
    preset_data: str | None = None
    segment_group_hint: str | None = None
    notes: str | None = None


class BulkImportRequest(BaseModel):
    import_id: int
    preset_ids: list[int]          # numeric WLED preset IDs to import
    category_id: int | None = None
    strip_prefix: bool = True      # strip quick-label numeric prefix from names


class BulkImportResult(BaseModel):
    imported: int
    skipped_duplicates: int
    skipped_ids: list[int]          # WLED preset IDs that were skipped
    imported_preset_ids: list[int]  # DB ids of newly created MasterPreset rows


class DeleteResult(BaseModel):
    assignment_count: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/categories", response_model=list[PresetCategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(PresetCategory).order_by(PresetCategory.name).all()


@router.get("", response_model=PaginatedResponse[MasterPresetOut])
def list_presets(
    category_id: int | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(MasterPreset)
    if category_id is not None:
        q = q.filter(MasterPreset.category_id == category_id)
    if search:
        term = f"%{search}%"
        q = q.filter(
            or_(MasterPreset.name.ilike(term), MasterPreset.notes.ilike(term))
        )
    total = q.count()
    items = (
        q.order_by(MasterPreset.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedResponse(
        items=[MasterPresetOut.from_orm_with_joins(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=SuccessResponse[MasterPresetOut], status_code=201)
def create_preset(body: MasterPresetIn, db: Session = Depends(get_db)):
    if body.category_id is not None:
        if not db.get(PresetCategory, body.category_id):
            raise HTTPException(status_code=404, detail="Category not found")
    preset = MasterPreset(
        name=body.name,
        category_id=body.category_id,
        segment_config_id=body.segment_config_id,
        preset_data=body.preset_data,
        segment_group_hint=body.segment_group_hint,
        notes=body.notes,
    )
    db.add(preset)
    db.flush()
    _log(db, preset.id, "created", after=_preset_snapshot(preset))
    db.commit()
    db.refresh(preset)
    return SuccessResponse(data=MasterPresetOut.from_orm_with_joins(preset))


@router.get("/{preset_id}", response_model=SuccessResponse[MasterPresetOut])
def get_preset(preset_id: int, db: Session = Depends(get_db)):
    p = db.get(MasterPreset, preset_id)
    if not p:
        raise HTTPException(status_code=404, detail="Preset not found")
    return SuccessResponse(data=MasterPresetOut.from_orm_with_joins(p))


@router.put("/{preset_id}", response_model=SuccessResponse[MasterPresetOut])
def update_preset(
    preset_id: int, body: MasterPresetUpdate, db: Session = Depends(get_db)
):
    p = db.get(MasterPreset, preset_id)
    if not p:
        raise HTTPException(status_code=404, detail="Preset not found")
    if body.category_id is not None:
        if not db.get(PresetCategory, body.category_id):
            raise HTTPException(status_code=404, detail="Category not found")
    before = _preset_snapshot(p)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    p.updated_at = datetime.utcnow()
    _log(db, p.id, "updated", before=before, after=_preset_snapshot(p))
    db.commit()
    db.refresh(p)
    return SuccessResponse(data=MasterPresetOut.from_orm_with_joins(p))


@router.delete("/{preset_id}", response_model=SuccessResponse[DeleteResult])
def delete_preset(
    preset_id: int,
    force: bool = Query(False, description="Delete even if assignments exist"),
    db: Session = Depends(get_db),
):
    p = db.get(MasterPreset, preset_id)
    if not p:
        raise HTTPException(status_code=404, detail="Preset not found")
    assignment_count = (
        db.query(LightPresetAssignment)
        .filter(LightPresetAssignment.master_preset_id == preset_id)
        .count()
    )
    if assignment_count > 0 and not force:
        raise HTTPException(
            status_code=409,
            detail=f"Preset has {assignment_count} assignment(s). Use ?force=true to delete anyway.",
        )
    _log(db, p.id, "deleted", before=_preset_snapshot(p))
    db.delete(p)
    db.commit()
    return SuccessResponse(data=DeleteResult(assignment_count=assignment_count))


@router.post("/bulk-import", response_model=SuccessResponse[BulkImportResult], status_code=201)
def bulk_import(body: BulkImportRequest, db: Session = Depends(get_db)):
    imported_file = db.get(ImportedFile, body.import_id)
    if not imported_file:
        raise HTTPException(status_code=404, detail="Import record not found")
    if imported_file.file_type != "presets":
        raise HTTPException(status_code=422, detail="Import record must be file_type='presets'")

    try:
        raw = json.loads(imported_file.raw_json)
    except Exception:
        raise HTTPException(status_code=422, detail="Import file contains invalid JSON")

    light_id = imported_file.light_id

    # Build set of already-imported (source_light_id, source_preset_id) pairs
    existing_pairs: set[tuple[int, int]] = {
        (r.source_light_id, r.source_preset_id)
        for r in db.query(MasterPreset.source_light_id, MasterPreset.source_preset_id)
        .filter(MasterPreset.source_light_id == light_id)
        .all()
        if r.source_preset_id is not None
    }

    imported_ids: list[int] = []
    skipped_ids: list[int] = []

    for wled_id in body.preset_ids:
        str_id = str(wled_id)
        if str_id not in raw:
            skipped_ids.append(wled_id)
            continue
        preset_entry = raw[str_id]
        if not isinstance(preset_entry, dict):
            skipped_ids.append(wled_id)
            continue
        # Skip duplicates
        if (light_id, wled_id) in existing_pairs:
            skipped_ids.append(wled_id)
            continue

        raw_name = preset_entry.get("n", f"Preset {wled_id}")
        name = _strip_prefix(raw_name) if body.strip_prefix else raw_name

        preset = MasterPreset(
            name=name,
            category_id=body.category_id,
            preset_data=json.dumps(preset_entry),
            source_light_id=light_id,
            source_preset_id=wled_id,
        )
        db.add(preset)
        db.flush()
        _log(db, preset.id, "created", after=_preset_snapshot(preset))
        imported_ids.append(preset.id)
        existing_pairs.add((light_id, wled_id))

    db.commit()

    return SuccessResponse(
        data=BulkImportResult(
            imported=len(imported_ids),
            skipped_duplicates=len(skipped_ids),
            skipped_ids=skipped_ids,
            imported_preset_ids=imported_ids,
        )
    )
