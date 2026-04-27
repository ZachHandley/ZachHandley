# Document Processing Pipeline

Complete local document processing system for the Epstein document collection using SpaCy NER, LiteLLM, sentence-transformers, Appwrite, and Pinecone.

## Overview

This pipeline processes PDF documents through multiple stages:

1. **Text Extraction** - Extract text from PDF files
2. **LLM Analysis** - Generate summaries, themes, and tags using LiteLLM (Ollama or cloud)
3. **Entity Extraction** - Extract people, organizations, locations, and dates using SpaCy NER
4. **Vector Embedding** - Generate embeddings using sentence-transformers or OpenAI
5. **Storage** - Store in Appwrite (metadata) and Pinecone (vectors)

## Architecture

```
┌─────────────────┐
│  PDF Documents  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│        Document Processor Orchestrator          │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ 1. Text Extraction (PyPDF2)             │   │
│  └─────────────────────────────────────────┘   │
│                    │                             │
│                    ▼                             │
│  ┌─────────────────────────────────────────┐   │
│  │ 2. LLM Analysis (LiteLLM)               │   │
│  │    - Summary generation                 │   │
│  │    - Theme extraction                   │   │
│  │    - Tag generation                     │   │
│  └─────────────────────────────────────────┘   │
│                    │                             │
│                    ▼                             │
│  ┌─────────────────────────────────────────┐   │
│  │ 3. Entity Extraction (SpaCy)            │   │
│  │    - People (PERSON)                    │   │
│  │    - Organizations (ORG)                │   │
│  │    - Locations (GPE/LOC)                │   │
│  │    - Dates (DATE)                       │   │
│  │    - Pattern matching for known entities│   │
│  └─────────────────────────────────────────┘   │
│                    │                             │
│                    ▼                             │
│  ┌─────────────────────────────────────────┐   │
│  │ 4. Vector Embedding                     │   │
│  │    - sentence-transformers (local)      │   │
│  │    - OpenAI embeddings (cloud)          │   │
│  └─────────────────────────────────────────┘   │
│                    │                             │
│                    ▼                             │
│  ┌─────────────────────────────────────────┐   │
│  │ 5. Storage                              │   │
│  │    - Appwrite (documents & entities)    │   │
│  │    - Pinecone (vector search)           │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Installation

### 1. Install Dependencies

```bash
cd /home/zach/github/ZachHandley/packages/pedofinder
uv sync
```

### 2. Download SpaCy Model

The transformer-based SpaCy model provides the most accurate entity extraction:

```bash
uv run python scripts/setup_spacy.py
```

This downloads the `en_core_web_trf` model (~438MB).

### 3. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required configuration:**

```env
# LLM Configuration (choose one)
LITELLM_MODEL=ollama/llama3.2          # For local Ollama
# LITELLM_MODEL=gpt-4o-mini            # For OpenAI
# OPENAI_API_KEY=sk-...                # If using OpenAI

# Embedding Configuration (choose one)
EMBEDDING_MODEL=all-MiniLM-L6-v2       # Local sentence-transformers
# EMBEDDING_MODEL=text-embedding-3-small # OpenAI embeddings
# OPENAI_API_KEY=sk-...                # If using OpenAI

# Appwrite Configuration
APPWRITE_ENDPOINT=https://appwrite.blackleafdigital.com/v1
APPWRITE_PROJECT_ID=691779a3003300288357
APPWRITE_API_KEY=your-appwrite-api-key-here
APPWRITE_DATABASE_ID=pedofinder

# Pinecone Configuration
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_INDEX_NAME=epstein-docs
PINECONE_ENVIRONMENT=us-east-1

# Processing Configuration
BATCH_SIZE=10
MAX_WORKERS=4
```

## Usage

### Process All Documents

```bash
cd /home/zach/github/ZachHandley/packages/pedofinder

# Process all PDFs in data/pdfs/
uv run python scripts/process_all_documents.py

# Process with custom options
uv run python scripts/process_all_documents.py \
  --pdf-dir ./data/pdfs \
  --batch-size 10 \
  --skip-existing \
  --verbose

# Process limited number for testing
uv run python scripts/process_all_documents.py --limit 10

# Reprocess all documents (force)
uv run python scripts/process_all_documents.py --force

# Disable storage backends
uv run python scripts/process_all_documents.py --no-pinecone
uv run python scripts/process_all_documents.py --no-appwrite
```

### Process Single Document

```python
from pathlib import Path
from pedofinder.config import get_settings
from pedofinder.processors.document_processor import DocumentProcessor

# Initialize
settings = get_settings()
processor = DocumentProcessor(settings)

# Process single PDF
pdf_path = Path("data/pdfs/HOUSE_OVERSIGHT_010477.txt.pdf")
document = processor.process_pdf(pdf_path)

print(f"Summary: {document.summary}")
print(f"Entities: {document.entity_ids}")
```

## Components

### 1. LLM Processor (`processors/llm_processor.py`)

Uses LiteLLM to support multiple LLM backends:

**Supported models:**
- **Local**: Ollama models (`ollama/llama3.2`, `ollama/mistral`, etc.)
- **Cloud**: OpenAI (`gpt-4o-mini`, `gpt-4o`), Anthropic (`claude-3-5-sonnet-20241022`)

**Outputs:**
- Document summary (2-3 sentences)
- Key themes (main topics)
- Tags (descriptive keywords)
- Relevance score (0-1)

### 2. Entity Extractor (`processors/entity_extractor.py`)

Uses SpaCy transformer model with pattern matching:

**Extraction methods:**
1. **SpaCy NER**: General entity recognition
2. **Pattern Matching**: Known entities (Epstein, Maxwell, Clinton, etc.)

**Entity types:**
- PERSON: People mentioned
- ORGANIZATION: Companies, agencies, foundations
- LOCATION: Cities, countries, addresses
- DATE: Dates and temporal expressions

**Features:**
- Confidence scoring
- Context extraction (surrounding text)
- Entity normalization
- Deduplication

### 3. Vector Embedder (`processors/vector_embedder.py`)

Generates embeddings for semantic search:

**Methods:**
- **Local**: sentence-transformers models
  - `all-MiniLM-L6-v2` (384 dim, fast)
  - `all-mpnet-base-v2` (768 dim, accurate)
- **Cloud**: OpenAI embeddings
  - `text-embedding-3-small` (1536 dim)
  - `text-embedding-3-large` (3072 dim)

**Features:**
- Batch processing
- Cosine similarity calculation
- Automatic text truncation

### 4. Appwrite Client (`storage/appwrite_client.py`)

Stores structured document and entity data:

**Collections:**
- `documents`: Document metadata, summaries, tags
- `entities`: Extracted entities with relationships
- `relationships`: Entity-to-entity relationships

**Operations:**
- Create/update documents
- Create/update entities
- Batch operations
- Query by filters

### 5. Pinecone Client (`storage/pinecone_client.py`)

Vector storage for semantic search:

**Features:**
- Automatic index creation
- Batch vector upsert
- Similarity search
- Metadata filtering

**Index configuration:**
- Metric: Cosine similarity
- Cloud: AWS
- Dimension: Configurable (default 1536)

## Data Models

### Document

```python
Document(
    id="HOUSE_OVERSIGHT_010477",
    filename="HOUSE_OVERSIGHT_010477.txt.pdf",
    source_collection="HOUSE_OVERSIGHT",
    raw_text="...",
    summary="Document discusses...",
    key_themes=["financial transactions", "witness testimony"],
    tags=["legal", "testimony", "investigation"],
    entity_ids={
        "person": ["person_jeffrey_epstein", "person_ghislaine_maxwell"],
        "organization": ["org_clinton_foundation"],
        "location": ["loc_little_st_james"]
    },
    word_count=5000,
    status="completed",
    has_embedding=True
)
```

### Entity

```python
EntityPerson(
    id="person_jeffrey_epstein",
    name="Jeffrey Epstein",
    normalized_name="jeffrey epstein",
    aliases=["J. Epstein", "Epstein"],
    mention_count=150,
    document_ids=["HOUSE_OVERSIGHT_010477", ...],
    description="American financier and convicted sex offender",
    tags=["financier", "convicted"],
    average_confidence=0.95
)
```

## Performance

**Processing speed** (approximate):
- **Local (Ollama)**: 30-60 seconds/document
- **Cloud (OpenAI)**: 10-20 seconds/document

**Resource usage:**
- **CPU**: SpaCy transformer model (GPU recommended but not required)
- **Memory**: ~2GB for SpaCy model + embeddings
- **Disk**: ~500MB for SpaCy model + sentence-transformers

**Scaling:**
- Batch processing: 10 documents at a time (configurable)
- Can process all 2,911 documents in ~8-24 hours (depending on LLM backend)

## Error Handling

The pipeline includes comprehensive error handling:

1. **Retry logic**: LLM calls retry 3 times on failure
2. **Graceful degradation**: Processing continues if components fail
3. **Failed document tracking**: Failed documents logged in Appwrite
4. **Resume capability**: Skip already processed documents

## Monitoring

**Progress tracking:**
- Real-time progress bars (Rich library)
- Time elapsed and remaining estimates
- Success/failure counts

**Logging:**
- Rich-formatted logs with tracebacks
- Configurable log levels (DEBUG, INFO, WARNING, ERROR)
- JSON or text format

## Known Entities

The entity extractor includes pattern matching for key figures:

**People:**
- Jeffrey Epstein
- Ghislaine Maxwell
- Bill Clinton
- Donald Trump
- Prince Andrew
- Alan Dershowitz
- Virginia Giuffre
- Jean-Luc Brunel
- Leslie Wexner

**Organizations:**
- Clinton Foundation
- FBI
- Department of Justice
- Victoria's Secret
- J. Epstein & Co.

**Locations:**
- Little St. James (Epstein Island)
- Palm Beach
- New York
- US Virgin Islands
- Paris
- London

## Troubleshooting

### SpaCy model not found

```bash
uv run python scripts/setup_spacy.py
```

### Ollama connection error

```bash
# Start Ollama
ollama serve

# Pull model
ollama pull llama3.2
```

### Appwrite connection error

Check API key and endpoint in `.env`:
```env
APPWRITE_API_KEY=your-actual-key-here
APPWRITE_ENDPOINT=https://appwrite.blackleafdigital.com/v1
```

### Pinecone index error

Verify API key and index name:
```env
PINECONE_API_KEY=your-actual-key-here
PINECONE_INDEX_NAME=epstein-docs
```

## Future Enhancements

- [ ] Relationship extraction between entities
- [ ] Temporal analysis (timeline generation)
- [ ] Document clustering by similarity
- [ ] Advanced query interface
- [ ] Entity disambiguation
- [ ] Multi-language support
- [ ] GPU acceleration for embeddings
- [ ] Distributed processing

## License

See LICENSE.md in project root.
