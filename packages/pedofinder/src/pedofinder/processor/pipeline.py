"""Main document processing pipeline."""

import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from tqdm import tqdm

from pedofinder.config.models import (
    DocumentMetadata,
    EntityData,
    ProcessingConfig,
    ProcessingResult,
)
from pedofinder.processor.ai_analyzer import AIAnalyzer
from pedofinder.processor.embedder import DocumentEmbedder
from pedofinder.processor.entity_extractor import EntityExtractor

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Main pipeline for processing documents."""

    def __init__(self, config: ProcessingConfig) -> None:
        """Initialize the document processor.

        Args:
            config: Processing configuration
        """
        self.config = config

        # Initialize components
        logger.info("Initializing processing components...")

        self.entity_extractor = EntityExtractor(
            model_name=config.spacy_model,
            entity_types=config.entity_types,
        )

        self.ai_analyzer = AIAnalyzer(
            primary_model=config.primary_model,
            fallback_model=config.fallback_model,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            max_retries=config.max_retries,
            retry_delay=config.retry_delay,
        )

        self.embedder = DocumentEmbedder(
            model_name=config.embedding_model,
            batch_size=config.embedding_batch_size,
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap,
        )

        # Ensure output directories exist
        config.ensure_output_dirs()

        logger.info("DocumentProcessor initialized successfully")

    def _get_document_id(self, file_path: Path) -> str:
        """Generate a unique document ID from filename.

        Args:
            file_path: Path to the document file

        Returns:
            Unique document identifier
        """
        # Remove .txt.pdf extension and use filename
        stem = file_path.stem
        if stem.endswith(".txt"):
            stem = stem[:-4]
        return stem

    def _load_document_text(self, file_path: Path) -> str:
        """Load text content from a document file.

        Args:
            file_path: Path to the document

        Returns:
            Document text content

        Raises:
            FileNotFoundError: If file doesn't exist
            UnicodeDecodeError: If file encoding is invalid
        """
        if not file_path.exists():
            raise FileNotFoundError(f"Document not found: {file_path}")

        logger.debug(f"Loading text from: {file_path}")

        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError as e:
            logger.error(f"Unicode decode error reading {file_path}: {e}")
            raise

        logger.debug(f"Loaded {len(text)} characters")
        return text

    def _is_already_processed(self, document_id: str) -> bool:
        """Check if a document has already been processed.

        Args:
            document_id: Document identifier

        Returns:
            True if all output files exist
        """
        if not self.config.skip_existing:
            return False

        # Check for existence of all output files
        documents_file = self.config.get_documents_dir() / f"{document_id}.json"
        entities_file = self.config.get_entities_dir() / f"{document_id}.json"
        summaries_file = self.config.get_summaries_dir() / f"{document_id}.json"
        embeddings_file = self.config.get_embeddings_dir() / f"{document_id}.json"

        all_exist = all(
            f.exists()
            for f in [documents_file, entities_file, summaries_file, embeddings_file]
        )

        if all_exist:
            logger.info(f"Document {document_id} already processed, skipping")

        return all_exist

    def _save_json(self, data: Any, file_path: Path) -> None:  # noqa: ANN401
        """Save data as JSON file.

        Args:
            data: Data to save (must be JSON serializable)
            file_path: Output file path
        """
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        logger.debug(f"Saved JSON to: {file_path}")

    def process_document(self, file_path: Path) -> ProcessingResult:
        """Process a single document through the complete pipeline.

        Args:
            file_path: Path to the document file

        Returns:
            Processing result with all extracted data
        """
        document_id = self._get_document_id(file_path)

        logger.info(f"Processing document: {document_id}")

        try:
            # Check if already processed
            if self._is_already_processed(document_id):
                # Load existing results
                summaries_file = self.config.get_summaries_dir() / f"{document_id}.json"
                with open(summaries_file, encoding="utf-8") as f:
                    summary_data = json.load(f)

                entities_file = self.config.get_entities_dir() / f"{document_id}.json"
                with open(entities_file, encoding="utf-8") as f:
                    entities_data = json.load(f)

                embeddings_file = self.config.get_embeddings_dir() / f"{document_id}.json"
                with open(embeddings_file, encoding="utf-8") as f:
                    embeddings_data = json.load(f)

                documents_file = self.config.get_documents_dir() / f"{document_id}.json"
                with open(documents_file, encoding="utf-8") as f:
                    metadata_data = json.load(f)

                # Reconstruct result
                from pedofinder.config.models import DocumentSummary

                return ProcessingResult(
                    metadata=DocumentMetadata(**metadata_data),
                    entities=[EntityData(**e) for e in entities_data],
                    summary=DocumentSummary(**summary_data),
                    embeddings=embeddings_data.get("embeddings", []),
                    text_chunks=embeddings_data.get("chunks", []),
                    success=True,
                )

            # Load document text
            text = self._load_document_text(file_path)

            # Step 1: Extract entities
            logger.info(f"[{document_id}] Extracting entities...")
            entities = self.entity_extractor.extract_entities(text)

            # Step 2: Generate AI summary
            logger.info(f"[{document_id}] Generating AI summary...")
            summary = self.ai_analyzer.analyze_document(document_id, text)

            # Step 3: Generate embeddings
            logger.info(f"[{document_id}] Generating embeddings...")
            chunks, embeddings = self.embedder.embed_document(text)

            # Create metadata
            metadata = DocumentMetadata(
                document_id=document_id,
                filename=file_path.name,
                file_path=str(file_path.absolute()),
                file_size=file_path.stat().st_size,
                text_length=len(text),
                num_entities=len(entities),
                num_chunks=len(chunks),
                processed_at=datetime.now(UTC).isoformat(),
            )

            # Save results to separate files
            logger.info(f"[{document_id}] Saving processed data...")

            # Save metadata
            metadata_file = self.config.get_documents_dir() / f"{document_id}.json"
            self._save_json(metadata.model_dump(), metadata_file)

            # Save entities
            entities_file = self.config.get_entities_dir() / f"{document_id}.json"
            self._save_json([e.model_dump() for e in entities], entities_file)

            # Save summary
            summaries_file = self.config.get_summaries_dir() / f"{document_id}.json"
            self._save_json(summary.model_dump(), summaries_file)

            # Save embeddings
            embeddings_file = self.config.get_embeddings_dir() / f"{document_id}.json"
            self._save_json(
                {
                    "document_id": document_id,
                    "chunks": chunks,
                    "embeddings": embeddings,
                    "embedding_dimension": self.embedder.get_embedding_dimension(),
                },
                embeddings_file,
            )

            result = ProcessingResult(
                metadata=metadata,
                entities=entities,
                summary=summary,
                embeddings=embeddings,
                text_chunks=chunks,
                success=True,
            )

            logger.info(
                f"[{document_id}] Processing complete: "
                f"{len(entities)} entities, {len(chunks)} chunks"
            )

            return result

        except Exception as e:
            logger.error(f"Error processing {document_id}: {e}", exc_info=True)

            # Return error result
            return ProcessingResult(
                metadata=DocumentMetadata(
                    document_id=document_id,
                    filename=file_path.name,
                    file_path=str(file_path.absolute()),
                    file_size=0,
                    text_length=0,
                    num_entities=0,
                    num_chunks=0,
                    processed_at=datetime.now(UTC).isoformat(),
                ),
                entities=[],
                summary=self.ai_analyzer.analyze_document(document_id, ""),
                embeddings=[],
                text_chunks=[],
                success=False,
                error=str(e),
            )

    def process_all_documents(self) -> dict[str, Any]:
        """Process all documents in the input directory.

        Returns:
            Statistics about the processing run
        """
        input_dir = self.config.input_dir

        if not input_dir.exists():
            raise FileNotFoundError(f"Input directory not found: {input_dir}")

        # Find all document files
        pdf_files = list(input_dir.glob("*.pdf"))
        txt_files = list(input_dir.glob("*.txt"))
        all_files = pdf_files + txt_files

        if not all_files:
            logger.warning(f"No documents found in {input_dir}")
            return {
                "total_files": 0,
                "processed": 0,
                "skipped": 0,
                "failed": 0,
                "errors": [],
            }

        logger.info(f"Found {len(all_files)} documents to process")

        # Process each document
        results: list[ProcessingResult] = []
        errors: list[dict[str, str]] = []

        for file_path in tqdm(all_files, desc="Processing documents"):
            result = self.process_document(file_path)
            results.append(result)

            if not result.success:
                errors.append(
                    {
                        "document_id": result.metadata.document_id,
                        "error": result.error or "Unknown error",
                    }
                )

        # Calculate statistics
        successful = sum(1 for r in results if r.success)
        skipped = sum(
            1
            for r in results
            if r.success and self._is_already_processed(r.metadata.document_id)
        )
        failed = len(results) - successful

        total_entities = sum(len(r.entities) for r in results if r.success)
        total_chunks = sum(len(r.text_chunks) for r in results if r.success)

        stats = {
            "total_files": len(all_files),
            "processed": successful,
            "skipped": skipped,
            "failed": failed,
            "errors": errors,
            "total_entities": total_entities,
            "total_chunks": total_chunks,
            "avg_entities_per_doc": total_entities / successful if successful > 0 else 0,
            "avg_chunks_per_doc": total_chunks / successful if successful > 0 else 0,
        }

        logger.info(
            f"Processing complete: {successful} successful, {failed} failed, {skipped} skipped"
        )

        # Save processing statistics
        stats_file = self.config.output_dir.parent / "analysis" / "processing_stats.json"
        self._save_json(stats, stats_file)

        return stats

    def __repr__(self) -> str:
        """String representation of the processor."""
        return f"DocumentProcessor(input={self.config.input_dir}, output={self.config.output_dir})"
