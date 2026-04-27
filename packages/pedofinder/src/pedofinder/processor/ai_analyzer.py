"""AI-powered document analysis using LiteLLM."""

import json
import logging
import time
from datetime import UTC, datetime

from litellm import completion
from litellm.exceptions import (
    APIConnectionError,
    RateLimitError,
    ServiceUnavailableError,
)

from pedofinder.config.models import DocumentSummary

logger = logging.getLogger(__name__)


class AIAnalyzer:
    """Analyze documents using LLM models via LiteLLM."""

    def __init__(
        self,
        primary_model: str = "ollama/llama3",
        fallback_model: str | None = "gpt-4-turbo",
        temperature: float = 0.1,
        max_tokens: int = 500,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ) -> None:
        """Initialize the AI analyzer.

        Args:
            primary_model: Primary LLM model to use
            fallback_model: Fallback model if primary fails
            temperature: Temperature for generation (0.0-2.0)
            max_tokens: Maximum tokens in response
            max_retries: Maximum retry attempts
            retry_delay: Delay between retries in seconds
        """
        self.primary_model = primary_model
        self.fallback_model = fallback_model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.max_retries = max_retries
        self.retry_delay = retry_delay

        logger.info(
            f"Initialized AIAnalyzer with primary={primary_model}, "
            f"fallback={fallback_model}"
        )

    def _call_llm(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
    ) -> str:
        """Call LLM with retry logic.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model to use (None = primary model)

        Returns:
            Generated text response

        Raises:
            Exception: If all retries fail
        """
        use_model = model or self.primary_model
        last_error: Exception | None = None

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.debug(
                    f"Calling LLM: model={use_model}, attempt={attempt}/{self.max_retries}"
                )

                response = completion(
                    model=use_model,
                    messages=messages,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                )

                # Extract text from response
                if hasattr(response, "choices") and len(response.choices) > 0:
                    content = response.choices[0].message.content
                    if content:
                        logger.debug(f"LLM response received ({len(content)} chars)")
                        return str(content).strip()

                raise ValueError("Empty response from LLM")

            except (APIConnectionError, ServiceUnavailableError) as e:
                last_error = e
                logger.warning(
                    f"Connection error on attempt {attempt}/{self.max_retries}: {e}"
                )

                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * attempt)
                    continue

            except RateLimitError as e:
                last_error = e
                logger.warning(f"Rate limit hit on attempt {attempt}: {e}")

                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * attempt * 2)  # Longer delay for rate limits
                    continue

            except Exception as e:
                last_error = e
                logger.error(f"Error calling LLM: {e}")
                break

        # If we've exhausted retries on primary model, try fallback
        if self.fallback_model and use_model != self.fallback_model:
            logger.warning(
                f"Primary model {use_model} failed, trying fallback {self.fallback_model}"
            )
            try:
                return self._call_llm(messages, model=self.fallback_model)
            except Exception as e:
                logger.error(f"Fallback model also failed: {e}")
                raise

        # All attempts failed
        error_msg = f"Failed to get LLM response after {self.max_retries} attempts"
        if last_error:
            raise Exception(error_msg) from last_error
        raise Exception(error_msg)

    def summarize(self, text: str, max_sentences: int = 3) -> str:
        """Generate a concise summary of the document.

        Args:
            text: Document text to summarize
            max_sentences: Maximum sentences in summary

        Returns:
            Generated summary text
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for summarization")
            return ""

        # Truncate very long texts to avoid token limits
        max_chars = 8000  # Conservative limit
        truncated_text = text[:max_chars]
        if len(text) > max_chars:
            logger.info(f"Text truncated from {len(text)} to {max_chars} chars")

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a legal document analyst. Provide concise, factual summaries "
                    "of court documents and legal filings."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Summarize this document in exactly {max_sentences} sentences. "
                    f"Focus on key facts, people, and events:\n\n{truncated_text}"
                ),
            },
        ]

        summary = self._call_llm(messages)
        logger.info(f"Generated summary ({len(summary)} chars)")
        return summary

    def generate_tags(self, text: str, num_tags: int = 10) -> list[str]:
        """Generate relevant tags for the document.

        Args:
            text: Document text to analyze
            num_tags: Target number of tags

        Returns:
            List of relevant tags
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for tag generation")
            return []

        # Truncate very long texts
        max_chars = 8000
        truncated_text = text[:max_chars]

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a document classification expert. Generate relevant tags "
                    "that capture the key topics, themes, and categories of documents."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Generate {num_tags} relevant tags for this document. "
                    "Return ONLY a JSON array of strings, no other text. "
                    f"Example: [\"tag1\", \"tag2\", \"tag3\"]\n\n{truncated_text}"
                ),
            },
        ]

        response = self._call_llm(messages)

        # Parse JSON response
        try:
            # Try to extract JSON array from response
            if "[" in response and "]" in response:
                json_start = response.index("[")
                json_end = response.rindex("]") + 1
                json_str = response[json_start:json_end]
                tags = json.loads(json_str)

                if isinstance(tags, list):
                    # Clean and validate tags
                    cleaned_tags = [
                        str(tag).strip().lower()
                        for tag in tags
                        if tag and str(tag).strip()
                    ]
                    logger.info(f"Generated {len(cleaned_tags)} tags")
                    return cleaned_tags[:num_tags]

        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse tags JSON: {e}")

        # Fallback: split by commas or newlines
        fallback_tags = [
            tag.strip().lower()
            for tag in response.replace("\n", ",").split(",")
            if tag.strip()
        ]
        logger.info(f"Generated {len(fallback_tags)} tags (fallback parsing)")
        return fallback_tags[:num_tags]

    def extract_key_people(self, text: str) -> list[dict[str, str]]:
        """Extract key people mentioned in the document with context.

        Args:
            text: Document text to analyze

        Returns:
            List of dicts with 'name' and 'context' keys
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for people extraction")
            return []

        # Truncate very long texts
        max_chars = 8000
        truncated_text = text[:max_chars]

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a legal document analyst specializing in identifying key "
                    "individuals and their roles in court proceedings."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Extract all people mentioned in this document with their roles or context. "
                    "Return ONLY a JSON array of objects with 'name' and 'role' fields. "
                    'Example: [{"name": "John Doe", "role": "plaintiff attorney"}]\n\n'
                    f"{truncated_text}"
                ),
            },
        ]

        response = self._call_llm(messages)

        # Parse JSON response
        try:
            if "[" in response and "]" in response:
                json_start = response.index("[")
                json_end = response.rindex("]") + 1
                json_str = response[json_start:json_end]
                people = json.loads(json_str)

                if isinstance(people, list):
                    # Validate and clean
                    cleaned_people = []
                    for person in people:
                        if isinstance(person, dict) and "name" in person:
                            cleaned_person = {
                                "name": str(person["name"]).strip(),
                                "role": str(person.get("role", "")).strip(),
                            }
                            cleaned_people.append(cleaned_person)

                    logger.info(f"Extracted {len(cleaned_people)} key people")
                    return cleaned_people

        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse people JSON: {e}")

        logger.info("No people extracted (parsing failed)")
        return []

    def analyze_document(
        self,
        document_id: str,
        text: str,
    ) -> DocumentSummary:
        """Perform complete AI analysis of a document.

        Args:
            document_id: Unique document identifier
            text: Document text to analyze

        Returns:
            Complete document summary with all AI-generated data
        """
        logger.info(f"Starting AI analysis for document: {document_id}")

        # Generate all components
        summary = self.summarize(text)
        tags = self.generate_tags(text)
        key_people = self.extract_key_people(text)

        result = DocumentSummary(
            document_id=document_id,
            summary=summary,
            tags=tags,
            key_people=key_people,
            model_used=self.primary_model,
            timestamp=datetime.now(UTC).isoformat(),
        )

        logger.info(
            f"Completed AI analysis: {len(summary)} chars summary, "
            f"{len(tags)} tags, {len(key_people)} people"
        )

        return result

    def __repr__(self) -> str:
        """String representation of the analyzer."""
        return (
            f"AIAnalyzer(primary={self.primary_model}, "
            f"fallback={self.fallback_model})"
        )
