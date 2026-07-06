from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    APP_NAME: str = "LinguaAI Studio"
    FRONTEND_URL: str = "http://localhost:8080"
    BACKEND_URL: str = "http://localhost:8000"

    SECRET_KEY: str = "dev-secret-change-me"
    ACCESS_TOKEN_MINUTES: int = 30
    REFRESH_TOKEN_DAYS: int = 30
    INTERNAL_TOKEN: str = "dev-internal-token"
    JWT_ALGORITHM: str = "HS256"

    DATABASE_URL: str = "postgresql+asyncpg://lingua:lingua@localhost:5432/lingua"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://lingua:lingua@localhost:5432/lingua"

    MONGO_URL: str = "mongodb://localhost:27017"
    MONGO_DB: str = "lingua"

    REDIS_URL: str = "redis://localhost:6379/0"

    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_PUBLIC_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "linguaai"
    S3_SECRET_KEY: str = "linguaai-secret"
    S3_BUCKET: str = "lingua"
    S3_REGION: str = "us-east-1"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""

    LLM_BASE_URL: str = ""
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "qwen2.5-14b-instruct"

    FREE_PLAN_CREDITS: int = 300


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
