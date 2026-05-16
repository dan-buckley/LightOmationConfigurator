"""
Seed script — populates the database with development data.

Usage:
    python -m app.seed           # seed if not already seeded
    python -m app.seed --reset   # drop all seed data and reseed

Run from the backend/ directory with the venv activated.
"""

import argparse
import json
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models import (
    Base,
    ImportedFile,
    Light,
    LightSegment,
    PresetCategory,
)

# Path to sample_data/ relative to the project root
SAMPLE_DATA_DIR = Path(__file__).parent.parent.parent / "sample_data"

# ----------------------------------------------------------------------------
# Seed definitions
# ----------------------------------------------------------------------------

LIGHTS = [
    {
        "name": "Lightomation-RB-Proto",
        "mdns": "wled-f3727c",
        "ip_address": "192.168.0.186",
        "total_leds": 388,
        "location": "Proto rig",
        "notes": "Original rainbow prototype light",
        "segments": [
            {"segment_index": 0, "name": "Full strip", "start_led": 0, "stop_led": 388},
        ],
        "preset_file": "wled_presets_Lightomation-RB-Proto.json",
        "cfg_file": "wled_cfg_Lightomation-RB-Proto.json",
    },
    {
        "name": "LoM Small Rainbow",
        "mdns": "wled-f915e0",
        "ip_address": "192.168.0.194",
        "total_leds": 182,
        "location": "Small Rainbow rig",
        "notes": "Primary target light for transposition",
        "segments": [
            {"segment_index": 0, "name": "Segment 1", "start_led": 0,   "stop_led": 47},
            {"segment_index": 1, "name": "Segment 2", "start_led": 47,  "stop_led": 89},
            {"segment_index": 2, "name": "Segment 3", "start_led": 89,  "stop_led": 126},
            {"segment_index": 3, "name": "Segment 4", "start_led": 126, "stop_led": 158},
            {"segment_index": 4, "name": "Segment 5", "start_led": 158, "stop_led": 182},
        ],
        "preset_file": "wled_presets_LoM Small Rainbow.json",
        "cfg_file": "wled_cfg_LoM Small Rainbow.json",
    },
]

PRESET_CATEGORIES = [
    {"name": "Button",    "description": "Presets assigned to physical buttons"},
    {"name": "Playlist",  "description": "Playlist presets that cycle through others"},
    {"name": "Build",     "description": "Intermediate presets used in builds or sequences"},
    {"name": "Standard",  "description": "General-purpose single-effect presets"},
    {"name": "All-LED",   "description": "Presets that address all LEDs as one segment"},
    {"name": "Segmented", "description": "Presets that use multiple independent segments"},
]


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------

def _load_json_text(filename: str) -> str | None:
    path = SAMPLE_DATA_DIR / filename
    if not path.exists():
        print(f"  [warn] Sample file not found, skipping: {path}", file=sys.stderr)
        return None
    return path.read_text(encoding="utf-8")


def _seed(db: Session) -> None:
    print("Seeding preset categories...")
    for cat in PRESET_CATEGORIES:
        exists = db.query(PresetCategory).filter_by(name=cat["name"]).first()
        if not exists:
            db.add(PresetCategory(**cat))
    db.flush()

    print("Seeding lights, segments, and imported files...")
    for light_def in LIGHTS:
        light = db.query(Light).filter_by(name=light_def["name"]).first()
        if not light:
            light = Light(
                name=light_def["name"],
                mdns=light_def["mdns"],
                ip_address=light_def["ip_address"],
                total_leds=light_def["total_leds"],
                location=light_def["location"],
                notes=light_def["notes"],
            )
            db.add(light)
            db.flush()
            print(f"  Created light: {light.name} (id={light.id})")

            for seg in light_def["segments"]:
                db.add(LightSegment(light_id=light.id, **seg))

        # Imported preset file
        preset_json = _load_json_text(light_def["preset_file"])
        if preset_json:
            existing = (
                db.query(ImportedFile)
                .filter_by(light_id=light.id, file_type="presets", source="manual")
                .first()
            )
            if not existing:
                db.add(ImportedFile(
                    light_id=light.id,
                    file_type="presets",
                    raw_json=preset_json,
                    source="manual",
                    notes=f"Seeded from {light_def['preset_file']}",
                ))
                print(f"  Imported presets for: {light.name}")

        # Imported cfg file
        cfg_json = _load_json_text(light_def["cfg_file"])
        if cfg_json:
            existing = (
                db.query(ImportedFile)
                .filter_by(light_id=light.id, file_type="cfg", source="manual")
                .first()
            )
            if not existing:
                db.add(ImportedFile(
                    light_id=light.id,
                    file_type="cfg",
                    raw_json=cfg_json,
                    source="manual",
                    notes=f"Seeded from {light_def['cfg_file']}",
                ))
                print(f"  Imported cfg for: {light.name}")

    db.commit()
    print("Seed complete.")


def _reset(db: Session) -> None:
    print("Resetting seed data...")
    for light_def in LIGHTS:
        light = db.query(Light).filter_by(name=light_def["name"]).first()
        if light:
            db.query(ImportedFile).filter_by(light_id=light.id).delete()
            db.query(LightSegment).filter_by(light_id=light.id).delete()
            db.delete(light)
    db.query(PresetCategory).delete()
    db.commit()
    print("Seed data cleared.")


# ----------------------------------------------------------------------------
# Entry point
# ----------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the LightOmation database")
    parser.add_argument("--reset", action="store_true", help="Clear and reseed all data")
    args = parser.parse_args()

    # Ensure tables exist (idempotent — safe to call even if already created by Alembic)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        if args.reset:
            _reset(db)
        _seed(db)
