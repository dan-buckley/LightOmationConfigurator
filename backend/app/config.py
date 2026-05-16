from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_path: str = "/data/lightomation.db"
    cors_origins: list[str] = ["http://localhost:3000"]
    environment: str = "development"
    backend_port: int = 8000

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v  # type: ignore[return-value]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
