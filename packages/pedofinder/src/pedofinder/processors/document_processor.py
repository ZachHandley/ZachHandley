"""Main document processor orchestrator."""

import logging
from datetime import datetime
from pathlib import Path
from typing import Any

import PyPDF2

from pedofinder.config import Settings
from pedofinder.core.document import Document, DocumentStatus
from pedofinder.core.entities import EntityType
from pedofinder.processors.entity_extractor import EntityExtractor
from pedofinder.processors.llm_processor import LLMProcessor
from pedofinder.processors.vector_embedder import VectorEmbedder
from pedofinder.storage.appwrite_client import AppwriteClient
from pedofinder.storage.pinecone_client import PineconeClient

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Main document processor that orchestrates all processing steps."""

    def __init__(
        self,
        settings: Settings,
        use_appwrite: bool = True,
        use_pinecone: bool = True,
    ) -> None:
        """Initialize document processor.

        Args:
            settings: Application settings
            use_appwrite: Whether to enable Appwrite storage
            use_pinecone: Whether to enable Pinecone vector storage
        """
        self.settings = settings

        # Initialize processors
        logger.info("Initializing document processors...")
        self.llm_processor = LLMProcessor(settings)
        self.entity_extractor = EntityExtractor(settings)
        self.vector_embedder = VectorEmbedder(settings)

        # Initialize storage clients
        self.use_appwrite = use_appwrite
        self.use_pinecone = use_pinecone

        if use_appwrite:
            self.appwrite_client = AppwriteClient(settings)
            logger.info("Appwrite storage enabled")

        if use_pinecone:
            self.pinecone_client = PineconeClient(settings)
            logger.info("Pinecone vector storage enabled")

        logger.info("Document processor initialized successfully")

    def process_pdf(
        self,
        pdf_path: Path,
        skip_if_exists: bool = True,
    ) -> Document | None:
        """Process a single PDF document through the complete pipeline.

        Args:
            pdf_path: Path to PDF file
            skip_if_exists: Skip if document already exists in Appwrite

        Returns:
            Processed Document object or None if skipped/failed
        """
        # Extract document ID from filename
        document_id = pdf_path.stem.replace(".txt", "")
        filename = pdf_path.name

        logger.info(f"Processing document: {document_id}")

        # Check if already processed
        if skip_if_exists and self.use_appwrite:
            existing = self.appwrite_client.get_document(document_id)
            if existing and existing.get("status") == DocumentStatus.COMPLETED.value:
                logger.info(f"Document {document_id} already processed, skipping")
                return None

        try:
            # Step 1: Extract text from PDF
            logger.debug(f"[{document_id}] Extracting text from PDF")
            raw_text = self._extract_text_from_pdf(pdf_path)

            if not raw_text or len(raw_text.strip()) < 50:
                logger.warning(f"Document {document_id} has insufficient text, skipping")
                return None

            # Step 2: Create base document
            document = Document(
                id=document_id,
                filename=filename,
                source_collection=document_id.split("_")[0] + "_" + document_id.split("_")[1],
                raw_text=raw_text,
                word_count=len(raw_text.split()),
                file_size_bytes=pdf_path.stat().st_size,
                status=DocumentStatus.PROCESSING,
            )

            # Step 3: LLM analysis
            logger.debug(f"[{document_id}] Running LLM analysis")
            try:
                analysis = self.llm_processor.analyze_document(raw_text, document_id)
                document.summary = analysis.summary
                document.tags = analysis.tags
                document.key_themes = analysis.key_themes
            except Exception as e:
                logger.error(f"LLM analysis failed for {document_id}: {e}")
                document.tags = ["llm_analysis_failed"]

            # Step 4: Entity extraction
            logger.debug(f"[{document_id}] Extracting entities")
            try:
                entity_mentions = self.entity_extractor.extract_entities(
                    raw_text, document_id
                )

                # Store entity IDs (will be created separately)
                for entity_type, mentions in entity_mentions.items():
                    if mentions:
                        # Get unique entity names
                        unique_entities = set()
                        for mention in mentions:
                            normalized = self.entity_extractor.normalize_entity_name(
                                mention.text, EntityType(entity_type)
                            )
                            unique_entities.add(normalized)

                        # Generate entity IDs
                        entity_ids = [
                            self._generate_entity_id(name, entity_type)
                            for name in unique_entities
                        ]
                        document.entity_ids[entity_type] = entity_ids

            except Exception as e:
                logger.error(f"Entity extraction failed for {document_id}: {e}")

            # Step 5: Generate embeddings
            logger.debug(f"[{document_id}] Generating embeddings")
            try:
                # Use summary + key themes for embedding (more semantic than full text)
                embedding_text = f"{document.summary}\n\nKey themes: {', '.join(document.key_themes)}"

                embedding = self.vector_embedder.embed_text(embedding_text, max_retries=3)

                document.embedding_model = self.settings.embedding_model
                document.has_embedding = True

                # Step 6: Store in Pinecone
                if self.use_pinecone:
                    logger.debug(f"[{document_id}] Storing vector in Pinecone")
                    metadata = document.to_pinecone_metadata()
                    self.pinecone_client.upsert_vector(
                        vector_id=document_id,
                        embedding=embedding,
                        metadata=metadata,
                    )

            except Exception as e:
                logger.error(f"Vector embedding failed for {document_id}: {e}")
                document.has_embedding = False

            # Step 7: Mark as completed
            document.status = DocumentStatus.COMPLETED
            document.processed_at = datetime.now()

            # Step 8: Store in Appwrite
            if self.use_appwrite:
                logger.debug(f"[{document_id}] Storing in Appwrite")
                self.appwrite_client.create_document(document)

            logger.info(f"Successfully processed document: {document_id}")
            return document

        except Exception as e:
            logger.error(f"Failed to process document {document_id}: {e}")

            # Create failed document record
            if self.use_appwrite:
                failed_doc = Document(
                    id=document_id,
                    filename=filename,
                    source_collection=document_id.split("_")[0] + "_" + document_id.split("_")[1],
                    raw_text="",
                    status=DocumentStatus.FAILED,
                    error_message=str(e),
                )
                try:
                    self.appwrite_client.create_document(failed_doc)
                except Exception:
                    pass

            return None

    def _extract_text_from_pdf(self, pdf_path: Path) -> str:
        """Extract text from PDF file.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Extracted text
        """
        try:
            text_parts = []

            with open(pdf_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)

                for page in pdf_reader.pages:
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)

            full_text = "\n\n".join(text_parts)
            return full_text.strip()

        except Exception as e:
            logger.error(f"Failed to extract text from {pdf_path}: {e}")
            raise

    def _generate_entity_id(self, name: str, entity_type: str) -> str:
        """Generate a consistent entity ID from name and type.

        Args:
            name: Entity name (normalized)
            entity_type: Entity type

        Returns:
            Entity ID
        """
        # Convert to slug-like format
        slug = name.lower().replace(" ", "_").replace(".", "")
        return f"{entity_type}_{slug}"

    def process_batch(
        self,
        pdf_paths: list[Path],
        skip_if_exists: bool = True,
    ) -> list[Document]:
        """Process multiple PDFs.

        Args:
            pdf_paths: List of PDF paths
            skip_if_exists: Skip if document already exists

        Returns:
            List of processed documents
        """
        documents = []

        for pdf_path in pdf_paths:
            try:
                doc = self.process_pdf(pdf_path, skip_if_exists)
                if doc:
                    documents.append(doc)
            except Exception as e:
                logger.error(f"Failed to process {pdf_path}: {e}")

        return documents

    def get_processing_stats(self) -> dict[str, Any]:
        """Get processing statistics.

        Returns:
            Dictionary with processing stats
        """
        stats: dict[str, Any] = {}

        if self.use_appwrite:
            stats["total_documents"] = self.appwrite_client.count_documents()

        if self.use_pinecone:
            pinecone_stats = self.pinecone_client.get_index_stats()
            stats["total_vectors"] = pinecone_stats.get("total_vector_count", 0)

        return stats
