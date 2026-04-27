"""Configuration management using Pydantic settings."""

from pathlib import Path
from typing import Annotated

from pydantic import Field, HttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # AI/LLM Configuration
    litellm_model: Annotated[str, Field(default="gpt-4o-mini")]
    openai_api_key: Annotated[str | None, Field(default=None)]
    anthropic_api_key: Annotated[str | None, Field(default=None)]
    local_llm_url: Annotated[str, Field(default="http://localhost:11434")]
    embedding_model: Annotated[str, Field(default="text-embedding-3-small")]

    # Appwrite Configuration
    appwrite_endpoint: Annotated[
        HttpUrl, Field(default="https://appwrite.blackleafdigital.com/v1")
    ]
    appwrite_project_id: Annotated[str, Field(default="691779a3003300288357")]
    appwrite_api_key: Annotated[str | None, Field(default=None)]
    appwrite_database_id: Annotated[str, Field(default="pedofinder")]
    appwrite_documents_collection: Annotated[str, Field(default="documents")]
    appwrite_entities_collection: Annotated[str, Field(default="entities")]
    appwrite_relationships_collection: Annotated[
        str, Field(default="relationships")
    ]

    # Database Configuration
    sqlite_db_path: Annotated[Path, Field(default=Path("./data/pedofinder.db"))]
    lancedb_path: Annotated[Path, Field(default=Path("./data/lancedb"))]
    vector_dim: Annotated[int, Field(default=1536, gt=0)]

    # Pinecone Configuration
    pinecone_api_key: Annotated[str | None, Field(default=None)]
    pinecone_index_name: Annotated[str, Field(default="epstein-docs")]
    pinecone_environment: Annotated[str, Field(default="us-east-1")]

    # PDF Processing Configuration
    pinpoint_collection_id: Annotated[
        str, Field(default="092314e384a58618")
    ]
    raw_pdf_path: Annotated[Path, Field(default=Path("./data/raw"))]
    processed_data_path: Annotated[Path, Field(default=Path("./data/processed"))]
    cache_path: Annotated[Path, Field(default=Path("./data/cache"))]

    # Chunking Configuration
    chunk_size: Annotated[int, Field(default=1000, gt=0)]
    chunk_overlap: Annotated[int, Field(default=200, ge=0)]

    # OCR Configuration
    ocr_language: Annotated[str, Field(default="eng")]
    ocr_confidence_threshold: Annotated[float, Field(default=0.7, ge=0.0, le=1.0)]

    # Processing Configuration
    batch_size: Annotated[int, Field(default=10, gt=0)]
    max_workers: Annotated[int, Field(default=4, gt=0)]
    api_rate_limit: Annotated[int, Field(default=60, gt=0)]
    max_retries: Annotated[int, Field(default=3, gt=0)]
    retry_delay: Annotated[float, Field(default=1.0, gt=0.0)]

    # Web API Configuration
    api_host: Annotated[str, Field(default="0.0.0.0")]
    api_port: Annotated[int, Field(default=8000, gt=0, lt=65536)]
    cors_origins: Annotated[list[str], Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:8000"]
    )]
    api_key_required: Annotated[bool, Field(default=False)]
    api_key: Annotated[str | None, Field(default=None)]

    # Logging Configuration
    log_level: Annotated[str, Field(default="INFO")]
    log_format: Annotated[str, Field(default="json")]
    log_file: Annotated[Path, Field(default=Path("./logs/pedofinder.log"))]

    # Development Configuration
    debug: Annotated[bool, Field(default=False)]
    verbose: Annotated[bool, Field(default=False)]
    reload: Annotated[bool, Field(default=False)]

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level is one of the standard levels."""
        allowed_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in allowed_levels:
            msg = f"Log level must be one of {allowed_levels}"
            raise ValueError(msg)
        return v_upper

    @field_validator("log_format")
    @classmethod
    def validate_log_format(cls, v: str) -> str:
        """Validate log format is either json or text."""
        allowed_formats = ["json", "text"]
        v_lower = v.lower()
        if v_lower not in allowed_formats:
            msg = f"Log format must be one of {allowed_formats}"
            raise ValueError(msg)
        return v_lower

    @field_validator(
        "sqlite_db_path",
        "lancedb_path",
        "raw_pdf_path",
        "processed_data_path",
        "cache_path",
        "log_file",
    )
    @classmethod
    def ensure_parent_exists(cls, v: Path) -> Path:
        """Ensure parent directory exists for file paths."""
        v.parent.mkdir(parents=True, exist_ok=True)
        return v

    def model_post_init(self, __context: object) -> None:
        """Create necessary directories after initialization."""
        # Ensure all data directories exist
        self.raw_pdf_path.mkdir(parents=True, exist_ok=True)
        self.processed_data_path.mkdir(parents=True, exist_ok=True)
        self.cache_path.mkdir(parents=True, exist_ok=True)
        self.log_file.parent.mkdir(parents=True, exist_ok=True)


# Global settings instance
_settings: Settings | None = None


def get_settings() -> Settings:
    """Get or create the global settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()  # type: ignore[call-arg]
    return _settings


def reset_settings() -> None:
    """Reset the global settings instance (useful for testing)."""
    global _settings
    _settings = None
