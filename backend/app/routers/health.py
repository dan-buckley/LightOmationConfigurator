from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.schemas import SuccessResponse

router = APIRouter(tags=["health"])


class HealthStatus(BaseModel):
    status: str
    environment: str
    database: str


@router.get("/health", response_model=SuccessResponse[HealthStatus])
def health_check(db: Session = Depends(get_db)) -> SuccessResponse[HealthStatus]:
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"

    return SuccessResponse(
        data=HealthStatus(
            status="ok",
            environment=settings.environment,
            database=db_status,
        )
    )
