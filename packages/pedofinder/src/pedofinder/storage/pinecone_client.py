"""Pinecone client for vector storage and retrieval."""

import logging
from typing import Any

import numpy as np
from numpy.typing import NDArray
from pinecone import Pinecone, ServerlessSpec

from pedofinder.config import Settings

logger = logging.getLogger(__name__)


class PineconeClient:
    """Client for interacting with Pinecone vector database."""

    def __init__(self, settings: Settings) -> None:
        """Initialize Pinecone client.

        Args:
            settings: Application settings

        Raises:
            ValueError: If Pinecone API key is not configured
        """
        self.settings = settings

        if not settings.pinecone_api_key:
            raise ValueError("Pinecone API key is required")

        # Initialize Pinecone
        self.pc = Pinecone(api_key=settings.pinecone_api_key)

        self.index_name = settings.pinecone_index_name
        self.environment = settings.pinecone_environment
        self.dimension = settings.vector_dim

        # Get or create index
        self.index = self._get_or_create_index()

        logger.info(f"Initialized Pinecone client for index: {self.index_name}")

    def _get_or_create_index(self) -> Any:
        """Get existing index or create a new one.

        Returns:
            Pinecone index object
        """
        # List existing indexes
        existing_indexes = self.pc.list_indexes()
        index_names = [idx["name"] for idx in existing_indexes]

        if self.index_name in index_names:
            logger.info(f"Using existing Pinecone index: {self.index_name}")
            return self.pc.Index(self.index_name)

        else:
            logger.info(f"Creating new Pinecone index: {self.index_name}")

            # Create serverless index
            self.pc.create_index(
                name=self.index_name,
                dimension=self.dimension,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region=self.environment),
            )

            return self.pc.Index(self.index_name)

    def upsert_vector(
        self,
        vector_id: str,
        embedding: NDArray[np.float32],
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Upsert a single vector to Pinecone.

        Args:
            vector_id: Unique identifier for the vector
            embedding: Vector embedding
            metadata: Optional metadata to store with the vector

        Returns:
            Upsert response
        """
        try:
            # Convert numpy array to list
            vector_values = embedding.tolist()

            response = self.index.upsert(
                vectors=[(vector_id, vector_values, metadata or {})],
                namespace="",
            )

            logger.debug(f"Upserted vector to Pinecone: {vector_id}")
            return response

        except Exception as e:
            logger.error(f"Failed to upsert vector {vector_id}: {e}")
            raise

    def upsert_batch(
        self,
        vector_ids: list[str],
        embeddings: list[NDArray[np.float32]],
        metadata_list: list[dict[str, Any]] | None = None,
        batch_size: int = 100,
    ) -> dict[str, Any]:
        """Upsert multiple vectors to Pinecone in batches.

        Args:
            vector_ids: List of unique identifiers
            embeddings: List of vector embeddings
            metadata_list: Optional list of metadata dictionaries
            batch_size: Number of vectors to upsert per batch

        Returns:
            Final upsert response

        Raises:
            ValueError: If input lists have mismatched lengths
        """
        if len(vector_ids) != len(embeddings):
            raise ValueError("Number of vector IDs must match number of embeddings")

        if metadata_list is not None and len(metadata_list) != len(embeddings):
            raise ValueError("Number of metadata items must match number of embeddings")

        # Prepare vectors
        vectors = []
        for i, (vid, emb) in enumerate(zip(vector_ids, embeddings)):
            metadata = metadata_list[i] if metadata_list else {}
            vectors.append((vid, emb.tolist(), metadata))

        # Upsert in batches
        total_upserted = 0
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i : i + batch_size]

            try:
                response = self.index.upsert(vectors=batch, namespace="")
                total_upserted += response.get("upserted_count", len(batch))

                logger.debug(
                    f"Upserted batch {i // batch_size + 1}/{(len(vectors) + batch_size - 1) // batch_size} "
                    f"({len(batch)} vectors)"
                )

            except Exception as e:
                logger.error(f"Failed to upsert batch {i // batch_size}: {e}")
                raise

        logger.info(f"Successfully upserted {total_upserted} vectors to Pinecone")
        return {"upserted_count": total_upserted}

    def query(
        self,
        query_embedding: NDArray[np.float32],
        top_k: int = 10,
        filter_metadata: dict[str, Any] | None = None,
        include_metadata: bool = True,
    ) -> list[dict[str, Any]]:
        """Query Pinecone for similar vectors.

        Args:
            query_embedding: Query vector
            top_k: Number of results to return
            filter_metadata: Optional metadata filters
            include_metadata: Whether to include metadata in results

        Returns:
            List of matching results with scores
        """
        try:
            # Convert numpy array to list
            query_values = query_embedding.tolist()

            response = self.index.query(
                vector=query_values,
                top_k=top_k,
                filter=filter_metadata,
                include_metadata=include_metadata,
                namespace="",
            )

            results = []
            for match in response.get("matches", []):
                result = {
                    "id": match["id"],
                    "score": match["score"],
                }
                if include_metadata:
                    result["metadata"] = match.get("metadata", {})
                results.append(result)

            logger.debug(f"Query returned {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Failed to query Pinecone: {e}")
            raise

    def fetch(self, vector_ids: list[str]) -> dict[str, Any]:
        """Fetch vectors by their IDs.

        Args:
            vector_ids: List of vector IDs to fetch

        Returns:
            Dictionary of vector data
        """
        try:
            response = self.index.fetch(ids=vector_ids, namespace="")
            return response.get("vectors", {})

        except Exception as e:
            logger.error(f"Failed to fetch vectors: {e}")
            raise

    def delete(self, vector_ids: list[str]) -> dict[str, Any]:
        """Delete vectors by their IDs.

        Args:
            vector_ids: List of vector IDs to delete

        Returns:
            Delete response
        """
        try:
            response = self.index.delete(ids=vector_ids, namespace="")
            logger.info(f"Deleted {len(vector_ids)} vectors from Pinecone")
            return response

        except Exception as e:
            logger.error(f"Failed to delete vectors: {e}")
            raise

    def delete_all(self) -> dict[str, Any]:
        """Delete all vectors from the index.

        Returns:
            Delete response
        """
        try:
            response = self.index.delete(delete_all=True, namespace="")
            logger.warning("Deleted all vectors from Pinecone index")
            return response

        except Exception as e:
            logger.error(f"Failed to delete all vectors: {e}")
            raise

    def get_index_stats(self) -> dict[str, Any]:
        """Get statistics about the index.

        Returns:
            Index statistics
        """
        try:
            stats = self.index.describe_index_stats()
            return stats

        except Exception as e:
            logger.error(f"Failed to get index stats: {e}")
            raise

    def update_metadata(
        self,
        vector_id: str,
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """Update metadata for a vector.

        Args:
            vector_id: Vector ID
            metadata: New metadata

        Returns:
            Update response
        """
        try:
            response = self.index.update(
                id=vector_id,
                set_metadata=metadata,
                namespace="",
            )

            logger.debug(f"Updated metadata for vector: {vector_id}")
            return response

        except Exception as e:
            logger.error(f"Failed to update metadata for {vector_id}: {e}")
            raise
