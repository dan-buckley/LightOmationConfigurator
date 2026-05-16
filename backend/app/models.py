from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Light(Base):
    __tablename__ = "lights"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False)
    mdns = Column(Text)
    ip_address = Column(Text)
    firmware_version = Column(Text)
    total_leds = Column(Integer)
    location = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    segments = relationship("LightSegment", back_populates="light", cascade="all, delete-orphan")
    imported_files = relationship("ImportedFile", back_populates="light")
    preset_assignments = relationship("LightPresetAssignment", back_populates="light")
    generated_files = relationship("GeneratedFile", back_populates="light")
    deployments = relationship("DeploymentHistory", back_populates="light")


class LightSegment(Base):
    __tablename__ = "light_segments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    light_id = Column(Integer, ForeignKey("lights.id"), nullable=False)
    segment_index = Column(Integer, nullable=False)
    name = Column(Text)
    start_led = Column(Integer, nullable=False)
    stop_led = Column(Integer, nullable=False)

    light = relationship("Light", back_populates="segments")


class PresetCategory(Base):
    __tablename__ = "preset_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False, unique=True)
    description = Column(Text)

    presets = relationship("MasterPreset", back_populates="category")


class MasterPreset(Base):
    __tablename__ = "master_presets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("preset_categories.id"))
    preset_data = Column(Text, nullable=False)
    source_light_id = Column(Integer, ForeignKey("lights.id"), nullable=True)
    source_preset_id = Column(Integer, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("PresetCategory", back_populates="presets")
    assignments = relationship("LightPresetAssignment", back_populates="master_preset")


class LightPresetAssignment(Base):
    __tablename__ = "light_preset_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    light_id = Column(Integer, ForeignKey("lights.id"), nullable=False)
    master_preset_id = Column(Integer, ForeignKey("master_presets.id"), nullable=False)
    target_preset_id = Column(Integer, nullable=False)
    target_quick_label = Column(Text)
    sort_order = Column(Integer, nullable=False)
    notes = Column(Text)

    light = relationship("Light", back_populates="preset_assignments")
    master_preset = relationship("MasterPreset", back_populates="assignments")


class ImportedFile(Base):
    __tablename__ = "imported_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    light_id = Column(Integer, ForeignKey("lights.id"), nullable=False)
    file_type = Column(Text, nullable=False)  # 'presets' or 'cfg'
    raw_json = Column(Text, nullable=False)
    source = Column(Text, nullable=False)  # 'manual' or 'network'
    imported_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)

    light = relationship("Light", back_populates="imported_files")


class GeneratedFile(Base):
    __tablename__ = "generated_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    light_id = Column(Integer, ForeignKey("lights.id"), nullable=False)
    raw_json = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)

    light = relationship("Light", back_populates="generated_files")
    exports = relationship("ExportedFile", back_populates="generated_file")
    deployments = relationship("DeploymentHistory", back_populates="generated_file")


class ExportedFile(Base):
    __tablename__ = "exported_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    generated_file_id = Column(Integer, ForeignKey("generated_files.id"), nullable=False)
    method = Column(Text, nullable=False)  # 'download' or 'network'
    exported_at = Column(DateTime, default=datetime.utcnow)

    generated_file = relationship("GeneratedFile", back_populates="exports")


class DeploymentHistory(Base):
    __tablename__ = "deployment_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    light_id = Column(Integer, ForeignKey("lights.id"), nullable=False)
    generated_file_id = Column(Integer, ForeignKey("generated_files.id"), nullable=False)
    deployed_at = Column(DateTime, default=datetime.utcnow)
    result = Column(Text, nullable=False)  # 'success', 'failed', 'skipped'
    notes = Column(Text)

    light = relationship("Light", back_populates="deployments")
    generated_file = relationship("GeneratedFile", back_populates="deployments")


class ChangeLog(Base):
    __tablename__ = "change_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(Text, nullable=False)
    entity_id = Column(Integer, nullable=False)
    change_type = Column(Text, nullable=False)  # 'created', 'updated', 'deleted'
    before_json = Column(Text, nullable=True)
    after_json = Column(Text, nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)
