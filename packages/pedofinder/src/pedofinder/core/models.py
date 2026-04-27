"""Core Pydantic models for entities, relationships, and documents."""

from datetime import datetime
from enum import Enum
from typing import Annotated
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, ValidationInfo, field_validator


class EntityType(str, Enum):
    """Types of entities that can be extracted."""

    PERSON = "person"
    ORGANIZATION = "organization"
    LOCATION = "location"
    EVENT = "event"


class RelationshipType(str, Enum):
    """Types of relationships between entities."""

    # Person-Person relationships
    ASSOCIATE = "associate"
    EMPLOYEE = "employee"
    EMPLOYER = "employer"
    FAMILY = "family"
    FRIEND = "friend"
    BUSINESS_PARTNER = "business_partner"

    # Person-Organization relationships
    MEMBER = "member"
    OWNER = "owner"
    AFFILIATED = "affiliated"

    # Person-Location relationships
    VISITED = "visited"
    OWNED_PROPERTY = "owned_property"
    RESIDED = "resided"

    # Person-Event relationships
    ATTENDED = "attended"
    ORGANIZED = "organized"
    WITNESSED = "witnessed"
    MENTIONED_IN = "mentioned_in"

    # Generic
    RELATED = "related"
    UNKNOWN = "unknown"


class Entity(BaseModel):
    """Base model for all entities extracted from documents."""

    id: Annotated[UUID, Field(default_factory=uuid4)]
    name: Annotated[str, Field(min_length=1, max_length=500)]
    entity_type: EntityType
    aliases: Annotated[list[str], Field(default_factory=list)]
    confidence_score: Annotated[float, Field(ge=0.0, le=1.0, default=0.5)]
    source_document_id: Annotated[UUID | None, Field(default=None)]
    source_page_numbers: Annotated[list[int], Field(default_factory=list)]
    context_snippet: Annotated[str | None, Field(default=None, max_length=2000)]
    created_at: Annotated[datetime, Field(default_factory=datetime.utcnow)]
    updated_at: Annotated[datetime, Field(default_factory=datetime.utcnow)]
    metadata: Annotated[dict[str, str | int | float | bool], Field(default_factory=dict)]

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        """Normalize entity name by stripping whitespace."""
        return v.strip()

    @field_validator("aliases")
    @classmethod
    def normalize_aliases(cls, v: list[str]) -> list[str]:
        """Normalize aliases and remove duplicates."""
        return list({alias.strip() for alias in v if alias.strip()})


class Person(Entity):
    """Model for person entities."""

    entity_type: Annotated[EntityType, Field(default=EntityType.PERSON)] = EntityType.PERSON
    roles: Annotated[list[str], Field(default_factory=list)]
    date_of_birth: Annotated[str | None, Field(default=None)]
    nationality: Annotated[str | None, Field(default=None)]
    occupation: Annotated[str | None, Field(default=None)]

    @field_validator("roles")
    @classmethod
    def normalize_roles(cls, v: list[str]) -> list[str]:
        """Normalize roles and remove duplicates."""
        return list({role.strip().lower() for role in v if role.strip()})


class Organization(Entity):
    """Model for organization entities."""

    entity_type: Annotated[EntityType, Field(default=EntityType.ORGANIZATION)] = EntityType.ORGANIZATION
    organization_type: Annotated[str | None, Field(default=None)]  # Company, Institution, Government Agency
    founded_date: Annotated[str | None, Field(default=None)]
    headquarters: Annotated[str | None, Field(default=None)]
    industry: Annotated[str | None, Field(default=None)]


class Location(Entity):
    """Model for location entities."""

    entity_type: Annotated[EntityType, Field(default=EntityType.LOCATION)] = EntityType.LOCATION
    address: Annotated[str | None, Field(default=None, max_length=1000)]
    city: Annotated[str | None, Field(default=None)]
    state: Annotated[str | None, Field(default=None)]
    country: Annotated[str | None, Field(default=None)]
    coordinates: Annotated[tuple[float, float] | None, Field(default=None)]  # (latitude, longitude)
    location_type: Annotated[str | None, Field(default=None)]  # Property, Island, Building, etc.


class Event(Entity):
    """Model for event entities."""

    entity_type: Annotated[EntityType, Field(default=EntityType.EVENT)] = EntityType.EVENT
    event_date: Annotated[str | None, Field(default=None)]
    event_type: Annotated[str | None, Field(default=None)]  # Flight, Meeting, Incident, etc.
    participants: Annotated[list[UUID], Field(default_factory=list)]  # IDs of Person entities
    location_id: Annotated[UUID | None, Field(default=None)]
    description: Annotated[str | None, Field(default=None, max_length=5000)]


class Relationship(BaseModel):
    """Model for relationships between entities."""

    id: Annotated[UUID, Field(default_factory=uuid4)]
    source_entity_id: UUID
    target_entity_id: UUID
    relationship_type: RelationshipType
    confidence_score: Annotated[float, Field(ge=0.0, le=1.0, default=0.5)]
    source_document_id: Annotated[UUID | None, Field(default=None)]
    source_page_numbers: Annotated[list[int], Field(default_factory=list)]
    context_snippet: Annotated[str | None, Field(default=None, max_length=2000)]
    date_range: Annotated[tuple[str, str] | None, Field(default=None)]  # (start, end) dates
    created_at: Annotated[datetime, Field(default_factory=datetime.utcnow)]
    updated_at: Annotated[datetime, Field(default_factory=datetime.utcnow)]
    metadata: Annotated[dict[str, str | int | float | bool], Field(default_factory=dict)]

    @field_validator("target_entity_id")
    @classmethod
    def validate_different_entities(cls, v: UUID, info: ValidationInfo) -> UUID:
        """Ensure source and target are different entities."""
        if info.data.get("source_entity_id") == v:
            msg = "Source and target entities must be different"
            raise ValueError(msg)
        return v


class Document(BaseModel):
    """Model for source documents (PDFs)."""

    id: Annotated[UUID, Field(default_factory=uuid4)]
    title: Annotated[str, Field(min_length=1, max_length=1000)]
    source_url: Annotated[str | None, Field(default=None, max_length=2000)]
    pinpoint_doc_id: Annotated[str | None, Field(default=None)]
    file_path: Annotated[str, Field(min_length=1, max_length=2000)]
    file_hash: Annotated[str | None, Field(default=None)]  # SHA256 hash
    page_count: Annotated[int, Field(ge=1)]
    document_date: Annotated[str | None, Field(default=None)]
    document_type: Annotated[str | None, Field(default=None)]  # Court filing, deposition, etc.
    ocr_processed: Annotated[bool, Field(default=False)]
    entities_extracted: Annotated[bool, Field(default=False)]
    created_at: Annotated[datetime, Field(default_factory=datetime.utcnow)]
    updated_at: Annotated[datetime, Field(default_factory=datetime.utcnow)]
    metadata: Annotated[dict[str, str | int | float | bool], Field(default_factory=dict)]


class DocumentChunk(BaseModel):
    """Model for document chunks used in processing."""

    id: Annotated[UUID, Field(default_factory=uuid4)]
    document_id: UUID
    chunk_index: Annotated[int, Field(ge=0)]
    text: Annotated[str, Field(min_length=1)]
    page_numbers: Annotated[list[int], Field(default_factory=list)]
    char_start: Annotated[int, Field(ge=0)]
    char_end: Annotated[int, Field(gt=0)]
    embedding: Annotated[list[float] | None, Field(default=None)]
    created_at: Annotated[datetime, Field(default_factory=datetime.utcnow)]

    @field_validator("char_end")
    @classmethod
    def validate_char_range(cls, v: int, info: ValidationInfo) -> int:
        """Ensure char_end is greater than char_start."""
        if v <= info.data.get("char_start", 0):
            msg = "char_end must be greater than char_start"
            raise ValueError(msg)
        return v
