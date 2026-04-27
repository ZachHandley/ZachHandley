#!/usr/bin/env python
"""Quick test of the document processing pipeline."""

import logging
from pathlib import Path

from rich.console import Console

from pedofinder.config.models import ProcessingConfig
from pedofinder.processor import (
    AIAnalyzer,
    DocumentEmbedder,
    EntityExtractor,
)

console = Console()


def test_entity_extraction() -> None:
    """Test SpaCy entity extraction."""
    console.print("\n[bold cyan]Testing Entity Extraction[/bold cyan]")

    try:
        extractor = EntityExtractor(model_name="en_core_web_trf")
        console.print("[green]✓ SpaCy model loaded successfully[/green]")

        test_text = """
        Jeffrey Epstein and Ghislaine Maxwell were arrested in connection with
        sex trafficking charges in New York. The FBI investigated their
        activities from 2001 to 2019.
        """

        entities = extractor.extract_entities(test_text)
        console.print(f"[green]✓ Extracted {len(entities)} entities[/green]")

        for entity in entities[:5]:
            console.print(f"  - {entity.text} ({entity.label})")

    except Exception as e:
        console.print(f"[red]✗ Entity extraction failed: {e}[/red]")
        raise


def test_ai_analyzer() -> None:
    """Test LiteLLM analyzer."""
    console.print("\n[bold cyan]Testing AI Analyzer[/bold cyan]")

    try:
        analyzer = AIAnalyzer(
            primary_model="ollama/llama3",
            fallback_model=None,  # No fallback for test
        )
        console.print("[green]✓ AI Analyzer initialized[/green]")

        test_text = """
        This is a court document describing allegations against Jeffrey Epstein
        related to sex trafficking. The document contains testimony from multiple
        witnesses and spans activities from 2001 to 2019 in New York and Florida.
        """

        # Test summarization
        summary = analyzer.summarize(test_text, max_sentences=2)
        console.print(f"[green]✓ Generated summary ({len(summary)} chars)[/green]")
        console.print(f"  Summary: {summary}")

        # Test tag generation
        tags = analyzer.generate_tags(test_text, num_tags=5)
        console.print(f"[green]✓ Generated {len(tags)} tags[/green]")
        console.print(f"  Tags: {', '.join(tags)}")

    except Exception as e:
        console.print(f"[yellow]⚠ AI Analyzer test failed: {e}[/yellow]")
        console.print("[yellow]  This is expected if Ollama is not running[/yellow]")
        console.print("[yellow]  Start Ollama with: ollama serve[/yellow]")


def test_embedder() -> None:
    """Test sentence-transformers embedder."""
    console.print("\n[bold cyan]Testing Document Embedder[/bold cyan]")

    try:
        embedder = DocumentEmbedder(model_name="all-MiniLM-L6-v2")
        console.print("[green]✓ Embedding model loaded[/green]")

        test_text = """
        Jeffrey Epstein was a financier who was arrested on charges of sex trafficking.
        The case involved multiple witnesses and spanned several years.
        This is additional text to create multiple chunks for testing the embedding system.
        We need enough content to demonstrate the chunking mechanism works correctly.
        """

        chunks, embeddings = embedder.embed_document(test_text)
        console.print(f"[green]✓ Generated {len(embeddings)} embeddings[/green]")
        console.print(f"  Chunks: {len(chunks)}")
        console.print(f"  Embedding dimension: {embedder.get_embedding_dimension()}")

        # Test similarity search
        similar = embedder.find_most_similar_chunks(
            "Who is Jeffrey Epstein?", chunks, embeddings, top_k=2
        )
        console.print(f"[green]✓ Similarity search works[/green]")
        console.print(f"  Most similar chunk: {similar[0][1][:100]}...")

    except Exception as e:
        console.print(f"[red]✗ Embedder test failed: {e}[/red]")
        raise


def test_full_pipeline() -> None:
    """Test the complete processing pipeline on one document."""
    console.print("\n[bold cyan]Testing Full Pipeline[/bold cyan]")

    try:
        # Find a sample document
        config = ProcessingConfig()
        pdf_files = list(config.input_dir.glob("*.pdf"))

        if not pdf_files:
            console.print("[yellow]⚠ No PDF files found, skipping pipeline test[/yellow]")
            return

        sample_file = pdf_files[0]
        console.print(f"[cyan]Using sample file: {sample_file.name}[/cyan]")

        from pedofinder.processor import DocumentProcessor

        processor = DocumentProcessor(config)
        console.print("[green]✓ Processor initialized[/green]")

        result = processor.process_document(sample_file)

        if result.success:
            console.print("[green]✓ Document processed successfully[/green]")
            console.print(f"  Entities: {len(result.entities)}")
            console.print(f"  Chunks: {len(result.text_chunks)}")
            console.print(f"  Summary: {result.summary.summary[:100]}...")
            console.print(f"  Tags: {', '.join(result.summary.tags[:5])}")
        else:
            console.print(f"[red]✗ Processing failed: {result.error}[/red]")

    except Exception as e:
        console.print(f"[red]✗ Pipeline test failed: {e}[/red]")
        import traceback

        traceback.print_exc()


def main() -> None:
    """Run all tests."""
    console.print("[bold green]Document Processing Pipeline Test Suite[/bold green]")

    # Setup minimal logging
    logging.basicConfig(level=logging.WARNING)

    try:
        test_entity_extraction()
        test_embedder()
        test_ai_analyzer()
        test_full_pipeline()

        console.print("\n[bold green]All tests completed![/bold green]")

    except Exception as e:
        console.print(f"\n[bold red]Test suite failed: {e}[/bold red]")
        import sys

        sys.exit(1)


if __name__ == "__main__":
    main()
