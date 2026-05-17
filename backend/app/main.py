from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.routers import (
    assignments,
    diff,
    exports,
    generate,
    health,
    history,
    imports,
    lights,
    network,
    presets,
    segment_configs,
    validate,
)
from app.schemas import ErrorResponse

_API_PREFIX = "/api/v1"


def _run_migrations() -> None:
    alembic_cfg = Config(str(Path(__file__).parent.parent / "alembic.ini"))
    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _run_migrations()
    yield


app = FastAPI(title="LightOmation Configurator API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            code=str(exc.status_code),
            message=exc.detail,
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            code="validation_error",
            message="Request validation failed",
            detail=exc.errors(),
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            code="internal_server_error",
            message="An unexpected error occurred",
        ).model_dump(),
    )


app.include_router(health.router, prefix=_API_PREFIX)
app.include_router(lights.router, prefix=_API_PREFIX + "/lights")
app.include_router(imports.router, prefix=_API_PREFIX + "/imports")
app.include_router(segment_configs.router, prefix=_API_PREFIX + "/lights/{light_id}/segment-configs")
app.include_router(presets.router, prefix=_API_PREFIX + "/presets")
app.include_router(assignments.router, prefix=_API_PREFIX + "/assignments")
app.include_router(generate.router, prefix=_API_PREFIX + "/generate")
app.include_router(validate.router, prefix=_API_PREFIX + "/validate")
app.include_router(diff.router, prefix=_API_PREFIX + "/diff")
app.include_router(exports.router, prefix=_API_PREFIX + "/exports")
app.include_router(network.router, prefix=_API_PREFIX + "/network")
app.include_router(history.router, prefix=_API_PREFIX + "/history")
