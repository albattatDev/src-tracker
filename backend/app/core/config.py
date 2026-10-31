from pydantic_settings import BaseSettings, SettingsConfigDict


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

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )


settings = Settings()
