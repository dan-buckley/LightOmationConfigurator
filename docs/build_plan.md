# Build Plan

## Status Key

| Status | Meaning |
|---|---|
| `Backlog` | Not yet started |
| `In Progress` | Currently being worked |
| `In Review` | Built — awaiting review or testing |
| `Done` | Complete and accepted |
| `Blocked` | Cannot proceed — dependency or issue recorded in Notes |

## Milestones

| ID | Name | Description |
|---|---|---|
| M0 | Foundation | Project runs end-to-end in Docker; database initialises; API and frontend shells load |
| M1 | Data Ready | Lights, segments, master presets, and assignments can be created and managed |
| M2 | Pipeline | A preset can be transposed, generated, validated, diffed, and exported for a target light |
| M3 | Network | Files can be fetched from and pushed to live WLED devices |
| M4 | Visibility | Full history, audit trail, and fleet dashboard are operational |

---

## Module Tracker

| ID | Module | Layer | Status | Depends On | Milestone | Spec |
|---|---|---|---|---|---|---|
| 0.1 | Project Scaffold | Foundation | `Done` | — | M0 | [0.1](specs/0.1_project_scaffold.md) |
| 0.2 | Database Schema | Foundation | `Done` | 0.1 | M0 | [0.2](specs/0.2_database_schema.md) |
| 0.3 | API Scaffold | Foundation | `Done` | 0.2 | M0 | [0.3](specs/0.3_api_scaffold.md) |
| 0.4 | Frontend Scaffold | Foundation | `Done` | 0.3 | M0 | [0.4](specs/0.4_frontend_scaffold.md) |
| 1.1 | Light Profile Manager | Data Management | `Done` | 0.4 | M1 | [1.1](specs/1.1_light_profile_manager.md) |
| 1.2 | File Import | Data Management | `Backlog` | 0.4 | M1 | [1.2](specs/1.2_file_import.md) |
| 1.3 | Master Preset Library | Data Management | `Backlog` | 0.4 | M1 | [1.3](specs/1.3_master_preset_library.md) |
| 1.4 | Light Preset Assignments | Data Management | `Backlog` | 1.1, 1.3 | M1 | [1.4](specs/1.4_light_preset_assignments.md) |
| 2.1 | Transposition Engine | Processing | `Backlog` | 1.1 | M2 | [2.1](specs/2.1_transposition_engine.md) |
| 2.2 | Generation Engine | Processing | `Backlog` | 1.4, 2.1 | M2 | [2.2](specs/2.2_generation_engine.md) |
| 2.3 | Validation Engine | Processing | `Backlog` | 2.2 | M2 | [2.3](specs/2.3_validation_engine.md) |
| 2.4 | Diff Engine | Processing | `Backlog` | 1.2, 2.2 | M2 | [2.4](specs/2.4_diff_engine.md) |
| 3.1 | Export Manager | Output | `Backlog` | 2.3 | M2 | [3.1](specs/3.1_export_manager.md) |
| 3.2 | WLED Network Connector | Output | `Backlog` | 1.2, 3.1 | M3 | [3.2](specs/3.2_wled_network_connector.md) |
| 4.1 | Change and Deployment History | Visibility | `Backlog` | 3.1 | M4 | [4.1](specs/4.1_change_and_deployment_history.md) |
| 4.2 | Fleet Dashboard | Visibility | `Backlog` | 4.1 | M4 | [4.2](specs/4.2_fleet_dashboard.md) |

---

## Change Log

| Date | Change |
|---|---|
| 2026-05-16 | Build plan created. All modules at Backlog. |
| 2026-05-16 | 0.1 complete. 0.2 in progress. |
| 2026-05-16 | 0.2 complete. SQLAlchemy models (10 tables), Alembic initial migration, seed script, lifespan migration runner. README updated with running instructions. |
| 2026-05-16 | 0.3 complete. app/schemas.py (SuccessResponse, ErrorResponse, PaginatedResponse), app/routers/ with 11 router stubs, /api/v1 prefix on all routes, exception handlers for HTTPException/422/500. |
| 2026-05-16 | 0.4 complete. Tailwind CSS, react-router-dom, typed API client, useConnectionStatus hook, 6 shared components (PageLayout, LoadingSpinner, ErrorMessage, EmptyState, ConfirmModal, StatusBadge), sidebar nav layout, 9 placeholder page routes. Build verified clean. |
| 2026-05-16 | 1.1 complete. Full CRUD for lights and segments: 7 API endpoints, Pydantic schemas, change log writes, coverage gap/overlap detection. Frontend: LightList, LightForm, SegmentEditor with live CoverageBar. All spec acceptance criteria met. |
