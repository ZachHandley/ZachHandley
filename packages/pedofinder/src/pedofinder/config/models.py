"""Configuration models for document processing pipeline."""

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field


class ProcessingConfig(BaseModel):
    """Configuration for document processing pipeline."""

    # LiteLLM settings
    primary_model: str = Field(
        default="ollama/llama3",
        description="Primary LLM model for analysis tasks",
    )
    fallback_model: str | None = Field(
        default="gpt-4-turbo",
        description="Fallback model if primary fails",
    )
    temperature: float = Field(
        default=0.1,
        ge=0.0,
        le=2.0,
        description="Temperature for LLM generation",
    )
    max_tokens: int = Field(
        default=500,
        ge=1,
        le=4000,
        description="Maximum tokens for LLM responses",
    )
    litellm_config_path: Path = Field(
        default=Path("src/pedofinder/config/litellm_config.yaml"),
        description="Path to LiteLLM configuration file",
    )

    # SpaCy settings
    spacy_model: str = Field(
        default="en_core_web_trf",
        description="SpaCy model for NER (transformer-based)",
    )
    entity_types: list[str] = Field(
        default=["PERSON", "ORG", "GPE", "LOC", "DATE", "MONEY", "NORP"],
        description="Entity types to extract",
    )

    # Embeddings settings
    embedding_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="Sentence transformer model for embeddings",
    )
    embedding_batch_size: int = Field(
        default=32,
        ge=1,
        description="Batch size for embedding generation",
    )
    chunk_size: int = Field(
        default=512,
        ge=128,
        le=2048,
        description="Document chunk size for embeddings (tokens)",
    )
    chunk_overlap: int = Field(
        default=50,
        ge=0,
        description="Overlap between chunks (tokens)",
    )

    # Processing settings
    batch_size: int = Field(
        default=10,
        ge=1,
        description="Number of documents to process in parallel",
    )
    skip_existing: bool = Field(
        default=True,
        description="Skip documents that have already been processed",
    )
    max_retries: int = Field(
        default=3,
        ge=0,
        description="Maximum retries for failed operations",
    )
    retry_delay: float = Field(
        default=1.0,
        ge=0.0,
        description="Delay between retries (seconds)",
    )

    # Input/Output directories
    input_dir: Path = Field(
        default=Path("data/pdfs"),
        description="Directory containing input documents",
    )
    output_dir: Path = Field(
        default=Path("data/processed"),
        description="Base directory for processed outputs",
    )

    # Logging settings
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO",
        description="Logging level",
    )
    log_file: Path | None = Field(
        default=Path("data/analysis/processing.log"),
        description="Log file path (None for console only)",
    )

    def get_documents_dir(self) -> Path:
        """Get the documents output directory."""
        return self.output_dir / "documents"

    def get_entities_dir(self) -> Path:
        """Get the entities output directory."""
        return self.output_dir / "entities"

    def get_embeddings_dir(self) -> Path:
        """Get the embeddings output directory."""
        return self.output_dir / "embeddings"

    def get_summaries_dir(self) -> Path:
        """Get the summaries output directory."""
        return self.output_dir / "summaries"

    def ensure_output_dirs(self) -> None:
        """Create all output directories if they don't exist."""
        for dir_getter in [
            self.get_documents_dir,
            self.get_entities_dir,
            self.get_embeddings_dir,
            self.get_summaries_dir,
        ]:
            dir_path = dir_getter()
            dir_path.mkdir(parents=True, exist_ok=True)

    class Config:
        """Pydantic configuration."""

        validate_assignment = True
        frozen = False


class EntityData(BaseModel):
    """Extracted entity information."""

    text: str = Field(description="Entity text")
    label: str = Field(description="Entity type (PERSON, ORG, etc.)")
    start: int = Field(description="Start position in document")
    end: int = Field(description="End position in document")
    confidence: float | None = Field(default=None, description="Confidence score if available")


class DocumentSummary(BaseModel):
    """AI-generated summary and tags for a document."""

    document_id: str = Field(description="Unique document identifier")
    summary: str = Field(description="2-3 sentence summary")
    tags: list[str] = Field(description="Relevant tags for the document")
    key_people: list[dict[str, str]] = Field(
        description="Key people mentioned with roles/context",
        default_factory=list,
    )
    model_used: str = Field(description="LLM model used for generation")
    timestamp: str = Field(description="ISO timestamp of generation")


class DocumentMetadata(BaseModel):
    """Metadata for a processed document."""

    document_id: str = Field(description="Unique document identifier")
    filename: str = Field(description="Original filename")
    file_path: str = Field(description="Path to original file")
    file_size: int = Field(description="File size in bytes")
    text_length: int = Field(description="Length of extracted text")
    num_entities: int = Field(description="Number of entities extracted")
    num_chunks: int = Field(description="Number of embedding chunks")
    processed_at: str = Field(description="ISO timestamp of processing")


class ProcessingResult(BaseModel):
    """Complete processing result for a document."""

    metadata: DocumentMetadata
    entities: list[EntityData]
    summary: DocumentSummary
    embeddings: list[list[float]]
    text_chunks: list[str]
    success: bool = True
    error: str | None = None
