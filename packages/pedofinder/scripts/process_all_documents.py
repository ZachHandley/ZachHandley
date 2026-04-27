"""Batch process all PDF documents with progress tracking."""

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from rich.console import Console
from rich.logging import RichHandler
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TaskID,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)
from rich.table import Table

from pedofinder.config import get_settings
from pedofinder.processors.document_processor import DocumentProcessor

console = Console()


def setup_logging(verbose: bool = False) -> None:
    """Set up logging with Rich handler.

    Args:
        verbose: Whether to use DEBUG level logging
    """
    level = logging.DEBUG if verbose else logging.INFO

    logging.basicConfig(
        level=level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(console=console, rich_tracebacks=True)],
    )


def find_all_pdfs(pdf_dir: Path) -> list[Path]:
    """Find all PDF files in directory.

    Args:
        pdf_dir: Directory containing PDFs

    Returns:
        List of PDF paths sorted by name
    """
    pdfs = list(pdf_dir.glob("*.pdf"))
    return sorted(pdfs)


def process_documents_batch(
    processor: DocumentProcessor,
    pdf_paths: list[Path],
    batch_size: int = 10,
    skip_existing: bool = True,
) -> dict[str, Any]:
    """Process documents in batches with progress tracking.

    Args:
        processor: Document processor instance
        pdf_paths: List of PDF paths to process
        batch_size: Number of documents to process in parallel
        skip_existing: Skip already processed documents

    Returns:
        Processing statistics
    """
    stats = {
        "total": len(pdf_paths),
        "processed": 0,
        "skipped": 0,
        "failed": 0,
        "start_time": datetime.now(),
    }

    # Create progress bar
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TextColumn("•"),
        TimeElapsedColumn(),
        TextColumn("•"),
        TimeRemainingColumn(),
        console=console,
    ) as progress:

        task = progress.add_task(
            "[cyan]Processing documents...",
            total=len(pdf_paths),
        )

        # Process in batches
        for i in range(0, len(pdf_paths), batch_size):
            batch = pdf_paths[i : i + batch_size]

            for pdf_path in batch:
                try:
                    doc = processor.process_pdf(pdf_path, skip_if_exists=skip_existing)

                    if doc is None:
                        stats["skipped"] += 1
                    else:
                        stats["processed"] += 1

                except Exception as e:
                    console.print(f"[red]Error processing {pdf_path.name}: {e}")
                    stats["failed"] += 1

                progress.advance(task)

    stats["end_time"] = datetime.now()
    stats["duration"] = (stats["end_time"] - stats["start_time"]).total_seconds()

    return stats


def print_summary_table(stats: dict[str, Any]) -> None:
    """Print processing summary as a table.

    Args:
        stats: Processing statistics
    """
    table = Table(title="Processing Summary", show_header=True, header_style="bold magenta")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", justify="right", style="green")

    table.add_row("Total Documents", str(stats["total"]))
    table.add_row("Successfully Processed", str(stats["processed"]))
    table.add_row("Skipped (Already Exists)", str(stats["skipped"]))
    table.add_row("Failed", str(stats["failed"]))
    table.add_row("Duration", f"{stats['duration']:.2f} seconds")

    if stats["processed"] > 0:
        avg_time = stats["duration"] / (stats["processed"] + stats["failed"])
        table.add_row("Average Time/Doc", f"{avg_time:.2f} seconds")

    console.print("\n")
    console.print(table)


def main() -> int:
    """Main entry point.

    Returns:
        Exit code (0 for success)
    """
    parser = argparse.ArgumentParser(
        description="Process all PDF documents through the complete pipeline"
    )

    parser.add_argument(
        "--pdf-dir",
        type=Path,
        help="Directory containing PDF files (default: ./data/pdfs)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=10,
        help="Number of documents to process in parallel (default: 10)",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        default=True,
        help="Skip already processed documents (default: True)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Reprocess all documents, even if already processed",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of documents to process (for testing)",
    )
    parser.add_argument(
        "--no-appwrite",
        action="store_true",
        help="Disable Appwrite storage",
    )
    parser.add_argument(
        "--no-pinecone",
        action="store_true",
        help="Disable Pinecone vector storage",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging",
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging(args.verbose)

    # Get settings
    settings = get_settings()

    # Determine PDF directory
    if args.pdf_dir:
        pdf_dir = args.pdf_dir
    else:
        # Use default from project root
        project_root = Path(__file__).parent.parent
        pdf_dir = project_root / "data" / "pdfs"

    if not pdf_dir.exists():
        console.print(f"[red]PDF directory not found: {pdf_dir}")
        return 1

    console.print(f"[bold]PDF Directory:[/bold] {pdf_dir}")

    # Find all PDFs
    console.print("\n[cyan]Scanning for PDF files...")
    pdf_paths = find_all_pdfs(pdf_dir)

    if not pdf_paths:
        console.print("[yellow]No PDF files found!")
        return 1

    console.print(f"[green]Found {len(pdf_paths)} PDF files")

    # Apply limit if specified
    if args.limit:
        pdf_paths = pdf_paths[: args.limit]
        console.print(f"[yellow]Limited to first {args.limit} documents")

    # Initialize processor
    console.print("\n[cyan]Initializing document processor...")
    try:
        processor = DocumentProcessor(
            settings=settings,
            use_appwrite=not args.no_appwrite,
            use_pinecone=not args.no_pinecone,
        )
    except Exception as e:
        console.print(f"[red]Failed to initialize processor: {e}")
        return 1

    console.print("[green]Processor initialized successfully")

    # Process documents
    console.print("\n[bold]Starting document processing...\n")

    skip_existing = args.skip_existing and not args.force

    stats = process_documents_batch(
        processor=processor,
        pdf_paths=pdf_paths,
        batch_size=args.batch_size,
        skip_existing=skip_existing,
    )

    # Print summary
    print_summary_table(stats)

    # Print final storage stats
    console.print("\n[cyan]Fetching storage statistics...")
    try:
        storage_stats = processor.get_processing_stats()

        storage_table = Table(title="Storage Statistics", show_header=True, header_style="bold magenta")
        storage_table.add_column("Storage", style="cyan")
        storage_table.add_column("Count", justify="right", style="green")

        if "total_documents" in storage_stats:
            storage_table.add_row("Appwrite Documents", str(storage_stats["total_documents"]))

        if "total_vectors" in storage_stats:
            storage_table.add_row("Pinecone Vectors", str(storage_stats["total_vectors"]))

        console.print("\n")
        console.print(storage_table)

    except Exception as e:
        console.print(f"[yellow]Could not fetch storage stats: {e}")

    # Success/failure summary
    if stats["failed"] > 0:
        console.print(f"\n[yellow]Warning: {stats['failed']} document(s) failed to process")
        return 1
    else:
        console.print("\n[bold green]All documents processed successfully!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
