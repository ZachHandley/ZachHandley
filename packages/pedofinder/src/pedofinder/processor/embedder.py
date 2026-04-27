"""Document embedding generation using sentence-transformers."""

import logging
from typing import Any

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class DocumentEmbedder:
    """Generate embeddings for documents using sentence-transformers."""

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        batch_size: int = 32,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
    ) -> None:
        """Initialize the document embedder.

        Args:
            model_name: Sentence transformer model name
            batch_size: Batch size for embedding generation
            chunk_size: Maximum chunk size in characters
            chunk_overlap: Overlap between chunks in characters
        """
        self.model_name = model_name
        self.batch_size = batch_size
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self._model: SentenceTransformer | None = None

        logger.info(
            f"Initialized DocumentEmbedder: model={model_name}, "
            f"chunk_size={chunk_size}, overlap={chunk_overlap}"
        )

    def _load_model(self) -> SentenceTransformer:
        """Load the sentence transformer model lazily.

        Returns:
            Loaded sentence transformer model
        """
        if self._model is None:
            logger.info(f"Loading sentence transformer model: {self.model_name}")
            self._model = SentenceTransformer(self.model_name)
            logger.info(
                f"Model loaded successfully (embedding dim: {self._model.get_sentence_embedding_dimension()})"
            )
        return self._model

    def chunk_text(self, text: str) -> list[str]:
        """Split text into overlapping chunks.

        Args:
            text: Input text to chunk

        Returns:
            List of text chunks
        """
        if not text or not text.strip():
            return []

        chunks: list[str] = []
        start = 0
        text_length = len(text)

        while start < text_length:
            # Get chunk
            end = min(start + self.chunk_size, text_length)
            chunk = text[start:end]

            # Try to end at a sentence boundary
            if end < text_length:
                # Look for sentence endings within last 100 chars of chunk
                last_period = chunk.rfind(". ")
                last_newline = chunk.rfind("\n")
                boundary = max(last_period, last_newline)

                if boundary > self.chunk_size - 100:
                    end = start + boundary + 1
                    chunk = text[start:end]

            chunks.append(chunk.strip())

            # Move start position with overlap
            start = end - self.chunk_overlap
            if start <= 0:
                start = end

        logger.debug(f"Split text ({len(text)} chars) into {len(chunks)} chunks")
        return chunks

    def embed_text(self, text: str) -> np.ndarray[Any, Any]:
        """Generate embedding for a single text.

        Args:
            text: Input text

        Returns:
            Embedding vector as numpy array
        """
        if not text or not text.strip():
            model = self._load_model()
            # Return zero vector for empty text
            dim = model.get_sentence_embedding_dimension()
            return np.zeros(dim, dtype=np.float32)

        model = self._load_model()
        embedding: np.ndarray[Any, Any] = model.encode(
            text,
            convert_to_numpy=True,
            show_progress_bar=False,
        )

        return embedding

    def embed_texts(self, texts: list[str]) -> list[np.ndarray[Any, Any]]:
        """Generate embeddings for multiple texts.

        Args:
            texts: List of input texts

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        model = self._load_model()

        logger.info(f"Generating embeddings for {len(texts)} texts")

        embeddings_result = model.encode(
            texts,
            batch_size=self.batch_size,
            convert_to_numpy=True,
            show_progress_bar=len(texts) > 10,
        )

        # Convert to list of arrays
        if isinstance(embeddings_result, np.ndarray):
            embeddings = [embeddings_result[i] for i in range(len(embeddings_result))]
        else:
            embeddings = list(embeddings_result)

        logger.info(f"Generated {len(embeddings)} embeddings")
        return embeddings

    def embed_document(self, text: str) -> tuple[list[str], list[list[float]]]:
        """Generate embeddings for a document (with chunking).

        Args:
            text: Document text

        Returns:
            Tuple of (chunks, embeddings) where embeddings are lists of floats
        """
        # Split into chunks
        chunks = self.chunk_text(text)

        if not chunks:
            logger.warning("No chunks generated from text")
            return [], []

        # Generate embeddings
        embeddings_np = self.embed_texts(chunks)

        # Convert to list of lists for JSON serialization
        embeddings = [emb.tolist() for emb in embeddings_np]

        logger.info(
            f"Generated {len(embeddings)} embeddings for document "
            f"({len(text)} chars, {len(chunks)} chunks)"
        )

        return chunks, embeddings

    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by this model.

        Returns:
            Embedding dimension
        """
        model = self._load_model()
        dim = model.get_sentence_embedding_dimension()
        if dim is None:
            return 384  # Default dimension for most sentence transformers
        return int(dim)

    def calculate_similarity(
        self,
        embedding1: list[float] | np.ndarray[Any, Any],
        embedding2: list[float] | np.ndarray[Any, Any],
    ) -> float:
        """Calculate cosine similarity between two embeddings.

        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector

        Returns:
            Cosine similarity score (0-1)
        """
        # Convert to numpy arrays
        vec1 = np.array(embedding1, dtype=np.float32)
        vec2 = np.array(embedding2, dtype=np.float32)

        # Calculate cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity: float = dot_product / (norm1 * norm2)
        return float(similarity)

    def find_most_similar_chunks(
        self,
        query_text: str,
        chunks: list[str],
        embeddings: list[list[float]],
        top_k: int = 5,
    ) -> list[tuple[int, str, float]]:
        """Find most similar chunks to a query.

        Args:
            query_text: Query text
            chunks: List of text chunks
            embeddings: List of chunk embeddings
            top_k: Number of results to return

        Returns:
            List of (index, chunk_text, similarity_score) tuples
        """
        # Generate query embedding
        query_embedding = self.embed_text(query_text)

        # Calculate similarities
        similarities: list[tuple[int, str, float]] = []
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True)):
            similarity = self.calculate_similarity(query_embedding, embedding)
            similarities.append((idx, chunk, similarity))

        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[2], reverse=True)

        return similarities[:top_k]

    def __repr__(self) -> str:
        """String representation of the embedder."""
        return (
            f"DocumentEmbedder(model={self.model_name}, "
            f"chunk_size={self.chunk_size})"
        )
