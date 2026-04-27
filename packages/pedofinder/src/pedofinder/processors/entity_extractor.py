"""SpaCy-based entity extraction with pattern matching."""

import logging
import re
from collections import defaultdict

import spacy
from spacy.language import Language
from spacy.matcher import PhraseMatcher
from spacy.tokens import Doc

from pedofinder.config import Settings
from pedofinder.core.entities import EntityMention, EntityType

logger = logging.getLogger(__name__)


class EntityExtractor:
    """Extract named entities using SpaCy with custom pattern matching."""

    # Known entities for pattern matching (expandable)
    KNOWN_PEOPLE = {
        "jeffrey epstein": ["epstein", "jeffrey e. epstein", "j. epstein"],
        "ghislaine maxwell": ["maxwell", "g. maxwell", "ghislaine"],
        "bill clinton": ["clinton", "william j. clinton", "president clinton"],
        "donald trump": ["trump", "donald j. trump", "president trump"],
        "prince andrew": ["andrew", "prince andrew", "duke of york"],
        "alan dershowitz": ["dershowitz", "alan m. dershowitz", "professor dershowitz"],
        "virginia giuffre": ["giuffre", "virginia roberts", "roberts giuffre"],
        "jean-luc brunel": ["brunel", "jean-luc brunel", "jl brunel"],
        "leslie wexner": ["wexner", "les wexner"],
    }

    KNOWN_ORGANIZATIONS = {
        "clinton foundation": ["the clinton foundation", "cf"],
        "fbi": ["federal bureau of investigation"],
        "department of justice": ["doj", "justice department"],
        "victoria's secret": ["victorias secret"],
        "j. epstein & co.": ["epstein & co", "j epstein & co"],
    }

    KNOWN_LOCATIONS = {
        "little st. james": ["little saint james", "epstein island", "lsj"],
        "palm beach": ["palm beach florida"],
        "new york": ["ny", "new york city", "nyc"],
        "us virgin islands": ["usvi", "virgin islands"],
        "paris": ["paris france"],
        "london": ["london uk", "london england"],
    }

    def __init__(self, settings: Settings, model_name: str = "en_core_web_trf") -> None:
        """Initialize entity extractor.

        Args:
            settings: Application settings
            model_name: SpaCy model to use (default: transformer-based)
        """
        self.settings = settings
        self.model_name = model_name

        try:
            self.nlp: Language = spacy.load(model_name)
            logger.info(f"Loaded SpaCy model: {model_name}")
        except OSError:
            logger.error(
                f"SpaCy model '{model_name}' not found. "
                f"Install it with: python -m spacy download {model_name}"
            )
            raise

        # Initialize pattern matchers
        self.people_matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")
        self.org_matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")
        self.location_matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")

        self._setup_pattern_matchers()

    def _setup_pattern_matchers(self) -> None:
        """Set up phrase matchers for known entities."""
        # Add known people patterns
        people_patterns = []
        for name, aliases in self.KNOWN_PEOPLE.items():
            people_patterns.append(self.nlp.make_doc(name))
            for alias in aliases:
                people_patterns.append(self.nlp.make_doc(alias))
        self.people_matcher.add("KNOWN_PEOPLE", people_patterns)

        # Add known organization patterns
        org_patterns = []
        for name, aliases in self.KNOWN_ORGANIZATIONS.items():
            org_patterns.append(self.nlp.make_doc(name))
            for alias in aliases:
                org_patterns.append(self.nlp.make_doc(alias))
        self.org_matcher.add("KNOWN_ORGS", org_patterns)

        # Add known location patterns
        location_patterns = []
        for name, aliases in self.KNOWN_LOCATIONS.items():
            location_patterns.append(self.nlp.make_doc(name))
            for alias in aliases:
                location_patterns.append(self.nlp.make_doc(alias))
        self.location_matcher.add("KNOWN_LOCATIONS", location_patterns)

        logger.info(
            f"Initialized pattern matchers: {len(people_patterns)} people, "
            f"{len(org_patterns)} orgs, {len(location_patterns)} locations"
        )

    def extract_entities(
        self,
        text: str,
        document_id: str,
        chunk_id: str | None = None,
        context_window: int = 100,
    ) -> dict[str, list[EntityMention]]:
        """Extract entities from text.

        Args:
            text: Text to extract entities from
            document_id: Document identifier
            chunk_id: Optional chunk identifier
            context_window: Characters to include in context (before/after)

        Returns:
            Dictionary mapping entity types to lists of EntityMention objects
        """
        # Process text with SpaCy
        doc: Doc = self.nlp(text)

        # Extract entities using SpaCy NER
        spacy_entities = self._extract_spacy_entities(doc, document_id, chunk_id, context_window, text)

        # Extract entities using pattern matching
        pattern_entities = self._extract_pattern_entities(doc, document_id, chunk_id, context_window, text)

        # Merge results (pattern matching takes precedence for known entities)
        merged_entities = self._merge_entity_mentions(spacy_entities, pattern_entities)

        logger.debug(
            f"Extracted entities from {document_id}: "
            f"{sum(len(mentions) for mentions in merged_entities.values())} total mentions"
        )

        return merged_entities

    def _extract_spacy_entities(
        self,
        doc: Doc,
        document_id: str,
        chunk_id: str | None,
        context_window: int,
        original_text: str,
    ) -> dict[str, list[EntityMention]]:
        """Extract entities using SpaCy's NER."""
        entities: dict[str, list[EntityMention]] = defaultdict(list)

        for ent in doc.ents:
            # Map SpaCy labels to our entity types
            entity_type = self._map_spacy_label(ent.label_)
            if entity_type == EntityType.UNKNOWN:
                continue

            # Get context
            context = self._get_context(original_text, ent.start_char, ent.end_char, context_window)

            mention = EntityMention(
                text=ent.text,
                document_id=document_id,
                chunk_id=chunk_id,
                context=context,
                confidence=0.8,  # Default confidence for SpaCy NER
                position=ent.start_char,
            )

            entities[entity_type.value].append(mention)

        return dict(entities)

    def _extract_pattern_entities(
        self,
        doc: Doc,
        document_id: str,
        chunk_id: str | None,
        context_window: int,
        original_text: str,
    ) -> dict[str, list[EntityMention]]:
        """Extract entities using pattern matching."""
        entities: dict[str, list[EntityMention]] = defaultdict(list)

        # Match people
        people_matches = self.people_matcher(doc)
        for match_id, start, end in people_matches:
            span = doc[start:end]
            context = self._get_context(original_text, span.start_char, span.end_char, context_window)

            mention = EntityMention(
                text=span.text,
                document_id=document_id,
                chunk_id=chunk_id,
                context=context,
                confidence=0.95,  # Higher confidence for known entities
                position=span.start_char,
            )
            entities[EntityType.PERSON.value].append(mention)

        # Match organizations
        org_matches = self.org_matcher(doc)
        for match_id, start, end in org_matches:
            span = doc[start:end]
            context = self._get_context(original_text, span.start_char, span.end_char, context_window)

            mention = EntityMention(
                text=span.text,
                document_id=document_id,
                chunk_id=chunk_id,
                context=context,
                confidence=0.95,
                position=span.start_char,
            )
            entities[EntityType.ORGANIZATION.value].append(mention)

        # Match locations
        location_matches = self.location_matcher(doc)
        for match_id, start, end in location_matches:
            span = doc[start:end]
            context = self._get_context(original_text, span.start_char, span.end_char, context_window)

            mention = EntityMention(
                text=span.text,
                document_id=document_id,
                chunk_id=chunk_id,
                context=context,
                confidence=0.95,
                position=span.start_char,
            )
            entities[EntityType.LOCATION.value].append(mention)

        return dict(entities)

    def _merge_entity_mentions(
        self,
        spacy_entities: dict[str, list[EntityMention]],
        pattern_entities: dict[str, list[EntityMention]],
    ) -> dict[str, list[EntityMention]]:
        """Merge entity mentions from different sources, preferring pattern matches.

        Args:
            spacy_entities: Entities from SpaCy NER
            pattern_entities: Entities from pattern matching

        Returns:
            Merged entity mentions
        """
        merged: dict[str, list[EntityMention]] = defaultdict(list)

        # Add pattern entities (higher confidence)
        for entity_type, mentions in pattern_entities.items():
            merged[entity_type].extend(mentions)

        # Add SpaCy entities if they don't overlap with pattern matches
        for entity_type, mentions in spacy_entities.items():
            pattern_positions = {m.position for m in pattern_entities.get(entity_type, [])}

            for mention in mentions:
                # Check for overlap with pattern matches (within 5 characters)
                if not any(abs(mention.position - pos) < 5 for pos in pattern_positions):
                    merged[entity_type].append(mention)

        # Sort by position
        for entity_type in merged:
            merged[entity_type] = sorted(merged[entity_type], key=lambda m: m.position)

        return dict(merged)

    def _map_spacy_label(self, label: str) -> EntityType:
        """Map SpaCy entity labels to our entity types.

        Args:
            label: SpaCy entity label

        Returns:
            EntityType enum value
        """
        mapping = {
            "PERSON": EntityType.PERSON,
            "ORG": EntityType.ORGANIZATION,
            "GPE": EntityType.LOCATION,  # Geo-political entity
            "LOC": EntityType.LOCATION,
            "FAC": EntityType.LOCATION,  # Facility
            "DATE": EntityType.DATE,
            "TIME": EntityType.DATE,
            "EVENT": EntityType.EVENT,
        }
        return mapping.get(label, EntityType.UNKNOWN)

    def _get_context(
        self,
        text: str,
        start_pos: int,
        end_pos: int,
        window: int,
    ) -> str:
        """Get surrounding context for an entity mention.

        Args:
            text: Full text
            start_pos: Start position of entity
            end_pos: End position of entity
            window: Number of characters to include before/after

        Returns:
            Context string
        """
        context_start = max(0, start_pos - window)
        context_end = min(len(text), end_pos + window)

        context = text[context_start:context_end]

        # Clean up whitespace
        context = re.sub(r"\s+", " ", context).strip()

        return context

    def normalize_entity_name(self, name: str, entity_type: EntityType) -> str:
        """Normalize an entity name for deduplication.

        Args:
            name: Entity name
            entity_type: Type of entity

        Returns:
            Normalized name
        """
        # Basic normalization
        normalized = name.lower().strip()

        # Remove common prefixes/suffixes for people
        if entity_type == EntityType.PERSON:
            # Remove titles
            titles = ["mr.", "mrs.", "ms.", "dr.", "prof.", "president", "senator", "representative"]
            for title in titles:
                normalized = re.sub(rf"\b{title}\s+", "", normalized, flags=re.IGNORECASE)

        # Remove extra whitespace
        normalized = re.sub(r"\s+", " ", normalized)

        return normalized.strip()

    def batch_extract(
        self,
        texts: list[str],
        document_ids: list[str],
        chunk_ids: list[str | None] | None = None,
    ) -> list[dict[str, list[EntityMention]]]:
        """Extract entities from multiple texts.

        Args:
            texts: List of texts
            document_ids: List of document IDs
            chunk_ids: Optional list of chunk IDs

        Returns:
            List of entity mention dictionaries
        """
        if len(texts) != len(document_ids):
            raise ValueError("Number of texts must match number of document IDs")

        if chunk_ids is None:
            chunk_ids = [None] * len(texts)
        elif len(chunk_ids) != len(texts):
            raise ValueError("Number of chunk IDs must match number of texts")

        results = []
        for text, doc_id, chunk_id in zip(texts, document_ids, chunk_ids):
            entities = self.extract_entities(text, doc_id, chunk_id)
            results.append(entities)

        return results
