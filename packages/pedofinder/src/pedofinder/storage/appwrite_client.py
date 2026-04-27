"""Appwrite client for document and entity storage."""

import logging
from typing import Any

from appwrite.client import Client
from appwrite.exception import AppwriteException
from appwrite.services.databases import Databases

from pedofinder.config import Settings
from pedofinder.core.document import Document
from pedofinder.core.entities import Entity, EntityRelationship

logger = logging.getLogger(__name__)


class AppwriteClient:
    """Client for interacting with Appwrite database."""

    def __init__(self, settings: Settings) -> None:
        """Initialize Appwrite client.

        Args:
            settings: Application settings
        """
        self.settings = settings

        if not settings.appwrite_api_key:
            raise ValueError("Appwrite API key is required")

        # Initialize Appwrite client
        self.client = Client()
        self.client.set_endpoint(str(settings.appwrite_endpoint))
        self.client.set_project(settings.appwrite_project_id)
        self.client.set_key(settings.appwrite_api_key)

        self.databases = Databases(self.client)
        self.database_id = settings.appwrite_database_id

        logger.info(f"Initialized Appwrite client for database: {self.database_id}")

    def create_document(self, document: Document) -> dict[str, Any]:
        """Create a document in Appwrite.

        Args:
            document: Document to create

        Returns:
            Created document data

        Raises:
            AppwriteException: If creation fails
        """
        try:
            # Convert to Appwrite-compatible dict
            data = document.to_appwrite_dict()

            # Use document ID as the Appwrite document ID
            result = self.databases.create_document(
                database_id=self.database_id,
                collection_id=self.settings.appwrite_documents_collection,
                document_id=document.id,
                data=data,
            )

            logger.info(f"Created document in Appwrite: {document.id}")
            return result

        except AppwriteException as e:
            # Check if document already exists
            if "document_already_exists" in str(e).lower():
                logger.warning(f"Document {document.id} already exists, updating instead")
                return self.update_document(document)
            else:
                logger.error(f"Failed to create document {document.id}: {e}")
                raise

    def update_document(self, document: Document) -> dict[str, Any]:
        """Update a document in Appwrite.

        Args:
            document: Document to update

        Returns:
            Updated document data

        Raises:
            AppwriteException: If update fails
        """
        try:
            data = document.to_appwrite_dict()

            result = self.databases.update_document(
                database_id=self.database_id,
                collection_id=self.settings.appwrite_documents_collection,
                document_id=document.id,
                data=data,
            )

            logger.info(f"Updated document in Appwrite: {document.id}")
            return result

        except AppwriteException as e:
            logger.error(f"Failed to update document {document.id}: {e}")
            raise

    def get_document(self, document_id: str) -> dict[str, Any] | None:
        """Retrieve a document from Appwrite.

        Args:
            document_id: Document ID

        Returns:
            Document data or None if not found
        """
        try:
            result = self.databases.get_document(
                database_id=self.database_id,
                collection_id=self.settings.appwrite_documents_collection,
                document_id=document_id,
            )
            return result

        except AppwriteException as e:
            if "document_not_found" in str(e).lower():
                return None
            else:
                logger.error(f"Failed to retrieve document {document_id}: {e}")
                raise

    def create_entity(self, entity: Entity) -> dict[str, Any]:
        """Create an entity in Appwrite.

        Args:
            entity: Entity to create

        Returns:
            Created entity data

        Raises:
            AppwriteException: If creation fails
        """
        try:
            # Convert to dict
            data = entity.model_dump(mode="json")

            result = self.databases.create_document(
                database_id=self.database_id,
                collection_id=self.settings.appwrite_entities_collection,
                document_id=entity.id,
                data=data,
            )

            logger.info(f"Created entity in Appwrite: {entity.id}")
            return result

        except AppwriteException as e:
            if "document_already_exists" in str(e).lower():
                logger.warning(f"Entity {entity.id} already exists, updating instead")
                return self.update_entity(entity)
            else:
                logger.error(f"Failed to create entity {entity.id}: {e}")
                raise

    def update_entity(self, entity: Entity) -> dict[str, Any]:
        """Update an entity in Appwrite.

        Args:
            entity: Entity to update

        Returns:
            Updated entity data

        Raises:
            AppwriteException: If update fails
        """
        try:
            data = entity.model_dump(mode="json")

            result = self.databases.update_document(
                database_id=self.database_id,
                collection_id=self.settings.appwrite_entities_collection,
                document_id=entity.id,
                data=data,
            )

            logger.info(f"Updated entity in Appwrite: {entity.id}")
            return result

        except AppwriteException as e:
            logger.error(f"Failed to update entity {entity.id}: {e}")
            raise

    def get_entity(self, entity_id: str) -> dict[str, Any] | None:
        """Retrieve an entity from Appwrite.

        Args:
            entity_id: Entity ID

        Returns:
            Entity data or None if not found
        """
        try:
            result = self.databases.get_document(
                database_id=self.database_id,
                collection_id=self.settings.appwrite_entities_collection,
                document_id=entity_id,
            )
            return result

        except AppwriteException as e:
            if "document_not_found" in str(e).lower():
                return None
            else:
                logger.error(f"Failed to retrieve entity {entity_id}: {e}")
                raise

    def create_relationship(self, relationship: EntityRelationship) -> dict[str, Any]:
        """Create a relationship in Appwrite.

        Args:
            relationship: Relationship to create

        Returns:
            Created relationship data

        Raises:
            AppwriteException: If creation fails
        """
        try:
            data = relationship.model_dump(mode="json")

            result = self.databases.create_document(
                database_id=self.database_id,
                collection_id=self.settings.appwrite_relationships_collection,
                document_id=relationship.id,
                data=data,
            )

            logger.info(f"Created relationship in Appwrite: {relationship.id}")
            return result

        except AppwriteException as e:
            if "document_already_exists" in str(e).lower():
                logger.warning(f"Relationship {relationship.id} already exists")
                return self.get_entity(relationship.id) or {}
            else:
                logger.error(f"Failed to create relationship {relationship.id}: {e}")
                raise

    def batch_create_documents(self, documents: list[Document]) -> list[dict[str, Any]]:
        """Create multiple documents in Appwrite.

        Args:
            documents: List of documents to create

        Returns:
            List of created document data
        """
        results = []
        for document in documents:
            try:
                result = self.create_document(document)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to create document {document.id} in batch: {e}")
                # Continue with other documents

        return results

    def batch_create_entities(self, entities: list[Entity]) -> list[dict[str, Any]]:
        """Create multiple entities in Appwrite.

        Args:
            entities: List of entities to create

        Returns:
            List of created entity data
        """
        results = []
        for entity in entities:
            try:
                result = self.create_entity(entity)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to create entity {entity.id} in batch: {e}")
                # Continue with other entities

        return results

    def list_documents(self, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        """List documents from Appwrite.

        Args:
            limit: Maximum number of documents to return
            offset: Number of documents to skip

        Returns:
            List of document data
        """
        try:
            result = self.databases.list_documents(
                database_id=self.database_id,
                collection_id=self.settings.appwrite_documents_collection,
                queries=[f"limit({limit})", f"offset({offset})"],
            )

            return result["documents"]

        except AppwriteException as e:
            logger.error(f"Failed to list documents: {e}")
            raise

    def count_documents(self) -> int:
        """Count total documents in Appwrite.

        Returns:
            Total document count
        """
        try:
            result = self.databases.list_documents(
                database_id=self.database_id,
                collection_id=self.settings.appwrite_documents_collection,
                queries=["limit(1)"],
            )

            return result["total"]

        except AppwriteException as e:
            logger.error(f"Failed to count documents: {e}")
            return 0

    def delete_document(self, document_id: str) -> bool:
        """Delete a document from Appwrite.

        Args:
            document_id: Document ID to delete

        Returns:
            True if deleted successfully
        """
        try:
            self.databases.delete_document(
                database_id=self.database_id,
                collection_id=self.settings.appwrite_documents_collection,
                document_id=document_id,
            )

            logger.info(f"Deleted document from Appwrite: {document_id}")
            return True

        except AppwriteException as e:
            logger.error(f"Failed to delete document {document_id}: {e}")
            return False
