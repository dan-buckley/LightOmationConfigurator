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
| 1.2 | File Import | Data Management | `Done` | 0.4 | M1 | [1.2](specs/1.2_file_import.md) |
| 1.2.1 | Segment Config Discovery | Data Management | `Done` | 1.2 | M1 | [1.2.1](specs/1.2.1_segment_config_discovery.md) |
| 1.2.2 | Light Onboarding from CFG | Data Management | `Done` | 1.2 | M1 | [1.2.2](specs/1.2.2_light_onboarding.md) |
| 1.2.3 | Matrix Light Support | Data Management | `Done` | 1.2.1, 1.2.2 | M1 | [1.2.3](specs/1.2.3_matrix_support.md) |
| 1.3 | Master Preset Library | Data Management | `Done` | 1.2.1, 1.5 | M1 | [1.3](specs/1.3_master_preset_library.md) |
| 1.4 | Light Preset Assignments | Data Management | `Done` | 1.1, 1.3 | M1 | [1.4](specs/1.4_light_preset_assignments.md) |
| 1.5 | Segment Groups | Data Management | `Done` | 1.2.1, 1.2.3 | M1 | [1.5](specs/1.5_segment_groups.md) |
| 2.1 | Transposition Engine | Processing | `Backlog` | 1.1, 1.2.3, 1.5 | M2 | [2.1](specs/2.1_transposition_engine.md) |
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
| 2026-05-17 | 1.2 complete. File import: upload (presets/cfg), list, detail, extract-profile endpoints. Frontend: ImportForm, ImportList, ExtractProfileModal, RawJsonModal. cfg.json extraction reads hw.led.total and hw.led.ins to pre-populate light profile. Network fetch stubbed (501) pending Module 3.2. |
| 2026-05-17 | Design decision: WLED devices use different segment layouts per preset (e.g. full-strip vs 7-zone vs 5-zone). Added module 1.2.1 to model named segment configurations per light, auto-discover them from presets.json imports, and wire them into master presets before 1.3. Segment configs are the bridge between import and transposition. |
| 2026-05-17 | Design expansion: added 4 light types (strip/matrix/multi_segment/composite). New modules: 1.2.2 (create light from cfg), 1.2.3 (matrix Y coordinates + light_type/shortcode columns), 1.5 (segment groups + characteristic colours). Updated module dependencies: 1.3 now depends on 1.5; 2.1 now depends on 1.2.3 and 1.5. Added colour theming (colour_mode, palette_override per assignment), quick-load label convention ({NN} {Effect Name}), and preset slot scheme to 1.4. Named segment groups for composite lights (DEE) added to 1.5 and transposition rules added to 2.1. Naming template and slot scheme validation added to 2.2. |
| 2026-05-17 | 1.3 complete. Master preset library: CRUD + bulk-import with dedup and prefix stripping, categories seeded, PresetsPage with library browser, detail/edit panel, bulk import modal. |
| 2026-05-17 | 1.4 complete. Light preset assignments: add/edit/delete/reorder per light, colour_mode/palette_override fields, slot-scheme advisory warnings. AssignmentsPage with light selector, assignment table with ↑↓ reorder, add-preset search panel, edit/delete side panel. M1 milestone complete. |
| 2026-05-18 | Bug fixes: (1) `assignments.ts` and `AssignmentsPage.tsx` used value imports for TypeScript `type`/`interface` exports (`ApiResult`, `ColourMode`, `Assignment`, `AssignmentUpdate`, `LightSummary`, `MasterPreset`, `PresetCategory`) — changed to `import type` to prevent browser runtime binding errors. (2) All API paths in `segmentConfigs.ts` were missing the `/api/v1` prefix, causing 404s on every segment config, segment group, scan-segments, and detect-colours call. Fixed. Manually triggered scan-segments on existing WLED-Small_MATRIX presets import — 2 unique matrix configs discovered and persisted (full 48×32 and half-height 64×16). |
