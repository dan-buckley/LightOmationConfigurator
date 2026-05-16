# WLED Preset Master and Fleet Configuration Manager

## 1. Project Overview

This project will create a local, container-ready software tool to manage WLED presets and configuration across a fleet of more than 50 LED lights.

The current process relies on manually editing WLED `presets.json` files for each light. This works for a small number of lights, but it becomes hard to manage as the number of lights grows. Many lights share similar effects, playlists, build-up animations, segment layouts, and rainbow-style presets. Each light may also have different total LED counts, segment boundaries, segment order, brightness settings, and physical layouts.

The goal is to create a **Preset Master and Configuration Manager** that stores reusable master presets separately from individual light configurations. The system will generate valid WLED `presets.json` files for each light by combining master preset templates with each light’s own layout and settings.

The tool will support both connected WLED devices and manually managed lights where files are imported and exported by hand.

## 2. Problem Statement

WLED presets are stored in a predefined JSON format. This format is powerful, but direct manual editing creates several problems:

- Presets copied from one light to another need LED ranges manually changed.
- Segment boundaries can become inconsistent between presets.
- Playlists and build presets can break if preset IDs are changed.
- Similar lights can drift apart over time.
- It is hard to know which light has which preset version.
- Distributed lights may be offline or inaccessible over the network.
- There is currently no central change history, validation step, or rollback process.

An example is copying preset `134` from the RB prototype master file into Small Rainbow as preset `14`. The effect settings should be copied, while LED totals and segment ranges should be transposed from the RB layout to the Small Rainbow layout. Another example is removing preset `35` from Small Rainbow while keeping the rest of the file valid.

## 3. Project Objectives

The project will deliver a practical tool that can:

1. Store reusable WLED master presets in a central library.
2. Store individual light profiles, including total LEDs, segment count, segment order, and segment LED ranges.
3. Generate valid `presets.json` files for new and existing lights.
4. Transpose master presets from one light layout to another.
5. Support all-LED presets, segmented presets, playlists, buttons, and build presets.
6. Import existing WLED `presets.json` and `cfg.json` files and retain every imported file permanently.
7. Export generated files for manual upload to distributed lights and retain every exported file permanently.
8. Back up current light files fetched from the network before any changes are applied.
9. Compare current and generated files before deployment.
10. Track what has been generated, changed, exported, or deployed for each light with a full audit trail.
11. Connect to WLED devices on the local network for backup and deployment.

## 4. Proposed Solution

The solution will be a local web application with a backend API, a database, a preset generation engine, and WLED device network integration.

The application will run locally on a development machine and be suitable for running in Docker. Docker is preferred because it makes the project easier to move, update, back up, and run consistently across machines. The application should also be able to run directly on a local machine during development.

The system will treat WLED `presets.json` files as generated output. The master source of truth will be the project’s own database and stored configuration files.

## 5. High-Level Architecture

```text
Browser UI
  |
Local Web Application
  |
Backend API
  |
Database
  |
Preset Master Library
  |
Light Profiles
  |
Generation and Validation Engine
  |
Generated presets.json / cfg.json
  |
Manual Export or WLED Network Deployment
```

## 6. Main Components

| Component | Purpose |
|---|---|
| Web UI | Manage lights, presets, assignments, imports, exports, and deployment status |
| Backend API | Handles application logic and exposes structured operations |
| Database | SQLite store for all structured data and raw file retention (see Section 8) |
| Master Preset Library | Stores reusable preset templates grouped by category |
| Light Profile Store | Stores each light's LED count, segment layout, segment order, and metadata |
| Generator Engine | Creates target WLED `presets.json` files from master presets and light profiles |
| Validation Engine | Checks segment coverage, preset IDs, playlists, missing references, and JSON structure |
| Diff Engine | Shows changes between imported, current, and generated files |
| File Store | Retains raw JSON of every imported, generated, and exported file permanently |
| Export Manager | Allows generated files to be downloaded for manual upload |
| WLED Connector | Network backup and deployment for reachable WLED devices |

## 7. Key Features

### Master Preset Management

The system will allow reusable preset templates to be stored once and used many times. Presets can be categorised as:

| Preset Type | Description |
|---|---|
| Button | WLED command or quick action |
| Playlist | Sequence of preset IDs with durations and transitions |
| Build preset | Presets used to build up or animate segments across a light |
| Standard preset | Normal WLED effect preset |
| All-LED preset | Preset that applies across the full LED length |
| Segmented preset | Preset that uses multiple WLED segments |

### Light Profiles

Each light will have a profile containing:

- Light name
- Device type or category
- WLED IP address
- Firmware version
- Total LED count
- Number of segments
- Segment names
- Segment start and stop values
- Segment order
- Notes and physical location
- Current source file history

### Preset Transposition

The generator will copy effect settings while replacing layout-specific values.

For example:

- RB total LEDs: `388`
- Small Rainbow total LEDs: `182`
- RB segment boundaries: `0, 70, 135, 196, 251, 303, 348, 388`
- Small Rainbow segment boundaries: `0, 47, 89, 126, 158, 182`

A segmented preset copied from RB to Small Rainbow will keep effect settings such as colours, palette, speed, intensity, mirroring, reverse, and effect ID. It will replace `start` and `stop` values with the Small Rainbow segment layout.

### Manual Import and Export

The project must support lights that are remote, offline, or physically distributed.

Required manual workflows:

1. Import an existing `presets.json` from a light.
2. Import an existing `cfg.json` from a light.
3. Generate an updated `presets.json`.
4. Download the generated file.
5. Manually upload it to the target WLED device.
6. Mark the light as updated in the tool.

### Network Deployment

Both the RB prototype and Small Rainbow are accessible on the local network. The system should support:

- Fetch current `presets.json`
- Fetch current `cfg.json`
- Back up current files
- Compare files before deployment
- Push generated files or apply updates
- Record deployment history

## 8. Data Storage

All structured data and raw file content will be stored in a single SQLite database. Storing raw JSON directly in the database keeps the entire project state in one portable file that is easy to back up and move between machines.

### SQLite Tables

| Table | What it holds |
|---|---|
| `lights` | Light name, IP address, mdns hostname, total LEDs, firmware version, location, notes |
| `light_segments` | Segment index, name, start LED, stop LED per light |
| `master_presets` | Reusable preset templates — effect ID, colours, palette, speed, intensity, flags, category, notes |
| `preset_categories` | Category names and descriptions |
| `light_preset_assignments` | Which master preset maps to which target preset ID and quick-label on a specific light |
| `imported_files` | Raw JSON text of every imported `presets.json` and `cfg.json`, with light, import method, and timestamp |
| `generated_files` | Raw JSON text of every generated `presets.json`, with light, timestamp, and notes |
| `exported_files` | Record of every export — links to the generated file, method (download or network push), timestamp |
| `deployment_history` | Per-light record of network deployments — file used, timestamp, result |
| `change_log` | Audit trail of all changes — entity, before state, after state, timestamp |

Every imported file is retained permanently. Every generated file is retained permanently. Exports and deployments are recorded as events that reference the retained generated file.

## 9. Validation and Safety

The system should validate generated files before export or deployment.

Important checks include:

| Validation Check | Reason |
|---|---|
| Segment ranges are continuous | Prevent missing LEDs |
| Segment total equals light total | Confirms full coverage |
| Segment count matches light profile | Prevents layout mismatch |
| Playlist preset IDs exist | Prevents broken playlists |
| Preset IDs are unique | Prevents accidental overwrite |
| Build preset sequence is valid | Keeps animations working |
| JSON is valid WLED format | Reduces upload risk |
| Backup exists before deployment | Supports rollback |

## 10. Suggested Technology Stack

| Layer | Suggested Technology |
|---|---|
| Frontend | React or simple server-rendered UI |
| Backend | Python FastAPI or Flask |
| Database | SQLite for first version, PostgreSQL optional later |
| Data validation | Pydantic |
| File handling | Python JSON and YAML libraries |
| Container | Docker and Docker Compose |
| Development | VS Code with dev container support |
| Version control | Git and GitHub |

SQLite is suitable for a first version because this is a local tool with a single user or small group of users. Storing raw JSON files directly in the database (rather than on the filesystem) keeps the entire application state in a single portable file. PostgreSQL can be added later if the system grows.

## 11. Deliverables

The first project release should deliver:

1. Docker-ready local application.
2. Database schema covering all tables in Section 8, including full file retention for imported and generated files.
3. Master preset import from existing RB preset files.
4. Light profile management.
5. Manual import of `presets.json` and `cfg.json`.
6. Preset assignment workflow.
7. Generator for target `presets.json`.
8. Validation report.
9. File diff summary.
10. Manual export of generated files.
11. Initial README and setup guide.
12. Example data for RB prototype and Small Rainbow.
13. Network backup and deployment for RB prototype and Small Rainbow.

A later release can add WLED device discovery for additional lights and bulk deployment.

## 12. Benefits

This project will make it easier to manage a large set of WLED lights consistently.

Expected benefits:

- Faster creation of new light configurations.
- Safer updates to existing lights.
- Less manual JSON editing.
- Better reuse of proven presets.
- Clear history of what changed and when.
- Easier management of lights with different LED counts.
- Better support for distributed lights.
- Stronger foundation for future automation.

## 13. Initial Scope

The initial scope should focus on generating and validating WLED preset files. Network deployment should be treated as a later enhancement.

### In Scope

- Master preset library
- Light profile management
- Manual JSON import and export
- Preset transposition
- Playlist awareness
- Build preset support
- Validation
- Diff reporting
- Local Docker deployment
- WLED network backup and deployment for RB prototype and Small Rainbow
- Direct upload to reachable WLED devices

### Later Scope

- WLED network discovery for additional lights
- Bulk deployment across many devices
- Rollback from stored backups
- Device health checks
- Multi-user access
- Advanced UI dashboards
- Packaged self-contained installer for Mac and Windows (see Section 15)

## 14. Success Criteria

The project will be successful when:

1. A preset from the RB master can be added to Small Rainbow with correct segment transposition.
2. A preset can be removed from a target light cleanly.
3. A new light profile can be created from LED and segment settings.
4. A valid `presets.json` can be generated for that new light.
5. The generated file passes validation.
6. The generated file can be exported or deployed directly to a connected WLED device.
7. The system keeps a clear record of source files, generated files, and changes.

## 15. Packaging and Distribution Options

The application could later be packaged as a self-contained installer — a `.dmg` on Mac or an `.exe` on Windows — that requires no separate installation of Python, Node.js, or Docker. This is a later-phase consideration once the core tool is stable.

The stack suits packaging well. React compiles to static files at build time, so only the Python runtime is needed at distribution time. SQLite is a single file with no server process. WLED connectivity uses plain HTTP.

The following options were evaluated.

### Option A — PyInstaller (recommended for a tool like this)

PyInstaller bundles the Python interpreter, all dependencies, and the compiled React static files into a single binary. The app launches a local HTTP server and opens the browser automatically. On Mac the output can be wrapped in a `.dmg`; on Windows it produces a `.exe`.

| Aspect | Detail |
|---|---|
| Output size | ~30–60 MB |
| UI | Opens in the system browser |
| Build complexity | Low |
| Mac installer | `.app` bundle wrapped in `.dmg` |
| Windows installer | `.exe` via PyInstaller |

### Option B — Tauri with PyInstaller sidecar

Tauri provides a native OS window using the platform's built-in webview (WebKit on Mac, WebView2 on Windows). The Python backend is bundled as a sidecar binary using PyInstaller and spawned at launch. Tauri's build tooling produces a signed `.dmg` and a proper Windows installer natively.

| Aspect | Detail |
|---|---|
| Output size | ~15–40 MB |
| UI | Native OS window with dock icon and title bar |
| Build complexity | Medium — requires Rust toolchain |
| Mac installer | Signed `.dmg` |
| Windows installer | `.msi` or NSIS `.exe` |

### Option C — Electron with PyInstaller sidecar

Electron provides a native window but bundles its own Chromium browser. The Python backend is the same sidecar pattern as Option B. Electron Builder produces `.dmg`, `.exe`, and `.AppImage`.

| Aspect | Detail |
|---|---|
| Output size | ~150–200 MB |
| UI | Native OS window with dock icon and title bar |
| Build complexity | Medium — established ecosystem |
| Mac installer | `.dmg` |
| Windows installer | `.exe` |

### Architecture constraints if packaging is adopted

These decisions should be made early if packaging becomes a goal, as they affect the core architecture:

1. Python must be the only runtime dependency at runtime. React must compile to static files served by FastAPI or Flask.
2. All user data and configuration must be stored in a writable OS-standard location, not next to the binary (`~/Library/Application Support` on Mac, `%APPDATA%` on Windows).
3. The local HTTP server must use a fixed or configurable port with a clear error if the port is already in use.
4. Launching the app a second time should bring the existing instance forward rather than starting a second server.

---

## 16. Recommended First Milestone

The first milestone should be a working command-backed web application that can:

- Import RB and Small Rainbow preset files via network or manual upload.
- Store RB as the first master library source.
- Store Small Rainbow as a target light profile.
- Copy one selected preset from RB to Small Rainbow.
- Transpose LED and segment ranges.
- Remove one selected preset from Small Rainbow.
- Generate a new `presets.json`.
- Produce a validation and change report.
- Export the generated file or deploy directly to Small Rainbow over the network.
