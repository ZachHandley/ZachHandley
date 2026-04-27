# Pedofinder - Implementation Roadmap

## Project Status: Setup Phase

This document tracks all implementation tasks for the Epstein document analyzer. Tasks are organized by priority and component.

---

## Phase 1: Foundation & Setup

### Environment & Configuration
- [x] Initialize UV project with Python 3.11+
- [x] Configure pyproject.toml with all dependencies
- [x] Set up ruff and mypy configurations
- [ ] Create .env.example template
- [ ] Create .gitignore for data directories and secrets
- [ ] Set up pre-commit hooks (ruff, mypy)

### Core Structure
- [ ] Create all __init__.py files for packages
- [ ] Implement config.py with pydantic-settings
  - Environment variable loading
  - Validation for all settings
  - Default values for development
- [ ] Create core/models.py with base Pydantic models
  - Entity base class
  - Person, Organization, Location, Event models
  - Relationship model
  - Document model
- [ ] Create core/schemas.py with SQLite schemas
  - Entities table
  - Relationships table
  - Documents table
  - Processing metadata table

---

## Phase 2: PDF Processing Pipeline

### Download Module (processors/downloader.py)
- [ ] Implement Google Pinpoint API client
  - Authenticate with collection ID
  - List all documents in collection
  - Download individual PDF by document ID
  - Handle pagination for large collections
- [ ] Add progress tracking with rich
- [ ] Implement resume capability for interrupted downloads
- [ ] Add validation for downloaded PDFs
- [ ] Create metadata extraction (title, date, page count)

### OCR Module (processors/ocr.py)
- [ ] Set up Docling integration
  - Initialize OCR engine
  - Configure for scanned documents
  - Handle handwriting recognition
- [ ] Implement batch processing
  - Process multiple pages in parallel
  - Memory management for large PDFs
- [ ] Add quality metrics
  - OCR confidence scores
  - Flag low-quality pages for review
- [ ] Create text normalization
  - Remove artifacts
  - Fix common OCR errors
  - Standardize formatting

### Chunking Module (processors/chunker.py)
- [ ] Implement intelligent document chunking
  - Respect semantic boundaries (paragraphs, sections)
  - Maintain context overlap between chunks
  - Track source page numbers
- [ ] Add chunk metadata
  - Document ID
  - Page range
  - Chunk position
- [ ] Implement chunk size optimization
  - Target LLM context window
  - Balance context vs. processing speed

---

## Phase 3: Entity Extraction

### NER Module (extractors/ner.py)
- [ ] Set up LiteLLM client
  - Support for local models (Ollama)
  - Support for cloud models (OpenAI, Anthropic)
  - Fallback chains for reliability
- [ ] Design entity extraction prompts
  - Person extraction with roles
  - Organization extraction with types
  - Location extraction with significance
  - Event extraction with dates
- [ ] Implement extraction pipeline
  - Process chunks in batches
  - Rate limiting for API calls
  - Retry logic with exponential backoff
- [ ] Add confidence scoring
  - Context-based confidence
  - Cross-reference validation
  - Ambiguity detection

### Relationship Extraction (extractors/relations.py)
- [ ] Design relationship extraction prompts
  - Person-to-person relationships
  - Person-to-organization relationships
  - Person-to-location relationships
  - Person-to-event relationships
- [ ] Implement relationship types
  - Employment relationships
  - Family relationships
  - Business relationships
  - Social relationships
- [ ] Add relationship metadata
  - Confidence scores
  - Source citations
  - Date ranges

### Contextual Analysis (extractors/context.py)
- [ ] Implement entity disambiguation
  - Resolve name variations (nicknames, aliases)
  - Handle misspellings
  - Merge duplicate entities
- [ ] Add co-occurrence analysis
  - Track entity mentions in same context
  - Identify frequent associations
- [ ] Implement timeline extraction
  - Parse dates and time references
  - Build event timelines
  - Connect events to entities

---

## Phase 4: Storage Layer

### SQLite Module (storage/sqlite_db.py)
- [ ] Create database initialization
  - Schema creation
  - Index setup for performance
  - Migration system
- [ ] Implement CRUD operations
  - Entity CRUD
  - Relationship CRUD
  - Document CRUD
- [ ] Add query builders
  - Entity search by name/type
  - Relationship queries
  - Document lookup
- [ ] Implement full-text search
  - FTS5 configuration
  - Ranking and relevance scoring

### LanceDB Module (storage/vector_db.py)
- [ ] Set up LanceDB instance
  - WASM configuration for client-side use
  - Schema definition
- [ ] Implement embedding generation
  - LiteLLM for embeddings
  - Batch embedding creation
- [ ] Add vector operations
  - Insert entity embeddings
  - Semantic search queries
  - Similarity computation
- [ ] Create hybrid search
  - Combine vector + full-text search
  - Relevance re-ranking

### Appwrite Module (storage/appwrite_client.py)
- [ ] Set up Appwrite SDK client
  - Authentication with API key
  - Project configuration
- [ ] Implement backup operations
  - Upload processed documents
  - Store entity database snapshots
  - Version control for data
- [ ] Add sync functionality
  - Push local changes to cloud
  - Pull updates from cloud
  - Conflict resolution

---

## Phase 5: Web API

### FastAPI Setup (api/main.py)
- [ ] Create FastAPI application
  - CORS configuration
  - Error handling middleware
  - Request logging
- [ ] Set up dependency injection
  - Database connections
  - Configuration access
  - Authentication (future)

### API Routes (api/routes/)
- [ ] Entity endpoints
  - GET /entities - List entities with filters
  - GET /entities/{id} - Get entity details
  - GET /entities/{id}/relationships - Get entity graph
  - GET /entities/search - Search entities
- [ ] Relationship endpoints
  - GET /relationships - List relationships
  - GET /relationships/{id} - Get relationship details
  - GET /graph - Get relationship graph data
- [ ] Document endpoints
  - GET /documents - List documents
  - GET /documents/{id} - Get document details
  - GET /documents/{id}/entities - Get entities in document
- [ ] Search endpoints
  - POST /search/text - Full-text search
  - POST /search/semantic - Vector search
  - POST /search/hybrid - Combined search

### Response Models (api/routes/)
- [ ] Create Pydantic response models
  - Entity response
  - Relationship response
  - Search results response
  - Pagination models

---

## Phase 6: Web UI

### Frontend Structure (web/)
- [ ] Choose frontend framework
  - Option 1: Static HTML + HTMX + Alpine.js
  - Option 2: React/Vue SPA
  - Option 3: Astro with islands
- [ ] Design page structure
  - Search page
  - Entity profile page
  - Graph visualization page
  - Document viewer page
  - Timeline explorer page

### Search Interface
- [ ] Create search form
  - Text input with autocomplete
  - Filter options (entity type, date range)
  - Sort options
- [ ] Display search results
  - Entity cards with preview
  - Pagination
  - Export options

### Entity Profile Page
- [ ] Display entity details
  - Name and aliases
  - Type and roles
  - Confidence score
- [ ] Show related entities
  - Relationship graph visualization
  - List of connections
- [ ] Display source citations
  - Document references
  - Page numbers
  - Context snippets

### Graph Visualization
- [ ] Integrate graph library
  - D3.js or Cytoscape.js
  - Force-directed layout
- [ ] Implement interactive features
  - Node selection
  - Zoom and pan
  - Filter by relationship type
- [ ] Add visual encoding
  - Node size by importance
  - Edge thickness by strength
  - Color by entity type

### Document Viewer
- [ ] Create PDF viewer
  - Render PDF pages
  - Highlight entity mentions
  - Navigate to citations
- [ ] Add text overlay
  - OCR text display
  - Searchable text
  - Copy functionality

---

## Phase 7: CLI Implementation

### Main CLI (cli.py)
- [ ] Set up Typer application
  - Command groups
  - Help text
  - Version command
- [ ] Implement commands
  - init-db: Initialize databases
  - download: Download PDFs
  - process: Process documents
  - extract: Extract entities
  - serve: Start web server
  - search: CLI search interface
  - export: Export data

### Progress Display
- [ ] Add rich progress bars
  - Download progress
  - Processing progress
  - Extraction progress
- [ ] Create status tables
  - Processing statistics
  - Error summaries

---

## Phase 8: Testing & Quality

### Unit Tests (tests/unit/)
- [ ] Test configuration loading
- [ ] Test data models validation
- [ ] Test PDF processing functions
- [ ] Test entity extraction logic
- [ ] Test database operations
- [ ] Test API endpoints

### Integration Tests (tests/integration/)
- [ ] Test full processing pipeline
- [ ] Test database interactions
- [ ] Test API with database
- [ ] Test search functionality

### Type Checking
- [ ] Ensure 100% mypy coverage
- [ ] Add type stubs for untyped libraries
- [ ] Document any type: ignore cases

### Code Quality
- [ ] Pass all ruff checks
- [ ] Format all code with ruff
- [ ] Add docstrings to public APIs
- [ ] Create inline comments for complex logic

---

## Phase 9: Optimization & Production

### Performance Optimization
- [ ] Profile entity extraction
  - Optimize prompt tokens
  - Batch processing tuning
- [ ] Optimize database queries
  - Add missing indexes
  - Query plan analysis
- [ ] Add caching layer
  - LRU cache for entities
  - Response caching for API

### Monitoring & Logging
- [ ] Set up structured logging
  - JSON log format
  - Log levels configuration
- [ ] Add metrics collection
  - Processing throughput
  - API response times
  - Error rates
- [ ] Create health check endpoints
  - Database connectivity
  - External API status

### Documentation
- [ ] Create API documentation
  - OpenAPI spec
  - Usage examples
- [ ] Write architecture docs
  - Component diagrams
  - Data flow documentation
- [ ] Add contributing guide
  - Development setup
  - Testing requirements
  - Code style guide

### Deployment
- [ ] Create Docker configuration
  - Multi-stage build
  - Production image
- [ ] Set up CI/CD pipeline
  - Automated testing
  - Type checking
  - Docker builds
- [ ] Create deployment guide
  - Server requirements
  - Environment setup
  - SSL configuration

---

## Phase 10: Advanced Features

### Entity Resolution
- [ ] Implement fuzzy matching
  - Levenshtein distance
  - Phonetic matching
- [ ] Add manual merge UI
  - Review duplicates
  - Confirm merges

### Timeline Features
- [ ] Create interactive timeline
  - Date-based navigation
  - Event clustering
- [ ] Add timeline export
  - PDF timeline report
  - JSON export

### Advanced Search
- [ ] Add filters
  - Date ranges
  - Entity types
  - Confidence thresholds
- [ ] Implement saved searches
  - Bookmark queries
  - Share search URLs

### Data Export
- [ ] Export formats
  - JSON export
  - CSV export
  - Graph formats (GraphML, GEXF)
- [ ] Bulk export operations
  - Full database export
  - Filtered exports

---

## Immediate Next Steps

1. Create .env.example file
2. Implement config.py with settings management
3. Create core data models (models.py)
4. Set up database schemas (schemas.py)
5. Download PDFs from Google Pinpoint

---

## Notes

- All code must pass `uv run ruff check` and `uv run mypy src/`
- Use comprehensive type hints throughout
- Prioritize public transparency and data accuracy
- Document all assumptions and limitations
- Include source citations for all extracted data
