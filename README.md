# LightOmation Configurator

A local web application for managing WLED presets and configuration across a fleet of LED lights.

## What it does

- Stores reusable master presets in a central library
- Manages individual light profiles including LED counts and segment layouts
- Transposes presets between lights with different LED configurations
- Generates valid WLED `presets.json` files for each light
- Validates generated files before export or deployment
- Imports and exports WLED `presets.json` and `cfg.json` files
- Connects to WLED devices on the local network for backup and direct deployment
- Retains a full history of every imported, generated, and exported file

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Python / FastAPI |
| Database | SQLite |
| Validation | Pydantic |
| Container | Docker and Docker Compose |

## Running the app

> Setup instructions will be added once the project scaffold is complete (Module 0.1).

## Documentation

| Document | Description |
|---|---|
| [Project Brief](docs/wled_preset_master_project_brief.md) | Full project overview, objectives, and scope |
| [Build Plan](docs/build_plan.md) | Module breakdown, status tracking, and milestones |
| [Module Specs](docs/specs/) | Detailed specification for each module |

## Sample data

Reference WLED configuration and preset files from existing lights are in [`sample_data/`](sample_data/).
