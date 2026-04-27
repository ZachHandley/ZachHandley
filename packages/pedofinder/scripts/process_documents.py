#!/usr/bin/env python
"""Process all documents through the AI analysis pipeline."""

import logging
import sys
from pathlib import Path
from typing import Any

from rich.console import Console
from rich.logging import RichHandler
from rich.table import Table

from pedofinder.config.models import ProcessingConfig
from pedofinder.processor import DocumentProcessor

# Setup rich console
console = Console()


def setup_logging(log_level: str = "INFO", log_file: Path | None = None) -> None:
    """Configure logging with rich handler.

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_file: Optional log file path
    """
    # Configure root logger
    handlers: list[logging.Handler] = [
        RichHandler(
            console=console,
            rich_tracebacks=True,
            show_time=True,
            show_path=False,
        )
    ]

    # Add file handler if specified
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setFormatter(
            logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
        )
        handlers.append(file_handler)

    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format="%(message)s",
        handlers=handlers,
        force=True,
    )


def print_statistics(stats: dict[str, Any]) -> None:
    """Print processing statistics in a nice table.

    Args:
        stats: Statistics dictionary from processing
    """
    console.print("\n[bold cyan]Processing Statistics[/bold cyan]")

    # Create summary table
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", justify="right", style="green")

    table.add_row("Total Files", str(stats["total_files"]))
    table.add_row("Processed", str(stats["processed"]))
    table.add_row("Skipped", str(stats["skipped"]))
    table.add_row("Failed", str(stats["failed"]))
    table.add_row("Total Entities", str(stats["total_entities"]))
    table.add_row("Total Chunks", str(stats["total_chunks"]))
    table.add_row(
        "Avg Entities/Doc",
        f"{stats['avg_entities_per_doc']:.1f}",
    )
    table.add_row(
        "Avg Chunks/Doc",
        f"{stats['avg_chunks_per_doc']:.1f}",
    )

    console.print(table)

    # Show errors if any
    if stats["errors"]:
        console.print("\n[bold red]Errors:[/bold red]")
        error_table = Table(show_header=True, header_style="bold red")
        error_table.add_column("Document ID", style="yellow")
        error_table.add_column("Error", style="red")

        for error in stats["errors"]:
            error_table.add_row(error["document_id"], error["error"])

        console.print(error_table)


def main() -> int:
    """Main entry point for document processing.

    Returns:
        Exit code (0 for success, 1 for failure)
    """
    console.print("[bold green]Pedofinder Document Processor[/bold green]")
    console.print("Processing documents with AI analysis...\n")

    try:
        # Load configuration
        console.print("[cyan]Loading configuration...[/cyan]")
        config = ProcessingConfig()

        # Setup logging
        setup_logging(config.log_level, config.log_file)
        logger = logging.getLogger(__name__)

        # Print configuration
        console.print(f"[cyan]Primary Model:[/cyan] {config.primary_model}")
        console.print(f"[cyan]Fallback Model:[/cyan] {config.fallback_model}")
        console.print(f"[cyan]SpaCy Model:[/cyan] {config.spacy_model}")
        console.print(f"[cyan]Embedding Model:[/cyan] {config.embedding_model}")
        console.print(f"[cyan]Input Directory:[/cyan] {config.input_dir}")
        console.print(f"[cyan]Output Directory:[/cyan] {config.output_dir}")
        console.print()

        # Check input directory
        if not config.input_dir.exists():
            console.print(
                f"[bold red]Error:[/bold red] Input directory not found: {config.input_dir}"
            )
            return 1

        # Initialize processor
        console.print("[cyan]Initializing processor components...[/cyan]")
        processor = DocumentProcessor(config)
        console.print("[green]Processor initialized successfully![/green]\n")

        # Process all documents
        console.print("[bold cyan]Starting document processing...[/bold cyan]\n")
        stats = processor.process_all_documents()

        # Print results
        print_statistics(stats)

        # Determine exit code
        if stats["failed"] > 0:
            console.print(
                f"\n[yellow]Warning:[/yellow] {stats['failed']} documents failed to process"
            )
            return 1

        console.print("\n[bold green]Processing completed successfully![/bold green]")
        return 0

    except KeyboardInterrupt:
        console.print("\n[yellow]Processing interrupted by user[/yellow]")
        return 1

    except Exception as e:
        console.print(f"\n[bold red]Error:[/bold red] {e}")
        logging.exception("Fatal error during processing")
        return 1


if __name__ == "__main__":
    sys.exit(main())
