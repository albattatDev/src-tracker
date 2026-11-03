from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

JWT_SECRET_MIN_LENGTH = 32
JWT_SECRET_PLACEHOLDER_PREFIX = "change-me"


class Settings(BaseSettings):
    """Reads configuration from the environment (see .env.example at the repo root).

    Only the fields this slice needs are defined here. Later slices (auth, Celery,
    Mailpit) add their own fields when those features are built.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    db_host: str = "db"
    db_port: int = 3306
    db_name: str = "srct"
    db_user: str = "srct"
    db_password: str

    app_timezone: str = "Asia/Riyadh"
    frontend_url: str = "http://localhost:5173"
    seed_password: str

    jwt_secret: str
    jwt_expire_minutes: int = 480

    # Contractor documents live on disk (a Docker volume), never in the database.
    upload_dir: str = "/data/uploads"

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_must_be_strong(cls, value: str) -> str:
        if len(value) < JWT_SECRET_MIN_LENGTH:
            raise ValueError(
                f"JWT_SECRET must be at least {JWT_SECRET_MIN_LENGTH} characters "
                "(generate one with: openssl rand -hex 32)"
            )
        if value.startswith(JWT_SECRET_PLACEHOLDER_PREFIX):
            raise ValueError(
                "JWT_SECRET is still the .env.example placeholder "
                "(generate one with: openssl rand -hex 32)"
            )
        return value

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )


settings = Settings()
