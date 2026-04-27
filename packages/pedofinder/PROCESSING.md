# Document Processing Pipeline

This document describes the local AI-powered document processing pipeline for the Pedofinder project.

## Overview

The processing pipeline extracts entities, generates summaries and tags, and creates embeddings for all documents in the `data/pdfs/` directory using **local** LLM models (via Ollama) and NLP libraries.

## Architecture

### Components

1. **Entity Extractor** (`processor/entity_extractor.py`)
   - Uses SpaCy NER with transformer model (`en_core_web_trf`)
   - Extracts: PERSON, ORG, GPE, LOC, DATE, MONEY, NORP entities
   - Fast, local, no API calls required

2. **AI Analyzer** (`processor/ai_analyzer.py`)
   - Uses LiteLLM for LLM calls (supports Ollama, OpenAI, Anthropic, etc.)
   - Generates document summaries (2-3 sentences)
   - Creates relevant tags (5-10 per document)
   - Extracts key people with roles/context
   - Automatic fallback to cloud models if local fails

3. **Document Embedder** (`processor/embedder.py`)
   - Uses sentence-transformers (`all-MiniLM-L6-v2`)
   - Generates 384-dimensional embeddings
   - Chunks documents intelligently (512 chars with 50 char overlap)
   - Enables semantic search and similarity matching

4. **Processing Pipeline** (`processor/pipeline.py`)
   - Orchestrates all components
   - Processes documents in batches
   - Saves results as structured JSON
   - Tracks progress with tqdm progress bars
   - Comprehensive error handling and logging

## Installation

### 1. Install Dependencies

All dependencies are already in `pyproject.toml`. Install with:

```bash
uv sync
```

### 2. Install SpaCy Model

Download the transformer-based English model:

```bash
# Option 1: Use the download script
uv run python scripts/download_spacy_model.py

# Option 2: Manual download (if you have pip)
python -m spacy download en_core_web_trf
```

### 3. Install Ollama (for local LLMs)

```bash
# On Linux
curl -fsSL https://ollama.com/install.sh | sh

# Pull recommended models
ollama pull llama3
ollama pull mistral
```

## Configuration

Configuration is handled via `src/pedofinder/config/models.py`:

### Default Settings

```python
ProcessingConfig(
    # LLM Settings
    primary_model="ollama/llama3",        # Local Ollama model
    fallback_model="gpt-4-turbo",         # Cloud fallback (if Ollama down)
    temperature=0.1,                      # Low temp for factual analysis
    max_tokens=500,                       # Response length limit

    # SpaCy Settings
    spacy_model="en_core_web_trf",        # Transformer-based NER
    entity_types=["PERSON", "ORG", "GPE", "LOC", "DATE", "MONEY", "NORP"],

    # Embeddings Settings
    embedding_model="all-MiniLM-L6-v2",   # Lightweight, fast, 384-dim
    chunk_size=512,                       # Characters per chunk
    chunk_overlap=50,                     # Overlap for context

    # Processing Settings
    batch_size=10,                        # Documents per batch
    skip_existing=True,                   # Don't reprocess existing
    max_retries=3,                        # LLM retry attempts

    # Directories
    input_dir=Path("data/pdfs"),
    output_dir=Path("data/processed"),
)
```

### Customizing Configuration

Create a custom config in your script:

```python
from pedofinder.config.models import ProcessingConfig
from pedofinder.processor import DocumentProcessor

# Custom configuration
config = ProcessingConfig(
    primary_model="ollama/qwen2.5",  # Use Qwen model
    embedding_model="all-mpnet-base-v2",  # Better embeddings (slower)
    chunk_size=1024,  # Larger chunks
    skip_existing=False,  # Reprocess everything
)

processor = DocumentProcessor(config)
```

## Usage

### Process All Documents

```bash
# Run the processing script
uv run python scripts/process_documents.py
```

This will:
1. Load all documents from `data/pdfs/`
2. Extract entities using SpaCy
3. Generate summaries and tags using LLM
4. Create embeddings for semantic search
5. Save all results to `data/processed/`

### Output Structure

```
data/processed/
├── documents/          # Document metadata
│   ├── HOUSE_OVERSIGHT_010477.json
│   └── ...
├── entities/           # Extracted entities
│   ├── HOUSE_OVERSIGHT_010477.json
│   └── ...
├── embeddings/         # Vector embeddings
│   ├── HOUSE_OVERSIGHT_010477.json
│   └── ...
└── summaries/          # AI summaries + tags
    ├── HOUSE_OVERSIGHT_010477.json
    └── ...
```

### Processing Statistics

After processing, check the statistics:

```bash
cat data/analysis/processing_stats.json
```

Example output:
```json
{
  "total_files": 150,
  "processed": 148,
  "skipped": 0,
  "failed": 2,
  "total_entities": 4523,
  "total_chunks": 3200,
  "avg_entities_per_doc": 30.6,
  "avg_chunks_per_doc": 21.6,
  "errors": [
    {
      "document_id": "HOUSE_OVERSIGHT_010477",
      "error": "Unicode decode error"
    }
  ]
}
```

## LiteLLM Model Configuration

The `src/pedofinder/config/litellm_config.yaml` file defines available models:

### Local Models (Ollama)

```yaml
- model_name: ollama/llama3
  litellm_params:
    model: ollama/llama3
    api_base: http://localhost:11434
```

### Cloud Models (Fallback)

```yaml
- model_name: gpt-4-turbo
  litellm_params:
    model: gpt-4-turbo
    api_key: ${OPENAI_API_KEY}
```

Set API keys in environment:
```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Export to Appwrite

After processing, export to Appwrite database:

```bash
# Set Appwrite credentials
export APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
export APPWRITE_PROJECT_ID="your-project-id"
export APPWRITE_API_KEY="your-api-key"
export APPWRITE_DATABASE_ID="your-database-id"

# Set collection IDs
export APPWRITE_METADATA_COLLECTION="documents"
export APPWRITE_ENTITIES_COLLECTION="entities"
export APPWRITE_SUMMARIES_COLLECTION="summaries"

# Run export
uv run python scripts/export_to_appwrite.py
```

## Advanced Usage

### Process Single Document

```python
from pathlib import Path
from pedofinder.config.models import ProcessingConfig
from pedofinder.processor import DocumentProcessor

config = ProcessingConfig()
processor = DocumentProcessor(config)

# Process one document
result = processor.process_document(
    Path("data/pdfs/HOUSE_OVERSIGHT_010477.txt.pdf")
)

# Access results
print(f"Summary: {result.summary.summary}")
print(f"Tags: {result.summary.tags}")
print(f"Entities: {len(result.entities)}")
print(f"Embeddings: {len(result.embeddings)}")
```

### Custom Entity Extraction

```python
from pedofinder.processor import EntityExtractor

extractor = EntityExtractor(
    model_name="en_core_web_trf",
    entity_types=["PERSON", "ORG"]  # Only extract people and orgs
)

entities = extractor.extract_entities("Your text here...")
for entity in entities:
    print(f"{entity.text} ({entity.label})")
```

### Semantic Search

```python
from pedofinder.processor import DocumentEmbedder

embedder = DocumentEmbedder(model_name="all-MiniLM-L6-v2")

# Embed document
chunks, embeddings = embedder.embed_document(document_text)

# Search for similar chunks
query = "What did the witness say about Epstein?"
similar = embedder.find_most_similar_chunks(
    query, chunks, embeddings, top_k=5
)

for idx, chunk, score in similar:
    print(f"Score: {score:.3f}")
    print(f"Chunk: {chunk[:200]}...")
```

## Performance

### Processing Speed (on M1 Mac)

- **Entity Extraction**: ~2-5 seconds per document (SpaCy transformer)
- **AI Analysis**: ~10-20 seconds per document (Ollama llama3)
- **Embeddings**: ~1-3 seconds per document (sentence-transformers)
- **Total**: ~15-30 seconds per document

For 150 documents: **30-60 minutes total**

### Optimization Tips

1. **Use GPU**: Install CUDA/ROCm for faster processing
2. **Increase batch size**: Process more documents in parallel
3. **Use lighter models**:
   - SpaCy: `en_core_web_sm` (10x faster, less accurate)
   - Embeddings: `all-MiniLM-L6-v2` (already lightweight)
   - LLM: `ollama/llama3.2` (smaller, faster)

## Troubleshooting

### Ollama Not Running

```bash
# Start Ollama service
ollama serve

# In another terminal, pull model
ollama pull llama3
```

### SpaCy Model Not Found

```bash
# Download the model
uv run python scripts/download_spacy_model.py
```

### Out of Memory

Reduce batch size in config:
```python
config = ProcessingConfig(
    batch_size=5,  # Smaller batches
    chunk_size=256,  # Smaller chunks
)
```

### LLM Timeout

Increase timeout or switch to lighter model:
```python
config = ProcessingConfig(
    primary_model="ollama/llama3.2",  # Smaller model
    max_retries=5,  # More retries
    retry_delay=2.0,  # Longer delays
)
```

## Next Steps

1. **Process all documents**: `uv run python scripts/process_documents.py`
2. **Export to Appwrite**: `uv run python scripts/export_to_appwrite.py`
3. **Build search interface**: Use embeddings for semantic search
4. **Analyze entities**: Find connections between people/organizations
5. **Generate insights**: Use LLMs to analyze patterns across documents

## License

Same as parent project (see LICENSE.md)
