"""
Module 1.4 — Light Preset Assignments

Maps master presets onto a specific light: target preset ID, quick-label,
colour mode, sort order.  Feeds the generation engine (Module 2.2).
"""
import json
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChangeLog, Light, LightPresetAssignment, MasterPreset, PresetCategory
from app.schemas import SuccessResponse

router = APIRouter(tags=["assignments"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

COLOUR_MODES = {"source", "segment", "custom"}


def _log(
    db: Session,
    entity_id: int,
    change_type: str,
    before: dict | None = None,
    after: dict | None = None,
) -> None:
    db.add(
        ChangeLog(
            entity_type="light_preset_assignment",
            entity_id=entity_id,
            change_type=change_type,
            before_json=json.dumps(before) if before is not None else None,
            after_json=json.dumps(after) if after is not None else None,
        )
    )


def _snapshot(a: LightPresetAssignment) -> dict:
    return {
        "light_id": a.light_id,
        "master_preset_id": a.master_preset_id,
        "target_preset_id": a.target_preset_id,
        "target_quick_label": a.target_quick_label,
        "sort_order": a.sort_order,
        "colour_mode": a.colour_mode,
        "palette_override": a.palette_override,
        "colour_slots": a.colour_slots,
        "notes": a.notes,
    }


def _slot_warning(light: Light, target_preset_id: int) -> str | None:
    """Return advisory warning if target_preset_id is outside the light's slot scheme."""
    if not light.preset_slot_scheme:
        return None
    try:
        scheme = json.loads(light.preset_slot_scheme)
    except (json.JSONDecodeError, TypeError):
        return None
    live = scheme.get("live_presets")
    if live and isinstance(live, list) and len(live) == 2:
        lo, hi = live
        if not (lo <= target_preset_id <= hi):
            return (
                f"Target preset ID {target_preset_id} is outside the light's "
                f"live_presets range [{lo}–{hi}]."
            )
    return None


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    light_id: int
    master_preset_id: int
    preset_name: str
    category_name: str | None
    target_preset_id: int
    target_quick_label: str | None
    sort_order: int
    colour_mode: str
    palette_override: int | None
    colour_slots: str | None
    notes: str | None
    slot_warning: str | None = None
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_orm_with_joins(cls, a: LightPresetAssignment, warning: str | None = None) -> "AssignmentOut":
        preset = a.master_preset
        return cls(
            id=a.id,
            light_id=a.light_id,
            master_preset_id=a.master_preset_id,
            preset_name=preset.name if preset else "",
            category_name=preset.category.name if preset and preset.category else None,
            target_preset_id=a.target_preset_id,
            target_quick_label=a.target_quick_label,
            sort_order=a.sort_order,
            colour_mode=a.colour_mode or "source",
            palette_override=a.palette_override,
            colour_slots=a.colour_slots,
            notes=a.notes,
            slot_warning=warning,
            created_at=a.created_at,
            updated_at=a.updated_at,
        )


class AssignmentIn(BaseModel):
    master_preset_id: int
    target_preset_id: int
    target_quick_label: str | None = None
    sort_order: int | None = None
    colour_mode: Literal["source", "segment", "custom"] = "source"
    palette_override: int | None = None
    colour_slots: str | None = None
    notes: str | None = None

    @field_validator("target_quick_label")
    @classmethod
    def pad_label(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if v.isdigit():
            return v.zfill(2)
        return v


class AssignmentUpdate(BaseModel):
    target_preset_id: int | None = None
    target_quick_label: str | None = None
    sort_order: int | None = None
    colour_mode: Literal["source", "segment", "custom"] | None = None
    palette_override: int | None = None
    colour_slots: str | None = None
    notes: str | None = None

    @field_validator("target_quick_label")
    @classmethod
    def pad_label(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if v.isdigit():
            return v.zfill(2)
        return v


class ReorderItem(BaseModel):
    id: int
    sort_order: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=list[AssignmentOut])
def list_assignments(light_id: int, db: Session = Depends(get_db)):
    light = db.get(Light, light_id)
    if light is None:
        raise HTTPException(404, "Light not found")
    rows = (
        db.query(LightPresetAssignment)
        .filter(LightPresetAssignment.light_id == light_id)
        .order_by(LightPresetAssignment.sort_order)
        .all()
    )
    return [
        AssignmentOut.from_orm_with_joins(a, _slot_warning(light, a.target_preset_id))
        for a in rows
    ]


@router.post("", response_model=SuccessResponse[AssignmentOut], status_code=201)
def add_assignment(light_id: int, body: AssignmentIn, db: Session = Depends(get_db)):
    light = db.get(Light, light_id)
    if light is None:
        raise HTTPException(404, "Light not found")

    preset = db.get(MasterPreset, body.master_preset_id)
    if preset is None:
        raise HTTPException(404, "Master preset not found")

    # Uniqueness: target_preset_id within this light
    conflict_id = (
        db.query(LightPresetAssignment)
        .filter(
            LightPresetAssignment.light_id == light_id,
            LightPresetAssignment.target_preset_id == body.target_preset_id,
        )
        .first()
    )
    if conflict_id:
        raise HTTPException(409, f"Target preset ID {body.target_preset_id} is already used by another assignment on this light")

    # Uniqueness: target_quick_label within this light (if provided)
    if body.target_quick_label:
        conflict_label = (
            db.query(LightPresetAssignment)
            .filter(
                LightPresetAssignment.light_id == light_id,
                LightPresetAssignment.target_quick_label == body.target_quick_label,
            )
            .first()
        )
        if conflict_label:
            raise HTTPException(409, f"Quick-label '{body.target_quick_label}' is already used by another assignment on this light")

    # Default sort_order to max + 10
    if body.sort_order is None:
        max_order = (
            db.query(LightPresetAssignment)
            .filter(LightPresetAssignment.light_id == light_id)
            .order_by(LightPresetAssignment.sort_order.desc())
            .first()
        )
        sort_order = (max_order.sort_order + 10) if max_order else 10
    else:
        sort_order = body.sort_order

    a = LightPresetAssignment(
        light_id=light_id,
        master_preset_id=body.master_preset_id,
        target_preset_id=body.target_preset_id,
        target_quick_label=body.target_quick_label,
        sort_order=sort_order,
        colour_mode=body.colour_mode,
        palette_override=body.palette_override,
        colour_slots=body.colour_slots,
        notes=body.notes,
    )
    db.add(a)
    db.flush()
    _log(db, a.id, "create", after=_snapshot(a))
    db.commit()
    db.refresh(a)

    warning = _slot_warning(light, a.target_preset_id)
    return SuccessResponse(data=AssignmentOut.from_orm_with_joins(a, warning))


@router.put("/reorder", response_model=SuccessResponse[list[AssignmentOut]])
def reorder_assignments(light_id: int, items: list[ReorderItem], db: Session = Depends(get_db)):
    light = db.get(Light, light_id)
    if light is None:
        raise HTTPException(404, "Light not found")

    ids = {item.id for item in items}
    rows = {
        a.id: a
        for a in db.query(LightPresetAssignment)
        .filter(
            LightPresetAssignment.light_id == light_id,
            LightPresetAssignment.id.in_(ids),
        )
        .all()
    }
    for item in items:
        if item.id not in rows:
            raise HTTPException(404, f"Assignment {item.id} not found on this light")
        rows[item.id].sort_order = item.sort_order

    db.commit()
    updated = (
        db.query(LightPresetAssignment)
        .filter(LightPresetAssignment.light_id == light_id)
        .order_by(LightPresetAssignment.sort_order)
        .all()
    )
    return SuccessResponse(data=[
        AssignmentOut.from_orm_with_joins(a, _slot_warning(light, a.target_preset_id))
        for a in updated
    ])


@router.put("/{assignment_id}", response_model=SuccessResponse[AssignmentOut])
def update_assignment(
    light_id: int,
    assignment_id: int,
    body: AssignmentUpdate,
    db: Session = Depends(get_db),
):
    light = db.get(Light, light_id)
    if light is None:
        raise HTTPException(404, "Light not found")

    a = db.get(LightPresetAssignment, assignment_id)
    if a is None or a.light_id != light_id:
        raise HTTPException(404, "Assignment not found")

    before = _snapshot(a)

    if body.target_preset_id is not None and body.target_preset_id != a.target_preset_id:
        conflict = (
            db.query(LightPresetAssignment)
            .filter(
                LightPresetAssignment.light_id == light_id,
                LightPresetAssignment.target_preset_id == body.target_preset_id,
                LightPresetAssignment.id != assignment_id,
            )
            .first()
        )
        if conflict:
            raise HTTPException(409, f"Target preset ID {body.target_preset_id} is already used by another assignment on this light")
        a.target_preset_id = body.target_preset_id

    if body.target_quick_label is not None and body.target_quick_label != a.target_quick_label:
        conflict = (
            db.query(LightPresetAssignment)
            .filter(
                LightPresetAssignment.light_id == light_id,
                LightPresetAssignment.target_quick_label == body.target_quick_label,
                LightPresetAssignment.id != assignment_id,
            )
            .first()
        )
        if conflict:
            raise HTTPException(409, f"Quick-label '{body.target_quick_label}' is already used by another assignment on this light")
        a.target_quick_label = body.target_quick_label

    if body.sort_order is not None:
        a.sort_order = body.sort_order
    if body.colour_mode is not None:
        a.colour_mode = body.colour_mode
    if body.palette_override is not None:
        a.palette_override = body.palette_override
    if body.colour_slots is not None:
        a.colour_slots = body.colour_slots
    if body.notes is not None:
        a.notes = body.notes

    a.updated_at = datetime.utcnow()
    _log(db, a.id, "update", before=before, after=_snapshot(a))
    db.commit()
    db.refresh(a)

    warning = _slot_warning(light, a.target_preset_id)
    return SuccessResponse(data=AssignmentOut.from_orm_with_joins(a, warning))


@router.delete("/{assignment_id}", response_model=SuccessResponse[dict])
def delete_assignment(light_id: int, assignment_id: int, db: Session = Depends(get_db)):
    light = db.get(Light, light_id)
    if light is None:
        raise HTTPException(404, "Light not found")

    a = db.get(LightPresetAssignment, assignment_id)
    if a is None or a.light_id != light_id:
        raise HTTPException(404, "Assignment not found")

    _log(db, a.id, "delete", before=_snapshot(a))
    db.delete(a)
    db.commit()
    return SuccessResponse(data={"deleted_id": assignment_id})

