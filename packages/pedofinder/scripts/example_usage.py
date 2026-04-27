"""Example usage of the document processing pipeline."""

from pathlib import Path

from rich.console import Console

from pedofinder.config import get_settings
from pedofinder.processors.document_processor import DocumentProcessor

console = Console()


def main() -> None:
    """Demonstrate processing a single document."""
    console.print("[bold]Document Processing Pipeline Example[/bold]\n")

    # Get settings
    console.print("[cyan]Loading configuration...")
    settings = get_settings()

    # Initialize processor
    console.print("[cyan]Initializing document processor...")
    processor = DocumentProcessor(
        settings=settings,
        use_appwrite=True,
        use_pinecone=True,
    )

    # Find a PDF to process
    pdf_dir = Path(__file__).parent.parent / "data" / "pdfs"
    pdfs = sorted(pdf_dir.glob("*.pdf"))

    if not pdfs:
        console.print("[red]No PDF files found in data/pdfs/")
        return

    # Process first PDF
    pdf_path = pdfs[0]
    console.print(f"\n[bold]Processing:[/bold] {pdf_path.name}\n")

    document = processor.process_pdf(pdf_path, skip_if_exists=False)

    if document:
        console.print("[bold green]Processing completed successfully!\n")

        # Display results
        console.print(f"[bold cyan]Document ID:[/bold cyan] {document.id}")
        console.print(f"[bold cyan]Word Count:[/bold cyan] {document.word_count}")
        console.print(f"[bold cyan]Status:[/bold cyan] {document.status}")
        console.print(f"\n[bold cyan]Summary:[/bold cyan]")
        console.print(f"  {document.summary}")
        console.print(f"\n[bold cyan]Key Themes:[/bold cyan]")
        for theme in document.key_themes:
            console.print(f"  • {theme}")
        console.print(f"\n[bold cyan]Tags:[/bold cyan]")
        console.print(f"  {', '.join(document.tags)}")
        console.print(f"\n[bold cyan]Entities Extracted:[/bold cyan]")
        for entity_type, entity_ids in document.entity_ids.items():
            console.print(f"  {entity_type}: {len(entity_ids)} unique entities")

        if document.has_embedding:
            console.print(f"\n[bold green]Vector embedding generated and stored in Pinecone")

    else:
        console.print("[yellow]Document was skipped or processing failed")


if __name__ == "__main__":
    main()
