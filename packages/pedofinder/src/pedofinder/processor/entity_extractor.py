"""Entity extraction using SpaCy NER."""

import logging
from pathlib import Path
from typing import Any

import spacy
from spacy.language import Language

from pedofinder.config.models import EntityData

logger = logging.getLogger(__name__)


class EntityExtractor:
    """Extract named entities from text using SpaCy."""

    def __init__(
        self,
        model_name: str = "en_core_web_trf",
        entity_types: list[str] | None = None,
    ) -> None:
        """Initialize the entity extractor.

        Args:
            model_name: SpaCy model to use for NER
            entity_types: List of entity types to extract (None = all types)
        """
        self.model_name = model_name
        self.entity_types = set(entity_types) if entity_types else None
        self._nlp: Language | None = None
        logger.info(f"Initialized EntityExtractor with model: {model_name}")

    def _load_model(self) -> Language:
        """Load the SpaCy model lazily.

        Returns:
            Loaded SpaCy language model

        Raises:
            OSError: If model is not installed
        """
        if self._nlp is None:
            try:
                logger.info(f"Loading SpaCy model: {self.model_name}")
                self._nlp = spacy.load(self.model_name)
                logger.info("SpaCy model loaded successfully")
            except OSError as e:
                error_msg = (
                    f"SpaCy model '{self.model_name}' not found. "
                    f"Install it with: python -m spacy download {self.model_name}"
                )
                logger.error(error_msg)
                raise OSError(error_msg) from e
        return self._nlp

    def extract_entities(self, text: str) -> list[EntityData]:
        """Extract named entities from text.

        Args:
            text: Input text to process

        Returns:
            List of extracted entities with metadata
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for entity extraction")
            return []

        nlp = self._load_model()

        # Process the text
        doc = nlp(text)

        # Extract entities
        entities: list[EntityData] = []
        for ent in doc.ents:
            # Filter by entity type if specified
            if self.entity_types and ent.label_ not in self.entity_types:
                continue

            entity = EntityData(
                text=ent.text,
                label=ent.label_,
                start=ent.start_char,
                end=ent.end_char,
                confidence=None,  # SpaCy doesn't provide confidence by default
            )
            entities.append(entity)

        logger.info(f"Extracted {len(entities)} entities from text ({len(text)} chars)")
        return entities

    def extract_entities_with_context(
        self,
        text: str,
        context_window: int = 50,
    ) -> list[dict[str, Any]]:
        """Extract entities with surrounding context.

        Args:
            text: Input text to process
            context_window: Number of characters before/after entity to include

        Returns:
            List of entities with context snippets
        """
        entities = self.extract_entities(text)

        entities_with_context: list[dict[str, Any]] = []
        for entity in entities:
            # Get context window
            start_ctx = max(0, entity.start - context_window)
            end_ctx = min(len(text), entity.end + context_window)

            context = text[start_ctx:end_ctx]

            entities_with_context.append(
                {
                    "entity": entity.model_dump(),
                    "context": context,
                    "context_start": start_ctx,
                    "context_end": end_ctx,
                }
            )

        return entities_with_context

    def get_entity_statistics(self, entities: list[EntityData]) -> dict[str, Any]:
        """Calculate statistics about extracted entities.

        Args:
            entities: List of extracted entities

        Returns:
            Dictionary with entity statistics
        """
        if not entities:
            return {
                "total_entities": 0,
                "unique_entities": 0,
                "entity_types": {},
                "most_common_entities": [],
            }

        # Count entity types
        entity_types: dict[str, int] = {}
        entity_texts: dict[str, int] = {}

        for entity in entities:
            entity_types[entity.label] = entity_types.get(entity.label, 0) + 1
            entity_texts[entity.text] = entity_texts.get(entity.text, 0) + 1

        # Sort most common entities
        most_common = sorted(
            entity_texts.items(),
            key=lambda x: x[1],
            reverse=True,
        )[:10]

        return {
            "total_entities": len(entities),
            "unique_entities": len(entity_texts),
            "entity_types": entity_types,
            "most_common_entities": [
                {"text": text, "count": count} for text, count in most_common
            ],
        }

    def extract_from_file(self, file_path: Path) -> list[EntityData]:
        """Extract entities from a text file.

        Args:
            file_path: Path to the text file

        Returns:
            List of extracted entities

        Raises:
            FileNotFoundError: If file doesn't exist
            UnicodeDecodeError: If file encoding is invalid
        """
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        logger.info(f"Extracting entities from file: {file_path}")

        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError as e:
            logger.error(f"Unicode decode error reading {file_path}: {e}")
            raise

        return self.extract_entities(text)

    def __repr__(self) -> str:
        """String representation of the extractor."""
        return f"EntityExtractor(model={self.model_name}, types={self.entity_types})"
