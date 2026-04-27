#!/usr/bin/env python
"""Export processed documents to Appwrite database."""

import json
import logging
import sys
from pathlib import Path
from typing import Any

from appwrite.client import Client
from appwrite.services.databases import Databases
from rich.console import Console
from rich.logging import RichHandler
from rich.progress import Progress

from pedofinder.config.models import ProcessingConfig

# Setup rich console
console = Console()


def setup_logging(log_level: str = "INFO") -> None:
    """Configure logging with rich handler.

    Args:
        log_level: Logging level
    """
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format="%(message)s",
        handlers=[
            RichHandler(
                console=console,
                rich_tracebacks=True,
                show_time=True,
            )
        ],
        force=True,
    )


class AppwriteExporter:
    """Export processed documents to Appwrite."""

    def __init__(
        self,
        endpoint: str,
        project_id: str,
        api_key: str,
        database_id: str,
    ) -> None:
        """Initialize Appwrite exporter.

        Args:
            endpoint: Appwrite API endpoint
            project_id: Appwrite project ID
            api_key: Appwrite API key
            database_id: Database ID to export to
        """
        self.database_id = database_id

        # Initialize Appwrite client
        self.client = Client()
        self.client.set_endpoint(endpoint)
        self.client.set_project(project_id)
        self.client.set_key(api_key)

        self.databases = Databases(self.client)
        self.logger = logging.getLogger(__name__)

    def create_document_record(
        self,
        collection_id: str,
        document_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Create a document record in Appwrite.

        Args:
            collection_id: Collection ID
            document_data: Document data to insert

        Returns:
            Created document response
        """
        try:
            response = self.databases.create_document(
                database_id=self.database_id,
                collection_id=collection_id,
                document_id="unique()",
                data=document_data,
            )
            return response
        except Exception as e:
            self.logger.error(f"Error creating document: {e}")
            raise

    def export_metadata(
        self,
        metadata_dir: Path,
        collection_id: str,
    ) -> int:
        """Export document metadata to Appwrite.

        Args:
            metadata_dir: Directory containing metadata JSON files
            collection_id: Appwrite collection ID for metadata

        Returns:
            Number of records exported
        """
        json_files = list(metadata_dir.glob("*.json"))

        if not json_files:
            self.logger.warning(f"No metadata files found in {metadata_dir}")
            return 0

        exported = 0

        with Progress(console=console) as progress:
            task = progress.add_task(
                "[cyan]Exporting metadata...",
                total=len(json_files),
            )

            for json_file in json_files:
                try:
                    with open(json_file, encoding="utf-8") as f:
                        metadata = json.load(f)

                    self.create_document_record(collection_id, metadata)
                    exported += 1

                except Exception as e:
                    self.logger.error(f"Failed to export {json_file}: {e}")

                progress.update(task, advance=1)

        return exported

    def export_entities(
        self,
        entities_dir: Path,
        collection_id: str,
    ) -> int:
        """Export entities to Appwrite.

        Args:
            entities_dir: Directory containing entity JSON files
            collection_id: Appwrite collection ID for entities

        Returns:
            Number of records exported
        """
        json_files = list(entities_dir.glob("*.json"))

        if not json_files:
            self.logger.warning(f"No entity files found in {entities_dir}")
            return 0

        exported = 0

        with Progress(console=console) as progress:
            task = progress.add_task(
                "[cyan]Exporting entities...",
                total=len(json_files),
            )

            for json_file in json_files:
                try:
                    with open(json_file, encoding="utf-8") as f:
                        entities_list = json.load(f)

                    document_id = json_file.stem

                    # Export each entity
                    for entity in entities_list:
                        entity_data = {
                            "document_id": document_id,
                            **entity,
                        }
                        self.create_document_record(collection_id, entity_data)
                        exported += 1

                except Exception as e:
                    self.logger.error(f"Failed to export {json_file}: {e}")

                progress.update(task, advance=1)

        return exported

    def export_summaries(
        self,
        summaries_dir: Path,
        collection_id: str,
    ) -> int:
        """Export summaries to Appwrite.

        Args:
            summaries_dir: Directory containing summary JSON files
            collection_id: Appwrite collection ID for summaries

        Returns:
            Number of records exported
        """
        json_files = list(summaries_dir.glob("*.json"))

        if not json_files:
            self.logger.warning(f"No summary files found in {summaries_dir}")
            return 0

        exported = 0

        with Progress(console=console) as progress:
            task = progress.add_task(
                "[cyan]Exporting summaries...",
                total=len(json_files),
            )

            for json_file in json_files:
                try:
                    with open(json_file, encoding="utf-8") as f:
                        summary = json.load(f)

                    self.create_document_record(collection_id, summary)
                    exported += 1

                except Exception as e:
                    self.logger.error(f"Failed to export {json_file}: {e}")

                progress.update(task, advance=1)

        return exported


def main() -> int:
    """Main entry point for Appwrite export.

    Returns:
        Exit code (0 for success, 1 for failure)
    """
    console.print("[bold green]Appwrite Export Tool[/bold green]")
    console.print("Exporting processed documents to Appwrite...\n")

    setup_logging()
    logger = logging.getLogger(__name__)

    try:
        # Load configuration
        config = ProcessingConfig()

        # Get Appwrite credentials from environment
        import os

        endpoint = os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
        project_id = os.getenv("APPWRITE_PROJECT_ID")
        api_key = os.getenv("APPWRITE_API_KEY")
        database_id = os.getenv("APPWRITE_DATABASE_ID")

        if not all([project_id, api_key, database_id]):
            console.print(
                "[bold red]Error:[/bold red] Missing Appwrite credentials. "
                "Set APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and APPWRITE_DATABASE_ID"
            )
            return 1

        # Get collection IDs
        metadata_collection = os.getenv("APPWRITE_METADATA_COLLECTION")
        entities_collection = os.getenv("APPWRITE_ENTITIES_COLLECTION")
        summaries_collection = os.getenv("APPWRITE_SUMMARIES_COLLECTION")

        if not all([metadata_collection, entities_collection, summaries_collection]):
            console.print(
                "[bold red]Error:[/bold red] Missing collection IDs. "
                "Set APPWRITE_METADATA_COLLECTION, APPWRITE_ENTITIES_COLLECTION, "
                "and APPWRITE_SUMMARIES_COLLECTION"
            )
            return 1

        # Initialize exporter
        console.print("[cyan]Connecting to Appwrite...[/cyan]")
        exporter = AppwriteExporter(
            endpoint=endpoint,
            project_id=project_id,
            api_key=api_key,
            database_id=database_id,
        )
        console.print("[green]Connected successfully![/green]\n")

        # Export metadata
        console.print("[bold cyan]Exporting metadata...[/bold cyan]")
        metadata_count = exporter.export_metadata(
            config.get_documents_dir(),
            metadata_collection,
        )
        console.print(f"[green]Exported {metadata_count} metadata records[/green]\n")

        # Export entities
        console.print("[bold cyan]Exporting entities...[/bold cyan]")
        entities_count = exporter.export_entities(
            config.get_entities_dir(),
            entities_collection,
        )
        console.print(f"[green]Exported {entities_count} entity records[/green]\n")

        # Export summaries
        console.print("[bold cyan]Exporting summaries...[/bold cyan]")
        summaries_count = exporter.export_summaries(
            config.get_summaries_dir(),
            summaries_collection,
        )
        console.print(f"[green]Exported {summaries_count} summary records[/green]\n")

        console.print("[bold green]Export completed successfully![/bold green]")
        return 0

    except KeyboardInterrupt:
        console.print("\n[yellow]Export interrupted by user[/yellow]")
        return 1

    except Exception as e:
        console.print(f"\n[bold red]Error:[/bold red] {e}")
        logger.exception("Fatal error during export")
        return 1


if __name__ == "__main__":
    sys.exit(main())
