# Pedofinder - Epstein Document Analyzer

A comprehensive document analysis system for extracting, indexing, and exploring entities, relationships, and connections from the Epstein court documents. Built with modern Python, AI-powered entity extraction, and a public web interface for transparent investigation.

## Overview

This project analyzes thousands of pages from the Epstein court document releases to create a searchable, interconnected database of:

- **People** mentioned in documents (victims, associates, employees, witnesses)
- **Organizations** (companies, institutions, government agencies)
- **Locations** (properties, travel destinations, addresses)
- **Events** (flights, meetings, incidents)
- **Relationships** (connections between entities)
- **Timeline data** (chronological event mapping)

## Tech Stack

### Processing Pipeline
- **UV** - Fast Python package management
- **LiteLLM** - AI model abstraction (supports Ollama, OpenAI, Anthropic)
- **SpaCy** - Named Entity Recognition with transformer models
- **sentence-transformers** - Local vector embeddings
- **PyPDF2** - PDF text extraction

### Storage
- **Appwrite** - Document and entity metadata storage
- **Pinecone** - Vector database for semantic search
- **LanceDB** - Alternative local vector storage (optional)
- **SQLite** - Local structured data (optional)

### Development
- **FastAPI** - Web API (planned)
- **Ruff + Mypy** - Type safety and linting
- **Rich** - Beautiful terminal output

## Quick Start

### Installation

```bash
cd /home/zach/github/ZachHandley/packages/pedofinder

# Install dependencies
uv sync

# Download SpaCy NER model
uv run python scripts/setup_spacy.py

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### Processing Documents

```bash
# Test with one document
uv run python scripts/example_usage.py

# Process 10 documents (test run)
uv run python scripts/process_all_documents.py --limit 10 --verbose

# Process all 2,911 documents
uv run python scripts/process_all_documents.py
```

### What Gets Extracted

For each document:
- AI-generated summary and key themes
- Named entities (people, organizations, locations, dates)
- Relevance scoring
- Vector embeddings for semantic search
- Stored in Appwrite + Pinecone for querying

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Quick start guide for processing documents
- **[PROCESSING_PIPELINE.md](PROCESSING_PIPELINE.md)** - Complete pipeline documentation
- **[PROJECT_TODO.md](PROJECT_TODO.md)** - Implementation roadmap
- **[DOWNLOADER_IMPLEMENTATION.md](DOWNLOADER_IMPLEMENTATION.md)** - PDF download system

## Features

### Current (v0.1.0)

- PDF text extraction from court documents
- LLM-powered document summarization and tagging
- SpaCy NER entity extraction (people, orgs, locations, dates)
- Pattern matching for known entities (Epstein, Maxwell, Clinton, etc.)
- Vector embeddings for semantic search
- Appwrite metadata storage
- Pinecone vector storage
- Batch processing with progress tracking
- Comprehensive error handling and retry logic

### Planned

- Entity relationship mapping
- Timeline generation
- Advanced query interface
- Web-based document explorer
- Graph visualization
- Multi-document analysis
- Export to various formats

## License

TBD - Open source for transparency and public research.
