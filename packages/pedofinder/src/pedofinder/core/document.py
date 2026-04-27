"""Document data models."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, computed_field


class DocumentStatus(str, Enum):
    """Document processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Document(BaseModel):
    """Document model for storing processed PDF information."""

    id: str = Field(..., description="Unique document identifier (e.g., HOUSE_OVERSIGHT_010477)")
    filename: str = Field(..., description="Original PDF filename")
    source_collection: str = Field(..., description="Source collection (e.g., HOUSE_OVERSIGHT)")

    # Text content
    raw_text: str = Field(..., description="Raw extracted text from PDF")
    processed_text: str = Field(default="", description="Cleaned and processed text")

    # LLM-generated metadata
    summary: str = Field(default="", description="LLM-generated document summary")
    tags: list[str] = Field(default_factory=list, description="LLM-generated topical tags")
    key_themes: list[str] = Field(default_factory=list, description="Main themes/topics")

    # Entity references (IDs only, not full objects)
    entity_ids: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Entity IDs grouped by type: {people: [...], orgs: [...], locations: [...], dates: [...]}",
    )

    # Document metadata
    word_count: int = Field(default=0, description="Total word count")
    page_count: int = Field(default=1, description="Number of pages in PDF")
    file_size_bytes: int = Field(default=0, description="File size in bytes")

    # Processing metadata
    status: DocumentStatus = Field(default=DocumentStatus.PENDING, description="Processing status")
    processed_at: datetime | None = Field(default=None, description="When document was fully processed")
    error_message: str | None = Field(default=None, description="Error message if processing failed")

    # Vector embedding metadata
    embedding_model: str | None = Field(default=None, description="Model used for embeddings")
    has_embedding: bool = Field(default=False, description="Whether embeddings were generated")

    class Config:
        """Pydantic configuration."""

        use_enum_values = True
        json_schema_extra = {
            "example": {
                "id": "HOUSE_OVERSIGHT_010477",
                "filename": "HOUSE_OVERSIGHT_010477.txt.pdf",
                "source_collection": "HOUSE_OVERSIGHT",
                "raw_text": "This is the document text...",
                "processed_text": "This is cleaned text...",
                "summary": "This document discusses...",
                "tags": ["legal", "testimony", "investigation"],
                "key_themes": ["financial transactions", "witness testimony"],
                "entity_ids": {
                    "people": ["person_123", "person_456"],
                    "orgs": ["org_789"],
                    "locations": ["loc_321"],
                    "dates": ["date_654"],
                },
                "word_count": 5000,
                "page_count": 10,
                "file_size_bytes": 524288,
                "status": "completed",
                "processed_at": "2025-08-19T12:00:00Z",
                "embedding_model": "text-embedding-3-small",
                "has_embedding": True,
            }
        }

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total_entities(self) -> int:
        """Total number of entities referenced in this document."""
        return sum(len(entities) for entities in self.entity_ids.values())

    def add_entity_reference(self, entity_type: str, entity_id: str) -> None:
        """Add an entity reference to this document."""
        if entity_type not in self.entity_ids:
            self.entity_ids[entity_type] = []
        if entity_id not in self.entity_ids[entity_type]:
            self.entity_ids[entity_type].append(entity_id)

    def to_appwrite_dict(self) -> dict[str, Any]:
        """Convert to Appwrite-compatible dictionary."""
        data = self.model_dump(mode="json")
        # Convert datetime to ISO string
        if data.get("processed_at"):
            data["processed_at"] = data["processed_at"]
        # Convert entity_ids dict to JSON string for Appwrite
        data["entity_ids"] = str(self.entity_ids)
        return data

    def to_pinecone_metadata(self) -> dict[str, Any]:
        """Convert to Pinecone metadata (flattened for filtering)."""
        return {
            "id": self.id,
            "filename": self.filename,
            "source_collection": self.source_collection,
            "summary": self.summary[:1000] if self.summary else "",  # Limit metadata size
            "tags": ",".join(self.tags[:10]),  # Limit to 10 tags
            "word_count": self.word_count,
            "page_count": self.page_count,
            "status": self.status.value if isinstance(self.status, Enum) else self.status,
            "total_entities": self.total_entities,
        }


class DocumentChunk(BaseModel):
    """Chunk of a document for embedding and retrieval."""

    chunk_id: str = Field(..., description="Unique chunk identifier")
    document_id: str = Field(..., description="Parent document ID")
    chunk_index: int = Field(..., description="Position in document (0-indexed)")

    text: str = Field(..., description="Chunk text content")
    word_count: int = Field(default=0, description="Words in this chunk")

    # Context for better retrieval
    context_before: str = Field(default="", description="Text before this chunk for context")
    context_after: str = Field(default="", description="Text after this chunk for context")

    # Entities mentioned in this chunk
    entity_mentions: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Entity IDs mentioned in this chunk",
    )

    # Embedding metadata
    has_embedding: bool = Field(default=False, description="Whether embedding was generated")

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "chunk_id": "HOUSE_OVERSIGHT_010477_chunk_0",
                "document_id": "HOUSE_OVERSIGHT_010477",
                "chunk_index": 0,
                "text": "This is the first chunk of text...",
                "word_count": 200,
                "context_before": "",
                "context_after": "This is the second chunk...",
                "entity_mentions": {"people": ["person_123"], "orgs": ["org_789"]},
                "has_embedding": True,
            }
        }

    def to_pinecone_metadata(self) -> dict[str, Any]:
        """Convert to Pinecone metadata."""
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "chunk_index": self.chunk_index,
            "text": self.text[:500],  # Store preview in metadata
            "word_count": self.word_count,
            "entity_count": sum(len(entities) for entities in self.entity_mentions.values()),
        }
