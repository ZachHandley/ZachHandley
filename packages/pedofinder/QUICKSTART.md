# Pedofinder - Quick Start Guide

Complete local document processing pipeline for analyzing Epstein-related court documents.

## What This Does

This pipeline processes PDF documents through:

1. Text extraction
2. AI-powered summarization and tagging
3. Named entity recognition (people, organizations, locations)
4. Vector embeddings for semantic search
5. Storage in Appwrite (metadata) and Pinecone (vectors)

## Prerequisites

- Python 3.11+
- `uv` package manager
- Ollama (for local LLM) OR OpenAI API key
- Pinecone account (for vector storage)
- Appwrite instance (for metadata storage)

## Installation

### 1. Install Dependencies

```bash
cd /home/zach/github/ZachHandley/packages/pedofinder
uv sync
```

### 2. Download SpaCy NER Model

```bash
uv run python scripts/setup_spacy.py
```

This downloads the transformer-based SpaCy model (~438MB).

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# For local processing with Ollama
LITELLM_MODEL=ollama/llama3.2
EMBEDDING_MODEL=all-MiniLM-L6-v2

# For cloud processing with OpenAI
# LITELLM_MODEL=gpt-4o-mini
# OPENAI_API_KEY=sk-...
# EMBEDDING_MODEL=text-embedding-3-small

# Appwrite (required)
APPWRITE_API_KEY=your-appwrite-key-here

# Pinecone (required)
PINECONE_API_KEY=your-pinecone-key-here
```

## Usage

### Quick Test (Single Document)

```bash
cd /home/zach/github/ZachHandley/packages/pedofinder
uv run python scripts/example_usage.py
```

This processes one document and shows the results.

### Process All Documents

```bash
# Process all PDFs in data/pdfs/
uv run python scripts/process_all_documents.py

# Process with verbose logging
uv run python scripts/process_all_documents.py --verbose

# Process limited number for testing
uv run python scripts/process_all_documents.py --limit 10

# Force reprocessing (skip cache)
uv run python scripts/process_all_documents.py --force
```

### Processing Options

```bash
uv run python scripts/process_all_documents.py \
  --pdf-dir ./data/pdfs \         # PDF directory
  --batch-size 10 \                # Batch size
  --skip-existing \                # Skip processed docs
  --limit 100 \                    # Limit number
  --no-pinecone \                  # Disable Pinecone
  --no-appwrite \                  # Disable Appwrite
  --verbose                        # Verbose logging
```

## What Gets Extracted

### Document Metadata

- **Summary**: 2-3 sentence AI-generated summary
- **Key Themes**: Main topics (e.g., "financial transactions", "witness testimony")
- **Tags**: Descriptive keywords (e.g., "legal", "testimony", "investigation")
- **Relevance Score**: 0-1 score for Epstein investigation relevance

### Entities

- **People**: Jeffrey Epstein, Ghislaine Maxwell, Bill Clinton, etc.
- **Organizations**: Clinton Foundation, FBI, Department of Justice, etc.
- **Locations**: Little St. James, Palm Beach, New York, etc.
- **Dates**: Significant dates and temporal expressions

### Embeddings

- Vector embeddings for semantic search
- Stored in Pinecone with metadata
- Queryable for similar document retrieval

## Example Output

```
Processing: HOUSE_OVERSIGHT_010477.txt.pdf

Document ID: HOUSE_OVERSIGHT_010477
Word Count: 5,234
Status: completed

Summary:
  This document contains email correspondence between Clinton Foundation
  staff discussing a donation from Jeffrey Epstein in 2006. The emails
  show internal deliberation about whether to accept the contribution.

Key Themes:
  • financial donations
  • email correspondence
  • organizational policy

Tags:
  legal, emails, foundation, donor relations

Entities Extracted:
  person: 12 unique entities
  organization: 5 unique entities
  location: 3 unique entities
  date: 8 unique entities

Vector embedding generated and stored in Pinecone ✓
```

## Performance

**Processing Speed:**
- Local (Ollama): ~30-60 seconds per document
- Cloud (OpenAI): ~10-20 seconds per document

**Total Time for 2,911 Documents:**
- Local: ~24-48 hours
- Cloud: ~8-16 hours

**Resource Usage:**
- CPU: Moderate (GPU recommended for SpaCy)
- Memory: ~2-4GB
- Disk: ~1GB for models

## Architecture

```
PDF → Text Extraction → LLM Analysis → Entity Extraction → Embeddings
                                                                ↓
                                           Appwrite ← Storage → Pinecone
```

**Components:**
- **LLM**: LiteLLM (supports Ollama, OpenAI, Anthropic, etc.)
- **NER**: SpaCy transformer model
- **Embeddings**: sentence-transformers or OpenAI
- **Metadata**: Appwrite database
- **Vectors**: Pinecone vector database

## Troubleshooting

### "SpaCy model not found"

```bash
uv run python scripts/setup_spacy.py
```

### "Ollama connection failed"

```bash
ollama serve
ollama pull llama3.2
```

### "Appwrite authentication failed"

Check your `.env`:
```env
APPWRITE_API_KEY=your-actual-key
APPWRITE_ENDPOINT=https://appwrite.blackleafdigital.com/v1
```

### "Pinecone connection failed"

Check your `.env`:
```env
PINECONE_API_KEY=your-actual-key
PINECONE_INDEX_NAME=epstein-docs
```

## Next Steps

1. **Run a test**: `uv run python scripts/example_usage.py`
2. **Process 10 documents**: `uv run python scripts/process_all_documents.py --limit 10`
3. **Review results**: Check Appwrite and Pinecone dashboards
4. **Process all**: `uv run python scripts/process_all_documents.py`

## Documentation

- **Full Documentation**: See `PROCESSING_PIPELINE.md`
- **Data Models**: See `src/pedofinder/core/`
- **Processors**: See `src/pedofinder/processors/`
- **Storage**: See `src/pedofinder/storage/`

## Support

For issues or questions, see the main project README or create an issue in the repository.
