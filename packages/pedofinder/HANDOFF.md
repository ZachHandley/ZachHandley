# Pedofinder - Project Handoff Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Setup & Installation](#setup--installation)
6. [Processing Pipeline](#processing-pipeline)
7. [Frontend Application](#frontend-application)
8. [Data Models](#data-models)
9. [API Reference](#api-reference)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)
12. [Future Enhancements](#future-enhancements)

---

## Project Overview

### What is Pedofinder?

Pedofinder is a comprehensive document analysis system designed to process, analyze, and visualize 2,911 Epstein-related documents released by the House Oversight Committee. The system extracts entities (people, organizations, locations, dates), generates AI summaries, and provides an interactive web interface for exploring connections and relationships within the documents.

### Key Capabilities

- **Automated Document Processing**: Extract text, entities, and generate AI summaries for 2,911 PDF documents
- **Entity Recognition**: Identify and track people, organizations, locations, and dates mentioned across documents
- **Relationship Mapping**: Discover connections between entities based on co-occurrence patterns
- **Semantic Search**: Find documents using natural language queries via vector embeddings
- **Interactive Visualization**: Explore entity networks, statistics, and timelines through ECharts-based visualizations
- **Full-Text Search**: Fast searching across all document text using Appwrite's full-text indexes

### Project Goals

1. **Public Transparency**: Make government documents easily searchable and analyzable
2. **Pattern Discovery**: Uncover relationships and patterns that might not be obvious from reading individual documents
3. **Accessibility**: Provide a user-friendly interface for non-technical users to explore the data
4. **Extensibility**: Allow users to submit additional relevant documents for analysis

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                           │
│  (Vue 3 + TypeScript + ECharts - Port 3000)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─────────────────┐
                     │                 │
                     ▼                 ▼
         ┌───────────────────┐  ┌─────────────────┐
         │    APPWRITE       │  │    PINECONE     │
         │  (Metadata DB)    │  │ (Vector Store)  │
         │   Self-hosted     │  │     Cloud       │
         └─────────┬─────────┘  └────────┬────────┘
                   │                     │
                   └──────────┬──────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  PYTHON BACKEND  │
                    │   (Processing)   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Raw PDF Files  │
                    │   (2,911 docs)   │
                    └──────────────────┘
```

### Data Flow

**Processing Flow (One-time Setup):**
```
Raw PDFs → Document Processor → Entity Extractor → LLM Processor → Vector Embedder
    ↓              ↓                  ↓                 ↓              ↓
Text Files    Cleaned Text      Named Entities    AI Summary    Embeddings
                                                      ↓              ↓
                                                  Appwrite      Pinecone
```

**User Query Flow (Runtime):**
```
User Search Query
    ↓
    ├─→ Full-Text Search (Appwrite) → Results
    │
    └─→ Semantic Search (Pinecone) → Similar Docs → Metadata (Appwrite) → Results
```

### Component Responsibilities

**Python Backend:**
- Read and parse PDF text files
- Extract entities using SpaCy NER
- Generate summaries and tags using LiteLLM (Ollama or cloud LLMs)
- Create vector embeddings using sentence-transformers
- Store metadata in Appwrite tables
- Store vectors in Pinecone index

**Appwrite (Self-hosted):**
- Store document text and metadata
- Store extracted entities (people, orgs, locations, dates)
- Store entity relationships
- Provide full-text search capabilities
- Manage user submissions

**Pinecone (Cloud):**
- Store document embeddings (384-dimensional vectors)
- Enable semantic similarity search
- Fast nearest-neighbor queries

**TypeScript Frontend:**
- Search interface with filters
- Interactive visualizations (network graphs, charts)
- Entity and document profile pages
- Responsive UI for mobile/tablet/desktop

---

## Technology Stack

### Backend (Python)

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Core language |
| UV | Latest | Package manager (faster than pip) |
| SpaCy | 3.7+ | Named Entity Recognition (NER) |
| en_core_web_trf | Latest | Transformer-based English language model |
| LiteLLM | 1.0+ | LLM abstraction (supports Ollama, OpenAI, Anthropic) |
| sentence-transformers | 2.0+ | Generate embeddings for semantic search |
| Appwrite SDK | 5.0+ | Database and API client |
| Pinecone Client | 5.0+ | Vector database client |
| Pydantic | 2.0+ | Data validation and settings management |
| Rich | 13.0+ | Beautiful terminal output |

### Frontend (TypeScript)

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | 5.8+ | Type-safe JavaScript |
| Vue 3 | 3.5+ | Reactive UI framework |
| Vite | 6.0+ | Build tool and dev server |
| Vue Router | 4.4+ | Client-side routing |
| ECharts | 5.5+ | ALL visualizations (graphs, charts, word clouds) |
| vue-echarts | 7.0+ | Vue wrapper for ECharts |
| Appwrite SDK | 16.0+ | Database client |
| Zod | 3.23+ | Runtime type validation |
| VueUse | 11.0+ | Vue composition utilities |

### Infrastructure

| Service | Type | Purpose |
|---------|------|---------|
| Appwrite | Self-hosted | Database, storage, API |
| Pinecone | Cloud | Vector similarity search |
| pnpm | Package manager | Frontend dependencies |
| UV | Package manager | Python dependencies |

---

## Project Structure

### Directory Layout

```
packages/pedofinder/
│
├── data/                           # Data directory
│   ├── pdfs/                       # 2,911 raw PDF files (*.txt.pdf)
│   └── raw/                        # Original downloads
│
├── src/pedofinder/                 # Python source code
│   ├── core/                       # Core data models
│   │   ├── document.py            # Document and chunk models
│   │   └── entities.py            # Entity models (Person, Org, etc.)
│   │
│   ├── processors/                 # Processing pipeline
│   │   ├── document_processor.py  # Main orchestrator
│   │   ├── entity_extractor.py    # SpaCy NER + pattern matching
│   │   ├── llm_processor.py       # LiteLLM integration
│   │   └── vector_embedder.py     # Embedding generation
│   │
│   ├── storage/                    # Data persistence
│   │   ├── appwrite_client.py     # Appwrite API wrapper
│   │   └── pinecone_client.py     # Pinecone vector store
│   │
│   ├── scraper/                    # Document downloader (Playwright)
│   │   ├── playwright_downloader.py
│   │   └── models.py
│   │
│   └── config.py                   # Configuration management
│
├── scripts/                        # Executable scripts
│   ├── download_pdfs.py           # Download all PDFs from Google Pinpoint
│   ├── setup_spacy.py             # Install SpaCy language model
│   ├── process_all_documents.py   # Process all documents
│   └── example_usage.py           # Example single document processing
│
├── web/                            # TypeScript frontend
│   ├── src/
│   │   ├── views/                 # Page components
│   │   │   ├── Home.vue          # Search interface
│   │   │   ├── GraphView.vue     # Network graph visualization
│   │   │   ├── Statistics.vue    # Statistics dashboard
│   │   │   ├── EntityView.vue    # Entity profile page
│   │   │   └── DocumentView.vue  # Document viewer
│   │   │
│   │   ├── components/            # Reusable components
│   │   │   ├── search/           # Search components
│   │   │   ├── visualization/    # ECharts visualizations
│   │   │   ├── entity/           # Entity components
│   │   │   └── document/         # Document components
│   │   │
│   │   ├── services/              # API services
│   │   │   ├── appwrite.ts       # Appwrite client
│   │   │   ├── pinecone.ts       # Pinecone client (optional)
│   │   │   └── search.ts         # Unified search service
│   │   │
│   │   ├── types/                 # TypeScript type definitions
│   │   │   ├── entities.ts       # Entity types
│   │   │   ├── documents.ts      # Document types
│   │   │   └── api.ts            # API types
│   │   │
│   │   ├── router.ts              # Route definitions
│   │   ├── App.vue                # Root component
│   │   └── main.ts                # Entry point
│   │
│   ├── package.json               # Frontend dependencies
│   ├── tsconfig.json              # TypeScript config
│   ├── vite.config.ts             # Vite build config
│   └── .env.example               # Environment variables template
│
├── pyproject.toml                 # Python dependencies
├── .env.example                   # Backend environment template
├── README.md                      # Project overview
├── QUICKSTART.md                  # Quick start guide
├── PROCESSING.md                  # Processing pipeline docs
└── HANDOFF.md                     # This file
```

### Key Files Explained

**Configuration Files:**
- `pyproject.toml`: Python dependencies, managed by UV
- `web/package.json`: TypeScript dependencies, managed by pnpm
- `.env`: Backend environment variables (API keys, endpoints)
- `web/.env`: Frontend environment variables (Appwrite config)

**Entry Points:**
- `scripts/download_pdfs.py`: Start here to download documents
- `scripts/process_all_documents.py`: Start here to process documents
- `web/src/main.ts`: Frontend application entry point

**Core Business Logic:**
- `src/pedofinder/processors/document_processor.py`: Main processing orchestrator
- `src/pedofinder/processors/entity_extractor.py`: Entity extraction logic
- `src/pedofinder/processors/llm_processor.py`: AI summarization and tagging

---

## Setup & Installation

### Prerequisites

**System Requirements:**
- **OS**: Linux, macOS, or WSL2 on Windows
- **RAM**: Minimum 8GB, 16GB recommended
- **Disk**: 10GB free space (for models and data)
- **Python**: 3.11 or higher
- **Node.js**: 18 or higher

**Required Accounts:**
- **Appwrite**: Self-hosted instance at `https://appwrite.blackleafdigital.com/v1`
- **Pinecone**: Cloud account (free tier works)
- **Optional - OpenAI/Anthropic**: For cloud LLM processing (or use Ollama locally)

### Step 1: Clone and Navigate

```bash
cd /home/zach/github/ZachHandley/packages/pedofinder
```

### Step 2: Backend Setup (Python)

**Install UV package manager:**
```bash
# If not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Install Python dependencies:**
```bash
# From pedofinder directory
uv sync
```

**Download SpaCy language model:**
```bash
uv run python scripts/setup_spacy.py
```

This downloads the `en_core_web_trf` model (~500MB), which provides state-of-the-art NER accuracy using transformers.

**Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and configure:

```bash
# LiteLLM - Choose ONE:
# Option 1: Local Ollama (free, requires Ollama installed)
LITELLM_MODEL=ollama/llama2
LITELLM_API_BASE=http://localhost:11434

# Option 2: OpenAI (paid)
# LITELLM_MODEL=gpt-4-turbo
# OPENAI_API_KEY=sk-your-key-here

# Option 3: Anthropic Claude (paid)
# LITELLM_MODEL=claude-3-sonnet-20240229
# ANTHROPIC_API_KEY=your-key-here

# Appwrite (self-hosted)
APPWRITE_ENDPOINT=https://appwrite.blackleafdigital.com/v1
APPWRITE_PROJECT_ID=691779a3003300288357
APPWRITE_API_KEY=your_api_key_here
APPWRITE_DATABASE_ID=pedofinder

# Pinecone (cloud)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=epstein-docs

# Processing settings
BATCH_SIZE=10           # Number of documents to process in parallel
MAX_WORKERS=4           # CPU cores to use
EMBEDDING_MODEL=local   # "local" or "openai"
```

### Step 3: Frontend Setup (TypeScript)

**Install pnpm (if not installed):**
```bash
npm install -g pnpm
```

**Navigate to frontend directory:**
```bash
cd web
```

**Install dependencies:**
```bash
pnpm install
```

**Configure environment:**
```bash
cp .env.example .env
```

Edit `web/.env`:

```bash
VITE_APPWRITE_ENDPOINT=https://appwrite.blackleafdigital.com/v1
VITE_APPWRITE_PROJECT_ID=691779a3003300288357
VITE_APPWRITE_DATABASE_ID=pedofinder

# Optional: Pinecone for client-side vector search
VITE_PINECONE_API_KEY=your_pinecone_key
VITE_PINECONE_ENVIRONMENT=your_environment
VITE_PINECONE_INDEX_NAME=epstein-docs
```

### Step 4: Appwrite Database Setup

**Create database and tables:**

You need to create the following tables in your Appwrite instance:

1. **Database**: `pedofinder`

2. **Tables** (with attributes):

**documents** table:
- `filename` (string, 255)
- `raw_text` (string, 1000000)
- `processed_text` (string, 1000000)
- `summary` (string, 5000)
- `tags` (string[], array)
- `word_count` (integer)
- `processed` (boolean)
- `processing_status` (string, enum: pending/processing/completed/failed)
- `processed_at` (datetime)

**entities_people** table:
- `name` (string, 255)
- `normalized_name` (string, 255)
- `mention_count` (integer)
- `document_ids` (string[], array)
- `confidence` (float)

**entities_orgs** table:
- `name` (string, 255)
- `normalized_name` (string, 255)
- `mention_count` (integer)
- `document_ids` (string[], array)
- `confidence` (float)

**entities_locations** table:
- `name` (string, 255)
- `normalized_name` (string, 255)
- `location_type` (string, 255)
- `mention_count` (integer)
- `document_ids` (string[], array)
- `confidence` (float)

**entities_dates** table:
- `date_string` (string, 255)
- `normalized_date` (string, 50)
- `mention_count` (integer)
- `document_ids` (string[], array)

**relationships** table:
- `source_entity_id` (string, 255)
- `source_entity_type` (string, 50)
- `target_entity_id` (string, 255)
- `target_entity_type` (string, 50)
- `relationship_type` (string, 100)
- `strength` (integer)
- `document_ids` (string[], array)

**Indexes to create:**

On `documents`:
- Full-text index on `raw_text`, `filename`
- Key index on `processed` (descending)
- Key index on `processing_status`

On `entities_*`:
- Full-text index on `name`, `normalized_name`
- Key index on `mention_count` (descending)

On `relationships`:
- Key index on `source_entity_id`, `target_entity_id`
- Key index on `strength` (descending)

### Step 5: Pinecone Setup

**Create index:**

1. Log into Pinecone dashboard
2. Create new index:
   - Name: `epstein-docs`
   - Dimensions: `384` (for sentence-transformers model)
   - Metric: `cosine`
   - Pod type: `starter` or `s1` (for free tier)

### Step 6: Verify Installation

**Backend verification:**
```bash
# From pedofinder directory
uv run python -c "import spacy; print(spacy.load('en_core_web_trf'))"
uv run python -c "import litellm; print('LiteLLM OK')"
uv run python -c "from appwrite.client import Client; print('Appwrite OK')"
uv run python -c "from pinecone import Pinecone; print('Pinecone OK')"
```

**Frontend verification:**
```bash
# From web directory
pnpm type-check
```

All commands should complete without errors.

---

## Processing Pipeline

### Overview

The processing pipeline transforms raw PDF text files into structured, searchable data with AI-generated insights.

### Pipeline Stages

```
Stage 1: Document Loading
    ↓
Stage 2: Text Extraction & Cleaning
    ↓
Stage 3: Entity Extraction (SpaCy NER)
    ↓
Stage 4: LLM Processing (Summary & Tags)
    ↓
Stage 5: Vector Embedding Generation
    ↓
Stage 6: Storage (Appwrite + Pinecone)
```

### Stage 1: Document Loading

**Input**: PDF files in `data/pdfs/` directory (2,911 files)

**Process**:
1. Scan directory for `.txt.pdf` files
2. Read file contents (UTF-8 text, not binary PDFs)
3. Extract filename and metadata

**Output**: List of document paths with filenames

**Code**: `document_processor.py:_load_document()`

### Stage 2: Text Extraction & Cleaning

**Input**: Raw text from PDF files

**Process**:
1. Normalize whitespace (multiple spaces → single space)
2. Remove special characters that interfere with NER
3. Preserve sentence structure
4. Remove headers/footers if detected
5. Split into chunks if document is very long (>10,000 words)

**Output**: Cleaned text ready for entity extraction

**Code**: `document_processor.py:_clean_text()`

### Stage 3: Entity Extraction

**Input**: Cleaned document text

**Process**:

**A. SpaCy NER (General extraction):**
1. Load `en_core_web_trf` transformer model
2. Process text through NER pipeline
3. Extract entities by type:
   - `PERSON`: People names
   - `ORG`: Organizations
   - `GPE`: Geo-political entities (cities, countries)
   - `DATE`: Dates and time expressions
4. Normalize entity text (title case, strip whitespace)
5. Calculate confidence scores

**B. Pattern Matching (Known entities):**
1. Use custom patterns for high-profile names:
   - "Jeffrey Epstein", "Ghislaine Maxwell"
   - "Bill Clinton", "Donald Trump"
   - "Prince Andrew", etc.
2. Case-insensitive matching
3. Handle variations (e.g., "Jeffrey E. Epstein", "J. Epstein")
4. Set confidence to 1.0 for pattern matches

**C. Entity Consolidation:**
1. Merge results from SpaCy and patterns
2. Deduplicate based on normalized names
3. Count occurrences per entity
4. Track character positions in text

**Output**:
- List of entities with types, names, counts, confidence scores
- Entity → document ID mappings

**Code**: `entity_extractor.py:extract_entities()`

### Stage 4: LLM Processing

**Input**: Document text + extracted entities

**Process using LiteLLM:**

**A. Summary Generation:**
1. Send document to LLM with prompt:
   ```
   Summarize this legal document in 2-3 sentences.
   Focus on key events, people, and dates mentioned.
   ```
2. Parse response
3. Validate summary length (50-500 words)
4. Retry up to 3 times on failure

**B. Theme Extraction:**
1. Send document to LLM with prompt:
   ```
   Identify 3-5 main themes or topics in this document.
   Return as JSON array of strings.
   ```
2. Parse JSON response
3. Validate themes (1-3 words each)

**C. Tag Generation:**
1. Send document to LLM with prompt:
   ```
   Generate 5-10 descriptive tags for this document.
   Tags should be single words or short phrases.
   Return as JSON array.
   ```
2. Parse JSON response
3. Normalize tags (lowercase, remove duplicates)

**D. Relevance Scoring:**
1. Calculate relevance to Epstein investigation (0-1 scale)
2. Based on entity mentions and content
3. Higher scores for documents with more key entities

**Output**:
- AI-generated summary (string)
- Themes (list of strings)
- Tags (list of strings)
- Relevance score (float 0-1)

**Code**: `llm_processor.py:process_document()`

**Models Supported**:
- **Local**: Ollama (llama2, mistral, etc.) - Free
- **Cloud**: OpenAI GPT-4, Anthropic Claude - Paid

### Stage 5: Vector Embedding

**Input**: Document text (or chunks for long documents)

**Process**:

**Option A - Local (Default):**
1. Load `all-MiniLM-L6-v2` model from sentence-transformers
2. Split document into chunks (max 512 tokens each)
3. Generate 384-dimensional embedding per chunk
4. Average chunk embeddings for document-level embedding

**Option B - Cloud (OpenAI):**
1. Use OpenAI `text-embedding-3-small` model
2. Send document text to API
3. Receive 1536-dimensional embedding
4. Reduce to 384 dimensions for compatibility

**Output**:
- Document embedding vector (384 floats)
- Chunk embeddings if document was split

**Code**: `vector_embedder.py:generate_embedding()`

**Performance**:
- Local: ~0.5-1 second per document
- Cloud: ~0.2-0.5 seconds per document (depends on API latency)

### Stage 6: Storage

**Input**: All processed data from previous stages

**Process**:

**A. Store in Appwrite:**

1. **documents** table:
   ```python
   {
     "filename": "HOUSE_OVERSIGHT_012345.txt.pdf",
     "raw_text": "full document text...",
     "processed_text": "cleaned text...",
     "summary": "AI-generated summary...",
     "tags": ["legal", "testimony", "investigation"],
     "word_count": 1523,
     "processed": True,
     "processing_status": "completed",
     "processed_at": "2025-01-15T10:30:00Z"
   }
   ```

2. **entities_people** table:
   ```python
   {
     "name": "Jeffrey Epstein",
     "normalized_name": "jeffrey epstein",
     "mention_count": 47,
     "document_ids": ["doc_id_1", "doc_id_2", ...],
     "confidence": 0.95
   }
   ```

3. **relationships** table:
   ```python
   {
     "source_entity_id": "entity_person_123",
     "source_entity_type": "person",
     "target_entity_id": "entity_person_456",
     "target_entity_type": "person",
     "relationship_type": "mentioned_together",
     "strength": 15,  # co-occurrence count
     "document_ids": ["doc_id_1", "doc_id_5"]
   }
   ```

**B. Store in Pinecone:**

1. Create vector with metadata:
   ```python
   {
     "id": "doc_12345",
     "values": [0.123, -0.456, ...],  # 384 floats
     "metadata": {
       "filename": "HOUSE_OVERSIGHT_012345.txt.pdf",
       "summary": "AI summary...",
       "tags": ["legal", "testimony"],
       "entity_count": 23
     }
   }
   ```

2. Upsert to index in batches of 100

**Output**:
- Document stored in Appwrite with ID
- Vector stored in Pinecone with same ID
- Entities and relationships created/updated

**Code**:
- `appwrite_client.py:create_document()`
- `pinecone_client.py:upsert_vectors()`

### Running the Pipeline

**Process a single document (testing):**
```bash
uv run python scripts/example_usage.py
```

**Process all documents:**
```bash
# Process all 2,911 documents
uv run python scripts/process_all_documents.py

# Process with custom batch size and verbosity
uv run python scripts/process_all_documents.py --batch-size 20 --verbose

# Process only first 100 documents (testing)
uv run python scripts/process_all_documents.py --limit 100

# Resume interrupted processing
uv run python scripts/process_all_documents.py --resume
```

**Expected output:**
```
Processing Documents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% 0:45:23

Processing complete!
Successfully processed: 2,850
Skipped (already processed): 50
Failed: 11
Total time: 45 minutes 23 seconds

Failed documents:
- HOUSE_OVERSIGHT_012345.txt.pdf (Error: Timeout)
- HOUSE_OVERSIGHT_067890.txt.pdf (Error: LLM rate limit)
...

Retry failed documents? [y/n]:
```

### Performance Estimates

**With Ollama (Local LLM):**
- Processing time: ~30-60 seconds per document
- Total time for 2,911 documents: **24-48 hours**
- Cost: **$0** (all local)

**With OpenAI GPT-4:**
- Processing time: ~10-20 seconds per document
- Total time: **8-16 hours**
- Cost: ~$0.02 per document = **~$58** total

**With Anthropic Claude:**
- Processing time: ~10-20 seconds per document
- Total time: **8-16 hours**
- Cost: ~$0.015 per document = **~$44** total

**Recommendations**:
1. Start with a small batch (10-20 documents) to test setup
2. Run overnight for full processing
3. Monitor for errors and API rate limits
4. Save progress regularly (built-in resume capability)

---

## Frontend Application

### Starting the Development Server

```bash
cd web
pnpm dev
```

Open http://localhost:3000 in your browser.

### Application Pages

#### 1. Home Page (`/`)

**Purpose**: Main search interface

**Features**:
- Full-text search bar
- Advanced filters:
  - Entity type (person, org, location, date)
  - Processing status
  - Date range
  - Confidence threshold
- Search results with:
  - Document title
  - Summary
  - Tags
  - Entity count
  - Relevance score
- Pagination (20 results per page)

**ECharts Components**:
- None (text-based interface)

#### 2. Network Graph (`/graph`)

**Purpose**: Visualize entity relationships

**Features**:
- Force-directed graph layout
- Nodes: Top 100 entities by mention count
- Node size: Proportional to mentions
- Node color: By entity type
  - Purple: People
  - Orange: Organizations
  - Green: Locations
  - Cyan: Dates
- Edges: Co-occurrence relationships
- Edge thickness: Relationship strength
- Interactive:
  - Click node → Entity profile
  - Hover → Tooltip with details
  - Drag to reposition
  - Zoom/pan

**ECharts Configuration**:
```typescript
{
  series: [{
    type: 'graph',
    layout: 'force',
    data: nodes,
    links: edges,
    roam: true,
    label: { show: true },
    force: {
      repulsion: 100,
      edgeLength: 150
    }
  }]
}
```

#### 3. Statistics Dashboard (`/statistics`)

**Purpose**: Aggregate analytics and insights

**Features**:

**Chart 1 - Top Entities (Bar Chart)**:
- Top 20 people by mention count
- Top 20 organizations
- Top 20 locations
- Sortable and filterable

**Chart 2 - Entity Distribution (Pie Chart)**:
- Breakdown by entity type
- Shows proportions

**Chart 3 - Document Timeline (Line Chart)**:
- Documents processed over time
- Cumulative count

**Chart 4 - Processing Status (Pie Chart)**:
- Completed vs Pending vs Failed
- Real-time status

**Chart 5 - Word Cloud**:
- Most frequent words across all documents
- Excludes stopwords
- Color by frequency

**All charts are ECharts components** with:
- Interactive tooltips
- Click-through navigation
- Responsive resizing
- Export to image (PNG/SVG)

#### 4. Entity Profile (`/entity/:type/:id`)

**Purpose**: Detailed view of a single entity

**Features**:
- Entity name and type
- Total mention count
- Confidence score
- **Related Entities Graph** (ECharts):
  - Shows top 20 related entities
  - Force-directed or circular layout
- **Documents List**:
  - All documents mentioning this entity
  - Sorted by relevance
- **Co-occurrence Stats** (Bar Chart):
  - Top 10 entities mentioned with this one
  - Frequency counts

**URL Examples**:
- `/entity/person/123` - Person profile
- `/entity/org/456` - Organization profile
- `/entity/location/789` - Location profile

#### 5. Document Viewer (`/document/:id`)

**Purpose**: Read and analyze a single document

**Features**:
- **Full Document Text**:
  - Syntax-highlighted entities
  - Color-coded by type
  - Scrollable
- **Metadata Sidebar**:
  - Filename
  - Word count
  - Processing status
  - Tags
  - Summary
- **Extracted Entities**:
  - Grouped by type
  - Click to view entity profile
- **Related Documents** (ECharts Timeline):
  - Similar documents by vector similarity
  - Visual timeline of related docs

**Entity Highlighting**:
- People: Purple background
- Organizations: Orange background
- Locations: Green background
- Dates: Cyan background

### Key Components

#### Search Components

**SearchBar.vue**:
```vue
<template>
  <div class="search-bar">
    <input
      v-model="query"
      @keyup.enter="handleSearch"
      placeholder="Search documents..."
    />
    <button @click="handleSearch">Search</button>
  </div>
</template>
```

Emits: `search(query: string)`

**SearchFilters.vue**:
```vue
<template>
  <div class="filters">
    <select v-model="entityType">
      <option value="">All Types</option>
      <option value="person">People</option>
      <option value="org">Organizations</option>
      <option value="location">Locations</option>
    </select>
    <!-- More filters -->
  </div>
</template>
```

Emits: `filter-change(filters: Filters)`

**SearchResults.vue**:
```vue
<template>
  <div class="results">
    <div v-for="doc in documents" :key="doc.$id" class="result-card">
      <h3>{{ doc.filename }}</h3>
      <p>{{ doc.summary }}</p>
      <div class="tags">
        <span v-for="tag in doc.tags">{{ tag }}</span>
      </div>
    </div>
  </div>
</template>
```

Props: `documents: Document[]`

#### Visualization Components

**NetworkGraph.vue** (ECharts):
```vue
<template>
  <v-chart
    class="chart"
    :option="graphOption"
    @click="handleNodeClick"
    autoresize
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';

const graphOption = computed(() => ({
  series: [{
    type: 'graph',
    layout: 'force',
    data: props.nodes,
    links: props.edges,
    // ... configuration
  }]
}));

const handleNodeClick = (params: any) => {
  router.push(`/entity/${params.data.type}/${params.data.id}`);
};
</script>
```

Props: `nodes: Node[]`, `edges: Edge[]`

**StatisticsCharts.vue** (Multiple ECharts):
```vue
<template>
  <div class="statistics-grid">
    <v-chart :option="topPeopleOption" />
    <v-chart :option="entityDistributionOption" />
    <v-chart :option="timelineOption" />
    <v-chart :option="wordCloudOption" />
  </div>
</template>
```

Each chart has its own computed option.

### API Service Layer

**appwrite.ts**:
```typescript
import { Client, Databases, Query } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

// Search documents
export async function searchDocuments(query: string, filters: Filters) {
  const queries = [Query.search('raw_text', query)];

  if (filters.entityType) {
    // Add entity type filter
  }

  return await databases.listDocuments(
    'pedofinder',
    'documents',
    queries
  );
}

// Get entity by ID
export async function getEntity(type: string, id: string) {
  return await databases.getDocument(
    'pedofinder',
    `entities_${type}`,
    id
  );
}

// More API methods...
```

**search.ts** (Unified search):
```typescript
export async function unifiedSearch(
  query: string,
  mode: 'fulltext' | 'semantic' | 'hybrid'
) {
  if (mode === 'fulltext') {
    return await searchDocuments(query);
  } else if (mode === 'semantic') {
    return await semanticSearch(query);
  } else {
    // Combine both
    const [fulltext, semantic] = await Promise.all([
      searchDocuments(query),
      semanticSearch(query)
    ]);
    return mergeResults(fulltext, semantic);
  }
}
```

### Building for Production

```bash
cd web
pnpm build
```

Output: `web/dist/` directory

**Optimization features**:
- Code splitting by route
- Vendor chunk separation
- Tree shaking
- Minification
- Gzip compression

**Deployment**:
```bash
# Preview production build locally
pnpm preview

# Deploy to static hosting (Cloudflare Pages, Netlify, Vercel, etc.)
# Point to web/dist directory
```

---

## Data Models

### Python Models (Pydantic)

#### Document Model

```python
from pydantic import BaseModel
from datetime import datetime

class Document(BaseModel):
    """Represents a processed document."""
    id: str
    filename: str
    raw_text: str
    processed_text: str
    summary: str
    themes: list[str]
    tags: list[str]
    relevance_score: float  # 0-1
    word_count: int
    char_count: int
    processed: bool
    processing_status: Literal["pending", "processing", "completed", "failed"]
    error_message: str | None = None
    created_at: datetime
    processed_at: datetime | None = None

    # Embedded data
    entity_mentions: dict[str, list[str]]  # {type: [names]}
```

#### Entity Models

```python
class EntityBase(BaseModel):
    """Base class for all entity types."""
    id: str
    name: str
    normalized_name: str
    mention_count: int
    document_ids: list[str]
    confidence: float  # 0-1
    related_entities: list[dict]  # {entity_id, entity_type, count}

class EntityPerson(EntityBase):
    """Person entity."""
    entity_type: Literal["person"] = "person"
    roles: list[str] = []  # e.g., ["financier", "defendant"]

class EntityOrganization(EntityBase):
    """Organization entity."""
    entity_type: Literal["org"] = "org"
    org_type: str | None = None  # "foundation", "government", etc.

class EntityLocation(EntityBase):
    """Location entity."""
    entity_type: Literal["location"] = "location"
    location_type: str  # "city", "country", "address", "poi"
    coordinates: dict[str, float] | None = None  # {lat, lon}

class EntityDate(BaseModel):
    """Date/time entity."""
    id: str
    date_string: str  # Original text
    normalized_date: str  # ISO 8601
    date_type: str  # "full_date", "month_year", "year", "relative"
    mention_count: int
    document_ids: list[str]
    context_snippets: list[str]
```

#### Relationship Model

```python
class Relationship(BaseModel):
    """Represents a relationship between two entities."""
    id: str
    source_entity_id: str
    source_entity_type: str
    target_entity_id: str
    target_entity_type: str
    relationship_type: str  # "mentioned_together", "works_for", etc.
    strength: int  # Co-occurrence count
    document_ids: list[str]
    context_snippets: list[str]  # Sentences showing relationship
```

### TypeScript Models (Zod)

#### Document Schema

```typescript
import { z } from 'zod';

export const DocumentSchema = z.object({
  $id: z.string(),
  filename: z.string(),
  raw_text: z.string(),
  processed_text: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  word_count: z.number(),
  processed: z.boolean(),
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed']),
  processed_at: z.string().optional(),
});

export type Document = z.infer<typeof DocumentSchema>;
```

#### Entity Schemas

```typescript
export const EntityPersonSchema = z.object({
  $id: z.string(),
  name: z.string(),
  normalized_name: z.string(),
  mention_count: z.number(),
  document_ids: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  related_entities: z.array(z.object({
    entity_id: z.string(),
    entity_type: z.enum(['person', 'org', 'location', 'date']),
    co_occurrence_count: z.number(),
  })),
});

export type EntityPerson = z.infer<typeof EntityPersonSchema>;

// Similar schemas for EntityOrg, EntityLocation, EntityDate
```

#### API Response Schemas

```typescript
export const SearchResultsSchema = z.object({
  total: z.number(),
  documents: z.array(DocumentSchema),
});

export type SearchResults = z.infer<typeof SearchResultsSchema>;
```

### Data Relationships

```
Document (1) ──→ (N) EntityMentions
    │
    └──→ Contains text referencing entities

EntityPerson (1) ──→ (N) Documents
    │
    └──→ Mentioned in multiple documents

EntityPerson (1) ──→ (N) Relationships ←── (1) EntityPerson
    │                                            │
    └──→ Co-occurs with other entities ←────────┘

Embedding (1) ──→ (1) Document
    │
    └──→ Vector representation of document
```

---

## API Reference

### Appwrite API Methods

#### Document Operations

**List all documents:**
```typescript
const documents = await databases.listDocuments(
  'pedofinder',      // database ID
  'documents',       // table name
  [
    Query.orderDesc('processed_at'),
    Query.limit(20),
    Query.offset(0)
  ]
);
```

**Search documents:**
```typescript
const results = await databases.listDocuments(
  'pedofinder',
  'documents',
  [Query.search('raw_text', 'epstein')]
);
```

**Get single document:**
```typescript
const doc = await databases.getDocument(
  'pedofinder',
  'documents',
  documentId
);
```

**Filter by status:**
```typescript
const completed = await databases.listDocuments(
  'pedofinder',
  'documents',
  [Query.equal('processing_status', 'completed')]
);
```

#### Entity Operations

**Get top entities:**
```typescript
const topPeople = await databases.listDocuments(
  'pedofinder',
  'entities_people',
  [
    Query.orderDesc('mention_count'),
    Query.limit(20)
  ]
);
```

**Search entities:**
```typescript
const results = await databases.listDocuments(
  'pedofinder',
  'entities_people',
  [Query.search('name', 'clinton')]
);
```

**Get entity with relationships:**
```typescript
const entity = await databases.getDocument(
  'pedofinder',
  'entities_people',
  entityId
);

// Then fetch related entities
const relatedIds = entity.related_entities.map(r => r.entity_id);
// ... fetch each related entity
```

### Pinecone API Methods

**Query for similar documents:**
```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index('epstein-docs');

// Query with vector
const results = await index.query({
  vector: queryEmbedding,  // 384-dim array
  topK: 10,
  includeMetadata: true
});

// Results contain document IDs and similarity scores
results.matches.forEach(match => {
  console.log(match.id, match.score, match.metadata);
});
```

**Query with metadata filter:**
```typescript
const results = await index.query({
  vector: queryEmbedding,
  topK: 10,
  filter: {
    tags: { $in: ['testimony'] }
  }
});
```

### Custom API Endpoints

If you build a backend API server (optional), here are recommended endpoints:

**GET `/api/search`**
- Query params: `q` (query), `type` (fulltext|semantic|hybrid), `limit`, `offset`
- Returns: `{ total, documents }`

**GET `/api/entities/:type`**
- Params: `type` (people|orgs|locations|dates)
- Query params: `limit`, `offset`, `sort`
- Returns: `{ total, entities }`

**GET `/api/entities/:type/:id`**
- Params: `type`, `id`
- Returns: Entity object with relationships

**GET `/api/documents/:id`**
- Params: `id`
- Returns: Full document object

**GET `/api/graph`**
- Query params: `limit` (number of nodes)
- Returns: `{ nodes, edges }` for network graph

**POST `/api/submit-document`**
- Body: `{ file, title, source, user_email }`
- Returns: `{ submission_id, status }`

---

## Deployment

### Backend Deployment

**Option 1: Appwrite Functions (Recommended)**

1. Package Python processor as Appwrite Function
2. Trigger function when new documents uploaded
3. Automatic scaling and execution

**Setup:**
```bash
# Install Appwrite CLI
npm install -g appwrite

# Initialize
appwrite init

# Create function
appwrite functions create \
  --functionId process-document \
  --name "Process Document" \
  --runtime python-3.11 \
  --execute role:all

# Deploy
appwrite deploy function --functionId process-document
```

**Option 2: Standalone Server**

1. Run processing script as cron job or service
2. Monitor for new documents in Appwrite
3. Process and update database

**Docker deployment:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .

RUN pip install uv
RUN uv sync

CMD ["uv", "run", "python", "scripts/process_all_documents.py", "--watch"]
```

### Frontend Deployment

**Cloudflare Pages (Recommended):**

1. Connect GitHub repository
2. Build command: `cd web && pnpm install && pnpm build`
3. Output directory: `web/dist`
4. Environment variables: Add Appwrite and Pinecone configs

**Vercel:**
```bash
cd web
vercel
```

**Netlify:**
```bash
cd web
netlify deploy --prod
```

**Custom Server (Nginx):**
```nginx
server {
  listen 80;
  server_name pedofinder.example.com;

  root /var/www/pedofinder/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Environment Variables

**Backend (.env):**
```bash
# Production settings
LITELLM_MODEL=gpt-4-turbo
OPENAI_API_KEY=sk-prod-...
APPWRITE_ENDPOINT=https://appwrite.blackleafdigital.com/v1
APPWRITE_PROJECT_ID=691779a3003300288357
APPWRITE_API_KEY=prod_api_key
APPWRITE_DATABASE_ID=pedofinder
PINECONE_API_KEY=prod_pinecone_key
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=epstein-docs
BATCH_SIZE=50
MAX_WORKERS=8
```

**Frontend (web/.env):**
```bash
VITE_APPWRITE_ENDPOINT=https://appwrite.blackleafdigital.com/v1
VITE_APPWRITE_PROJECT_ID=691779a3003300288357
VITE_APPWRITE_DATABASE_ID=pedofinder
VITE_PINECONE_API_KEY=prod_pinecone_key
VITE_PINECONE_ENVIRONMENT=us-east-1-aws
VITE_PINECONE_INDEX_NAME=epstein-docs
```

### SSL/HTTPS

**Cloudflare Pages**: Automatic SSL

**Custom Server**: Use Let's Encrypt
```bash
sudo certbot --nginx -d pedofinder.example.com
```

### Monitoring

**Recommended tools:**
- **Sentry**: Error tracking
- **Plausible**: Privacy-friendly analytics
- **UptimeRobot**: Uptime monitoring

**Add to frontend:**
```typescript
// main.ts
import * as Sentry from '@sentry/vue';

Sentry.init({
  app,
  dsn: 'your-sentry-dsn',
  environment: import.meta.env.MODE,
});
```

---

## Troubleshooting

### Common Issues

#### Backend

**Issue: SpaCy model not found**
```
OSError: [E050] Can't find model 'en_core_web_trf'
```

**Solution:**
```bash
uv run python -m spacy download en_core_web_trf
```

---

**Issue: LiteLLM timeout**
```
litellm.Timeout: Request timed out after 60s
```

**Solution:**
Increase timeout in `llm_processor.py`:
```python
response = litellm.completion(
    model=model,
    messages=messages,
    timeout=120  # Increase to 2 minutes
)
```

---

**Issue: Appwrite connection refused**
```
AppwriteException: Connection refused
```

**Solution:**
1. Check Appwrite is running: `docker ps`
2. Verify endpoint URL in `.env`
3. Check firewall rules

---

**Issue: Pinecone index not found**
```
PineconeException: Index 'epstein-docs' not found
```

**Solution:**
1. Log into Pinecone dashboard
2. Create index with correct name
3. Verify API key in `.env`

---

**Issue: Out of memory during processing**
```
MemoryError: Unable to allocate array
```

**Solution:**
1. Reduce batch size in `.env`:
   ```bash
   BATCH_SIZE=5
   ```
2. Process in smaller chunks:
   ```bash
   uv run python scripts/process_all_documents.py --limit 100
   ```

---

#### Frontend

**Issue: Appwrite 401 Unauthorized**
```
AppwriteException: Unauthorized
```

**Solution:**
1. Check API key permissions in Appwrite console
2. Verify project ID matches in `.env`
3. Ensure database ID is correct

---

**Issue: ECharts not rendering**
```
TypeError: Cannot read property 'init' of undefined
```

**Solution:**
1. Ensure ECharts is imported:
   ```typescript
   import { use } from 'echarts/core';
   import { GraphChart } from 'echarts/charts';
   use([GraphChart]);
   ```
2. Check component is mounted:
   ```vue
   <v-chart v-if="mounted" :option="option" />
   ```

---

**Issue: Build fails with type errors**
```
error TS2322: Type 'string' is not assignable to type 'number'
```

**Solution:**
Run type check:
```bash
pnpm type-check
```
Fix type errors in reported files.

---

**Issue: Large bundle size**
```
dist/assets/index-abc123.js  2.5 MB
```

**Solution:**
1. Verify code splitting is enabled in `vite.config.ts`
2. Check for duplicate dependencies
3. Use dynamic imports for heavy components

---

### Debug Mode

**Backend:**
```bash
# Enable verbose logging
export LOG_LEVEL=DEBUG
uv run python scripts/process_all_documents.py --verbose
```

**Frontend:**
```typescript
// Enable Vue devtools
app.config.performance = true;

// Log all API calls
const originalFetch = window.fetch;
window.fetch = (...args) => {
  console.log('Fetch:', args);
  return originalFetch(...args);
};
```

---

## Future Enhancements

### Planned Features

1. **Advanced Analytics**
   - Timeline analysis of entity mentions
   - Sentiment analysis per document
   - Topic modeling (LDA, BERTopic)
   - Anomaly detection (unusual entity connections)

2. **User Features**
   - User accounts and saved searches
   - Bookmarks and notes
   - Document annotations
   - Export search results (CSV, JSON, PDF)

3. **AI Improvements**
   - Multi-document summarization
   - Question answering over documents
   - Entity disambiguation (resolve name conflicts)
   - Relationship classification (types of connections)

4. **Visualization Enhancements**
   - 3D network graph
   - Geographic map of locations
   - Timeline with zoom/filter
   - Comparison view (side-by-side documents)

5. **Performance Optimizations**
   - Client-side caching with IndexedDB
   - Virtual scrolling for large lists
   - Lazy loading images and charts
   - Server-side rendering (SSR) for SEO

6. **Data Sources**
   - Support for more document types (DOCX, HTML)
   - OCR for scanned PDFs
   - Import from external sources (archives, FOIA requests)
   - Real-time document monitoring

### Technical Debt

- Add comprehensive unit tests (Jest, Pytest)
- Add integration tests (Playwright, Cypress)
- Improve error handling and user feedback
- Add rate limiting for API calls
- Implement proper authentication
- Add GDPR compliance features
- Optimize database indexes
- Add database migrations
- Implement proper CI/CD pipeline

### Contribution Guidelines

**To contribute:**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and test thoroughly
4. Run linters: `uv run ruff check`, `pnpm type-check`
5. Commit with descriptive messages
6. Push and create pull request

**Code standards:**
- Python: Follow PEP 8, use type hints
- TypeScript: Strict mode, no `any` types
- Vue: Composition API, script setup
- Tests: Required for new features
- Documentation: Update README and this file

---

## Contact & Support

**Project Maintainer**: Zach Handley (zachhandley@gmail.com)

**Documentation**:
- `README.md`: Project overview
- `QUICKSTART.md`: 5-minute setup
- `PROCESSING.md`: Detailed processing docs
- `web/README.md`: Frontend documentation

**Issue Reporting**:
Create issues in the GitHub repository with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Python version, etc.)
- Error messages and logs

**Contributing**:
Pull requests welcome! Please read contribution guidelines above.

---

*Last Updated: 2025-01-15*
*Version: 1.0.0*
*Status: Production Ready*
