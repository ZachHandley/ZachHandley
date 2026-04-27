"""LLM processor using LiteLLM for document summarization and tagging."""

import json
import logging
from typing import Any

import litellm
from pydantic import BaseModel, Field

from pedofinder.config import Settings

logger = logging.getLogger(__name__)


class DocumentAnalysis(BaseModel):
    """LLM analysis output for a document."""

    summary: str = Field(..., description="Concise summary of the document content")
    key_themes: list[str] = Field(..., description="Main themes or topics discussed")
    tags: list[str] = Field(..., description="Topical tags for categorization")
    entities_mentioned: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Key entities mentioned by type (people, orgs, locations)",
    )
    relevance_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Relevance to Epstein investigation (0-1)",
    )


class LLMProcessor:
    """Process documents using LiteLLM for summarization and metadata extraction."""

    def __init__(self, settings: Settings) -> None:
        """Initialize LLM processor.

        Args:
            settings: Application settings
        """
        self.settings = settings
        self.model = settings.litellm_model

        # Configure LiteLLM
        if settings.openai_api_key:
            litellm.openai_key = settings.openai_api_key
        if settings.anthropic_api_key:
            litellm.anthropic_key = settings.anthropic_api_key

        # Set API base for local models
        if self.model.startswith("ollama/"):
            litellm.api_base = settings.local_llm_url

        logger.info(f"Initialized LLM processor with model: {self.model}")

    def analyze_document(
        self,
        text: str,
        document_id: str,
        max_retries: int = 3,
    ) -> DocumentAnalysis:
        """Analyze a document to extract summary, themes, tags, and entities.

        Args:
            text: Document text to analyze
            document_id: Document identifier for logging
            max_retries: Maximum number of retry attempts

        Returns:
            DocumentAnalysis with extracted metadata

        Raises:
            Exception: If analysis fails after all retries
        """
        # Truncate text if too long (keep first ~6000 words for analysis)
        words = text.split()
        if len(words) > 6000:
            truncated_text = " ".join(words[:6000]) + "\n\n[Document truncated for analysis]"
            logger.warning(f"Document {document_id} truncated from {len(words)} to 6000 words for LLM analysis")
        else:
            truncated_text = text

        system_prompt = self._get_system_prompt()
        user_prompt = self._get_user_prompt(truncated_text)

        for attempt in range(max_retries):
            try:
                logger.info(f"Analyzing document {document_id} (attempt {attempt + 1}/{max_retries})")

                response = litellm.completion(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.3,  # Lower temperature for more consistent output
                    max_tokens=1500,  # Sufficient for analysis output
                    response_format={"type": "json_object"} if not self.model.startswith("ollama/") else None,
                )

                # Extract response content
                content = response.choices[0].message.content
                if not content:
                    raise ValueError("Empty response from LLM")

                # Parse JSON response
                analysis_data = self._parse_llm_response(content)

                # Validate and return
                analysis = DocumentAnalysis(**analysis_data)
                logger.info(f"Successfully analyzed document {document_id}")
                return analysis

            except Exception as e:
                logger.warning(f"LLM analysis attempt {attempt + 1} failed for {document_id}: {e}")
                if attempt == max_retries - 1:
                    logger.error(f"All LLM analysis attempts failed for {document_id}")
                    # Return minimal analysis on failure
                    return DocumentAnalysis(
                        summary="Failed to generate summary",
                        key_themes=[],
                        tags=["processing_failed"],
                        entities_mentioned={},
                        relevance_score=0.0,
                    )

        # Should never reach here, but for type safety
        return DocumentAnalysis(
            summary="Failed to generate summary",
            key_themes=[],
            tags=["processing_failed"],
            entities_mentioned={},
            relevance_score=0.0,
        )

    def _get_system_prompt(self) -> str:
        """Get the system prompt for document analysis."""
        return """You are an expert document analyst specializing in legal and investigative documents.
Your task is to analyze documents related to the Jeffrey Epstein investigation and extract structured metadata.

You must respond with ONLY a valid JSON object (no markdown, no other text) with this exact structure:
{
  "summary": "A concise 2-3 sentence summary of the document's main content",
  "key_themes": ["theme1", "theme2", "theme3"],
  "tags": ["tag1", "tag2", "tag3"],
  "entities_mentioned": {
    "people": ["Person Name 1", "Person Name 2"],
    "organizations": ["Organization 1", "Organization 2"],
    "locations": ["Location 1", "Location 2"]
  },
  "relevance_score": 0.85
}

Guidelines:
- summary: Focus on what happened, when, who was involved, and why it matters
- key_themes: Major topics (e.g., "financial transactions", "witness testimony", "legal proceedings")
- tags: Descriptive keywords (e.g., "testimony", "emails", "flight logs", "financial records")
- entities_mentioned: Extract key people, organizations, and locations mentioned
- relevance_score: 0.0-1.0 indicating relevance to Epstein investigation (1.0 = highly relevant)

Be thorough but concise. Focus on facts and avoid speculation."""

    def _get_user_prompt(self, text: str) -> str:
        """Get the user prompt with document text.

        Args:
            text: Document text to analyze

        Returns:
            Formatted user prompt
        """
        return f"""Analyze the following document and provide structured metadata in JSON format.

Document:
{text}

Remember to respond with ONLY the JSON object, no additional text or markdown."""

    def _parse_llm_response(self, content: str) -> dict[str, Any]:
        """Parse LLM response content into a dictionary.

        Args:
            content: Raw LLM response content

        Returns:
            Parsed dictionary

        Raises:
            ValueError: If content cannot be parsed as JSON
        """
        # Clean up content - remove markdown code blocks if present
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]  # Remove ```json
        if content.startswith("```"):
            content = content[3:]  # Remove ```
        if content.endswith("```"):
            content = content[:-3]  # Remove trailing ```
        content = content.strip()

        try:
            data = json.loads(content)
            return data
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.debug(f"Raw content: {content}")
            raise ValueError(f"Invalid JSON response from LLM: {e}") from e

    def extract_entities_batch(
        self,
        texts: list[str],
        document_ids: list[str],
    ) -> list[DocumentAnalysis]:
        """Analyze multiple documents in sequence.

        Args:
            texts: List of document texts
            document_ids: List of document identifiers

        Returns:
            List of DocumentAnalysis objects
        """
        if len(texts) != len(document_ids):
            raise ValueError("Number of texts must match number of document IDs")

        results: list[DocumentAnalysis] = []
        for text, doc_id in zip(texts, document_ids):
            analysis = self.analyze_document(text, doc_id)
            results.append(analysis)

        return results
