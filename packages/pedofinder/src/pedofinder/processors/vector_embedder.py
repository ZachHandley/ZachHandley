"""Vector embedding generation using sentence-transformers and OpenAI."""

import logging

import numpy as np
import openai
from numpy.typing import NDArray
from sentence_transformers import SentenceTransformer

from pedofinder.config import Settings

logger = logging.getLogger(__name__)


class VectorEmbedder:
    """Generate vector embeddings for documents and chunks."""

    def __init__(self, settings: Settings) -> None:
        """Initialize vector embedder.

        Args:
            settings: Application settings
        """
        self.settings = settings
        self.embedding_model = settings.embedding_model

        # Determine embedding method based on model name
        if self.embedding_model.startswith("text-embedding"):
            # OpenAI embeddings
            self.method = "openai"
            if not settings.openai_api_key:
                raise ValueError("OpenAI API key required for text-embedding models")
            openai.api_key = settings.openai_api_key
            logger.info(f"Initialized OpenAI embedder with model: {self.embedding_model}")

        else:
            # Local sentence-transformers
            self.method = "sentence_transformers"
            try:
                self.model = SentenceTransformer(self.embedding_model)
                logger.info(f"Initialized sentence-transformers model: {self.embedding_model}")
            except Exception as e:
                logger.error(f"Failed to load sentence-transformers model: {e}")
                raise

    def embed_text(self, text: str, max_retries: int = 3) -> NDArray[np.float32]:
        """Generate embedding for a single text.

        Args:
            text: Text to embed
            max_retries: Maximum retry attempts for API calls

        Returns:
            Numpy array of embedding vector

        Raises:
            Exception: If embedding generation fails after retries
        """
        if not text.strip():
            raise ValueError("Cannot embed empty text")

        if self.method == "openai":
            return self._embed_openai(text, max_retries)
        else:
            return self._embed_local(text)

    def _embed_openai(self, text: str, max_retries: int) -> NDArray[np.float32]:
        """Generate embedding using OpenAI API.

        Args:
            text: Text to embed
            max_retries: Maximum retry attempts

        Returns:
            Embedding vector
        """
        # Truncate text if too long (OpenAI limit is ~8191 tokens)
        # Rough estimate: 1 token ≈ 4 characters
        max_chars = 8191 * 4
        if len(text) > max_chars:
            text = text[:max_chars]
            logger.warning(f"Text truncated to {max_chars} characters for OpenAI embedding")

        for attempt in range(max_retries):
            try:
                response = openai.embeddings.create(
                    model=self.embedding_model,
                    input=text,
                )

                embedding = response.data[0].embedding
                return np.array(embedding, dtype=np.float32)

            except Exception as e:
                logger.warning(f"OpenAI embedding attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    logger.error("All OpenAI embedding attempts failed")
                    raise

        # Should never reach here
        raise RuntimeError("Failed to generate embedding")

    def _embed_local(self, text: str) -> NDArray[np.float32]:
        """Generate embedding using local sentence-transformers model.

        Args:
            text: Text to embed

        Returns:
            Embedding vector
        """
        try:
            embedding = self.model.encode(
                text,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
            return embedding.astype(np.float32)

        except Exception as e:
            logger.error(f"Local embedding generation failed: {e}")
            raise

    def embed_batch(
        self,
        texts: list[str],
        batch_size: int = 32,
        show_progress: bool = False,
    ) -> list[NDArray[np.float32]]:
        """Generate embeddings for multiple texts.

        Args:
            texts: List of texts to embed
            batch_size: Batch size for processing
            show_progress: Whether to show progress bar

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        if self.method == "openai":
            return self._embed_batch_openai(texts)
        else:
            return self._embed_batch_local(texts, batch_size, show_progress)

    def _embed_batch_openai(self, texts: list[str]) -> list[NDArray[np.float32]]:
        """Batch embed using OpenAI API.

        Args:
            texts: Texts to embed

        Returns:
            List of embedding vectors
        """
        # OpenAI API supports batching but has limits
        # Process in chunks of 100 to avoid rate limits
        chunk_size = 100
        all_embeddings: list[NDArray[np.float32]] = []

        for i in range(0, len(texts), chunk_size):
            chunk = texts[i : i + chunk_size]

            # Truncate texts
            truncated_chunk = [
                text[:8191 * 4] if len(text) > 8191 * 4 else text for text in chunk
            ]

            try:
                response = openai.embeddings.create(
                    model=self.embedding_model,
                    input=truncated_chunk,
                )

                embeddings = [
                    np.array(item.embedding, dtype=np.float32) for item in response.data
                ]
                all_embeddings.extend(embeddings)

                logger.debug(f"Embedded batch {i // chunk_size + 1}/{(len(texts) + chunk_size - 1) // chunk_size}")

            except Exception as e:
                logger.error(f"Batch embedding failed for chunk {i // chunk_size}: {e}")
                raise

        return all_embeddings

    def _embed_batch_local(
        self,
        texts: list[str],
        batch_size: int,
        show_progress: bool,
    ) -> list[NDArray[np.float32]]:
        """Batch embed using local model.

        Args:
            texts: Texts to embed
            batch_size: Batch size
            show_progress: Show progress bar

        Returns:
            List of embedding vectors
        """
        try:
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,
                convert_to_numpy=True,
                show_progress_bar=show_progress,
            )

            # Convert to list of arrays
            return [emb.astype(np.float32) for emb in embeddings]

        except Exception as e:
            logger.error(f"Batch embedding failed: {e}")
            raise

    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by this embedder.

        Returns:
            Embedding dimension
        """
        if self.method == "openai":
            # OpenAI embedding dimensions
            dimensions = {
                "text-embedding-3-small": 1536,
                "text-embedding-3-large": 3072,
                "text-embedding-ada-002": 1536,
            }
            return dimensions.get(self.embedding_model, 1536)
        else:
            # Get from local model
            return self.model.get_sentence_embedding_dimension()

    def cosine_similarity(
        self,
        embedding1: NDArray[np.float32],
        embedding2: NDArray[np.float32],
    ) -> float:
        """Calculate cosine similarity between two embeddings.

        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector

        Returns:
            Cosine similarity score (0-1)
        """
        # Normalize vectors
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        # Calculate cosine similarity
        similarity = np.dot(embedding1, embedding2) / (norm1 * norm2)
        return float(similarity)

    def find_similar(
        self,
        query_embedding: NDArray[np.float32],
        document_embeddings: list[NDArray[np.float32]],
        top_k: int = 10,
    ) -> list[tuple[int, float]]:
        """Find most similar documents to a query.

        Args:
            query_embedding: Query embedding vector
            document_embeddings: List of document embedding vectors
            top_k: Number of top results to return

        Returns:
            List of (index, similarity_score) tuples, sorted by similarity descending
        """
        similarities = []
        for idx, doc_emb in enumerate(document_embeddings):
            similarity = self.cosine_similarity(query_embedding, doc_emb)
            similarities.append((idx, similarity))

        # Sort by similarity descending
        similarities.sort(key=lambda x: x[1], reverse=True)

        return similarities[:top_k]
