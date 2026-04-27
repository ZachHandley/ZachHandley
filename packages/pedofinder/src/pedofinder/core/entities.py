"""Entity data models."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, computed_field


class EntityType(str, Enum):
    """Entity type classification."""

    PERSON = "person"
    ORGANIZATION = "organization"
    LOCATION = "location"
    DATE = "date"
    EVENT = "event"
    UNKNOWN = "unknown"


class EntityMention(BaseModel):
    """Single mention of an entity in a document."""

    text: str = Field(..., description="The exact text as it appears in document")
    document_id: str = Field(..., description="Document where entity was mentioned")
    chunk_id: str | None = Field(default=None, description="Specific chunk if available")
    context: str = Field(default="", description="Surrounding text for context")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Extraction confidence (0-1)")
    position: int = Field(default=0, description="Character position in document")


class Entity(BaseModel):
    """Base entity model for all entity types."""

    id: str = Field(..., description="Unique entity identifier")
    entity_type: EntityType = Field(..., description="Type of entity")

    # Primary name/label
    name: str = Field(..., description="Primary name/label for this entity")
    normalized_name: str = Field(..., description="Normalized version for matching")

    # Aliases and variations
    aliases: list[str] = Field(default_factory=list, description="Alternative names/spellings")

    # Document references
    mention_count: int = Field(default=0, description="Total number of mentions across all documents")
    document_ids: list[str] = Field(default_factory=list, description="Documents where entity appears")
    mentions: list[EntityMention] = Field(default_factory=list, description="All mentions with context")

    # LLM-generated metadata
    description: str = Field(default="", description="LLM-generated entity description")
    tags: list[str] = Field(default_factory=list, description="Descriptive tags")

    # Confidence and verification
    average_confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Average extraction confidence")
    verified: bool = Field(default=False, description="Whether entity has been manually verified")

    # Timestamps
    first_seen: datetime | None = Field(default=None, description="When first extracted")
    last_updated: datetime | None = Field(default=None, description="Last modification")

    class Config:
        """Pydantic configuration."""

        use_enum_values = True

    @computed_field  # type: ignore[prop-decorator]
    @property
    def document_count(self) -> int:
        """Number of unique documents mentioning this entity."""
        return len(self.document_ids)

    def add_mention(self, mention: EntityMention) -> None:
        """Add a new mention and update metadata."""
        self.mentions.append(mention)
        self.mention_count += 1

        # Update document list
        if mention.document_id not in self.document_ids:
            self.document_ids.append(mention.document_id)

        # Update average confidence
        total_confidence = sum(m.confidence for m in self.mentions)
        self.average_confidence = total_confidence / len(self.mentions)


class EntityPerson(Entity):
    """Person entity with additional person-specific fields."""

    entity_type: EntityType = Field(default=EntityType.PERSON, frozen=True)

    # Person-specific metadata
    titles: list[str] = Field(default_factory=list, description="Professional titles (e.g., Mr., Dr., CEO)")
    occupations: list[str] = Field(default_factory=list, description="Known occupations/roles")
    affiliations: list[str] = Field(default_factory=list, description="Organization affiliations")

    # Known associates (entity IDs)
    related_people: list[str] = Field(default_factory=list, description="Related person entity IDs")
    related_orgs: list[str] = Field(default_factory=list, description="Related organization entity IDs")

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "id": "person_jeffrey_epstein",
                "entity_type": "person",
                "name": "Jeffrey Epstein",
                "normalized_name": "jeffrey epstein",
                "aliases": ["Jeffrey E. Epstein", "J. Epstein", "Epstein"],
                "mention_count": 150,
                "document_ids": ["HOUSE_OVERSIGHT_010477", "HOUSE_OVERSIGHT_010486"],
                "titles": ["Mr."],
                "occupations": ["Financier"],
                "affiliations": ["J. Epstein & Co."],
                "description": "American financier and convicted sex offender",
                "tags": ["financier", "convicted", "deceased"],
                "average_confidence": 0.95,
                "verified": True,
            }
        }


class EntityOrganization(Entity):
    """Organization entity with additional org-specific fields."""

    entity_type: EntityType = Field(default=EntityType.ORGANIZATION, frozen=True)

    # Organization-specific metadata
    org_type: str | None = Field(default=None, description="Type of organization (e.g., company, government)")
    industry: str | None = Field(default=None, description="Industry/sector")
    location: str | None = Field(default=None, description="Primary location")

    # Related entities
    related_people: list[str] = Field(default_factory=list, description="Related person entity IDs")
    related_orgs: list[str] = Field(default_factory=list, description="Related organization entity IDs")

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "id": "org_clinton_foundation",
                "entity_type": "organization",
                "name": "Clinton Foundation",
                "normalized_name": "clinton foundation",
                "aliases": ["The Clinton Foundation", "CF"],
                "mention_count": 45,
                "document_ids": ["HOUSE_OVERSIGHT_010477"],
                "org_type": "non-profit",
                "industry": "charity",
                "location": "New York",
                "description": "Non-profit organization founded by Bill Clinton",
                "tags": ["charity", "non-profit", "political"],
                "average_confidence": 0.92,
                "verified": True,
            }
        }


class EntityLocation(Entity):
    """Location entity with additional location-specific fields."""

    entity_type: EntityType = Field(default=EntityType.LOCATION, frozen=True)

    # Location-specific metadata
    location_type: str | None = Field(default=None, description="Type (e.g., city, country, address)")
    country: str | None = Field(default=None, description="Country")
    coordinates: tuple[float, float] | None = Field(default=None, description="GPS coordinates (lat, lon)")

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "id": "loc_little_st_james",
                "entity_type": "location",
                "name": "Little St. James",
                "normalized_name": "little st james",
                "aliases": ["Little Saint James", "Epstein Island"],
                "mention_count": 78,
                "document_ids": ["HOUSE_OVERSIGHT_010477", "HOUSE_OVERSIGHT_010486"],
                "location_type": "island",
                "country": "US Virgin Islands",
                "description": "Private island owned by Jeffrey Epstein",
                "tags": ["island", "private property", "investigation site"],
                "average_confidence": 0.98,
                "verified": True,
            }
        }


class EntityDate(Entity):
    """Date/temporal entity."""

    entity_type: EntityType = Field(default=EntityType.DATE, frozen=True)

    # Date-specific metadata
    parsed_date: datetime | None = Field(default=None, description="Parsed datetime if available")
    date_type: str | None = Field(default=None, description="Type (e.g., exact, range, approximate)")

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "id": "date_2019_08_10",
                "entity_type": "date",
                "name": "August 10, 2019",
                "normalized_name": "2019-08-10",
                "aliases": ["8/10/2019", "Aug 10 2019"],
                "mention_count": 25,
                "document_ids": ["HOUSE_OVERSIGHT_010477"],
                "parsed_date": "2019-08-10T00:00:00Z",
                "date_type": "exact",
                "description": "Date of Jeffrey Epstein's death",
                "tags": ["significant event", "death"],
                "average_confidence": 1.0,
                "verified": True,
            }
        }


class EntityRelationship(BaseModel):
    """Relationship between two entities."""

    id: str = Field(..., description="Unique relationship identifier")

    # Entities involved
    source_entity_id: str = Field(..., description="Source entity ID")
    source_entity_type: EntityType = Field(..., description="Source entity type")
    target_entity_id: str = Field(..., description="Target entity ID")
    target_entity_type: EntityType = Field(..., description="Target entity type")

    # Relationship metadata
    relationship_type: str = Field(..., description="Type of relationship (e.g., 'employed_by', 'located_at')")
    description: str = Field(default="", description="Description of the relationship")

    # Evidence
    document_ids: list[str] = Field(default_factory=list, description="Documents supporting this relationship")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence in this relationship")

    # Temporal
    start_date: datetime | None = Field(default=None, description="When relationship began")
    end_date: datetime | None = Field(default=None, description="When relationship ended")

    # Verification
    verified: bool = Field(default=False, description="Whether relationship has been verified")
    created_at: datetime | None = Field(default=None, description="When relationship was created")

    class Config:
        """Pydantic configuration."""

        use_enum_values = True
        json_schema_extra = {
            "example": {
                "id": "rel_epstein_clinton_foundation",
                "source_entity_id": "person_jeffrey_epstein",
                "source_entity_type": "person",
                "target_entity_id": "org_clinton_foundation",
                "target_entity_type": "organization",
                "relationship_type": "donor_to",
                "description": "Jeffrey Epstein made donations to Clinton Foundation",
                "document_ids": ["HOUSE_OVERSIGHT_010477", "HOUSE_OVERSIGHT_010486"],
                "confidence": 0.95,
                "verified": True,
            }
        }
