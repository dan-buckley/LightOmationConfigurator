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

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — easiest path, no other installs needed
- Or: Python 3.12+ and Node 20+ for running services directly

### Quick start (Docker Compose)

```bash
cp .env.example .env          # create local env file — edit ports if needed
docker compose up             # starts backend on :8000 and frontend on :3000
```

> **Port conflicts?** If another Docker app is already using port 8000 or 3000,
> `docker compose up` will fail with `port is already allocated`. Open `.env` and
> change `BACKEND_PORT` and/or `FRONTEND_PORT` to free ports (e.g. 8001 / 3001).
> See `.env.example` for details.

The backend runs Alembic migrations automatically on startup. The database is stored in a named Docker volume (`sqlite_data`).

### Local dev (without Docker)

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
DATABASE_PATH=./dev.db uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Seed dev data

```bash
cd backend && source .venv/bin/activate
DATABASE_PATH=./dev.db python -m app.seed           # seed if empty
DATABASE_PATH=./dev.db python -m app.seed --reset   # clear and reseed
```

Seeds two lights (`Lightomation-RB-Proto` and `LoM Small Rainbow`) with segments, preset categories, and imported files from `sample_data/`.

### Environment variables

See [`.env.example`](.env.example) for all available variables. Key ones:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `/data/lightomation.db` | SQLite file location |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `BACKEND_PORT` | `8000` | Backend port |
| `FRONTEND_PORT` | `3000` | Frontend port |

### Useful commands

```bash
# Check the API is up
curl http://localhost:8000/health

# Run migrations manually
cd backend && source .venv/bin/activate
DATABASE_PATH=./dev.db alembic upgrade head

# Open the SQLite database directly
sqlite3 ./dev.db

# Rebuild Docker containers after dependency changes
docker compose up --build
```

## Documentation

| Document | Description |
|---|---|
| [Project Brief](docs/wled_preset_master_project_brief.md) | Full project overview, objectives, and scope |
| [Build Plan](docs/build_plan.md) | Module breakdown, status tracking, and milestones |
| [Module Specs](docs/specs/) | Detailed specification for each module |

## Sample data

Reference WLED configuration and preset files from existing lights are in [`sample_data/`](sample_data/).
