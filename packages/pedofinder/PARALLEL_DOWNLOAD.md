# 3-Phase Parallel Download System

## Overview

The pedofinder Playwright downloader now implements a sophisticated 3-phase parallel download system that dramatically improves efficiency and resilience.

## Architecture

### Phase 1: Page URL Discovery

**Goal**: Build a complete map of all page URLs before downloading anything.

**Process**:
1. Navigate to start URL
2. Find pagination element with `[data-current-page][data-total-pages]` attributes
3. Extract total pages from `data-total-pages` attribute (likely 30 pages)
4. Loop through all pages:
   - Record current URL with page number
   - Find all `role="button"` elements in pagination
   - Click the LAST button (this is the "next" button)
   - Wait for page load
   - Verify URL changed (if not, we're at the end)
5. Return complete map: `{1: "url1", 2: "url2", ..., 30: "url30"}`

**Implementation**: `async def discover_all_pages(self) -> dict[int, str]`

### Phase 2: Per-Page Completion Tracking

**Goal**: Check which pages are already complete to avoid re-downloading.

**Process**:
1. For each page URL:
   - Navigate to the page
   - Scroll to load all ~100 documents (lazy loading)
   - Extract all `data-tooltip` filenames
   - Check how many exist in `download_dir`
   - If all files exist, mark page as complete
2. Return detailed page information including:
   - Page number
   - URL
   - List of filenames
   - Completion status
   - Downloaded count vs total count

**Implementation**: `async def check_page_completion(self, page_urls: dict[int, str]) -> dict[int, PageInfo]`

### Phase 3: Parallel Batch Download

**Goal**: Download incomplete pages in batches of 5 tabs simultaneously.

**Process**:
1. Filter to only incomplete pages
2. Process in batches of 5:
   ```python
   for batch_start in range(0, len(incomplete_pages), 5):
       batch = incomplete_pages[batch_start:batch_start+5]

       # Create 5 browser pages (tabs)
       tasks = []
       for page_num in batch:
           task = download_single_page(page_num, page_urls[page_num])
           tasks.append(task)

       # Run 5 tabs in parallel
       await asyncio.gather(*tasks)
   ```
3. Each `download_single_page()` method:
   - Opens a new browser page (tab)
   - Navigates to page URL
   - Scrolls to load 100 documents
   - Downloads all documents sequentially within that tab
   - Closes the page when done

**Implementation**:
- `async def download_single_page(self, page_num: int, url: str, filenames: list[str]) -> None`
- `async def download_all_parallel(self, page_urls, page_info, incomplete_pages) -> None`

## Key Features

### Intelligent Resume Support

- **Skip completed pages entirely**: No time wasted re-checking files that are already downloaded
- **Partial page support**: If a page has 50/100 files, it will download the remaining 50
- **Idempotent**: Can be stopped and restarted at any time

### Parallel Processing

- **5 pages at a time**: Default configuration downloads 5 pages in parallel
- **Configurable**: Adjust `parallel_pages` in `DownloadConfig` to tune performance
- **Resource efficient**: Each page runs in its own browser tab but shares the same browser instance

### Error Handling

- **Per-document retry**: Each document has 3 retry attempts (configurable)
- **Continue on error**: Batch failures don't stop other batches
- **Detailed logging**: Page-specific logging `[Page N]` for easy debugging
- **Failed file tracking**: All failures are tracked with error messages

### Progress Tracking

- **Rich progress bars**: Beautiful terminal UI with progress percentage
- **Real-time updates**: Progress updates as documents download
- **Detailed statistics**:
  - Successfully downloaded files
  - Skipped files (already exist)
  - Failed files with error messages
  - Total processed count

## Usage

### Basic Usage

```python
from pathlib import Path
from pedofinder.scraper.models import DownloadConfig
from pedofinder.scraper.playwright_downloader import PlaywrightDownloader

config = DownloadConfig(
    start_url="https://journaliststudio.google.com/...",
    download_dir=Path("./data/pdfs"),
    total_documents=2911,
    headless=False,
    parallel_pages=5,  # Download 5 pages in parallel
)

async with PlaywrightDownloader(config) as downloader:
    await downloader.download_all()
    await downloader.verify_downloads()
```

### Configuration Options

```python
@dataclass
class DownloadConfig:
    start_url: str              # Starting URL for pagination
    download_dir: Path          # Where to save PDFs
    total_documents: int = 2911 # Expected total document count
    headless: bool = False      # Run browser in headless mode
    timeout: int = 30000        # Download timeout in milliseconds
    retry_attempts: int = 3     # Number of retry attempts per document
    retry_delay: int = 2        # Delay between retries in seconds
    parallel_pages: int = 5     # Number of pages to process in parallel
```

### Running the Test Script

```bash
# Navigate to project root
cd /home/zach/github/ZachHandley/packages/pedofinder/

# Run with uv
uv run python scripts/test_parallel_download.py
```

## Performance Improvements

### Old System (Sequential)
- Processes **1 page at a time**
- ~100 documents per page × 30 pages = 3000 documents
- Each page must complete before starting the next
- No smart resume (restarts from page 1)

### New System (Parallel)
- Processes **5 pages at a time** (configurable)
- Smart resume: skips completed pages entirely
- **5x faster** when all pages need downloading
- **Instant** when pages are already complete

### Example Scenarios

**Scenario 1: Fresh download (no files exist)**
- Old system: ~3 hours (estimated)
- New system: ~36 minutes (5x faster)

**Scenario 2: Resume after 15 pages downloaded**
- Old system: Still checks all 15 pages, downloads remaining 15 (~1.5 hours)
- New system: Skips 15 complete pages, downloads remaining 15 in parallel (~18 minutes)

**Scenario 3: Verification run (all files exist)**
- Old system: Re-navigates through all pages, checking each file (~30 minutes)
- New system: Phase 2 completes, Phase 3 skipped (~5 minutes)

## Data Models

### PageInfo

```python
@dataclass
class PageInfo:
    page_number: int
    url: str
    filenames: list[str]
    complete: bool
    downloaded_count: int
    total_count: int

    @property
    def missing_count(self) -> int:
        return self.total_count - self.downloaded_count
```

## Implementation Details

### Pagination Selectors

The system uses these selectors to navigate:

```javascript
// Find pagination element
const paginationElement = document.querySelector('[data-current-page][data-total-pages]');

// Get total pages
const totalPages = parseInt(paginationElement.getAttribute('data-total-pages'));

// Get current page
const currentPage = parseInt(paginationElement.getAttribute('data-current-page'));

// Click next button (LAST button in pagination)
const buttons = paginationElement.querySelectorAll('[role="button"]');
const nextButton = buttons[buttons.length - 1];
nextButton.click();
```

### Document Selectors

```javascript
// Get all document filenames on page
const elements = document.querySelectorAll('[data-tooltip]');
const filenames = Array.from(elements)
    .map(el => el.getAttribute('data-tooltip'))
    .filter(Boolean);
```

### Download Flow (Per Document)

1. Find element by `[data-tooltip="{filename}"]`
2. Click element (navigate to document view)
3. Wait for page load
4. Find and click `more_vert` icon
5. Click "Download original file" button
6. Wait for download to complete
7. Save file to disk
8. Navigate back to search page

## Error Recovery

### Automatic Retry Logic

```python
for attempt in range(self.config.retry_attempts):
    try:
        # Attempt download
        ...
        return True
    except Exception as e:
        if attempt < self.config.retry_attempts - 1:
            await asyncio.sleep(self.config.retry_delay)
        else:
            # Log failure and continue
            self.progress.failed_files.append((filename, str(e)))
            return False
```

### Stuck Page Recovery

If a page gets stuck in document view:
1. Detect URL contains `docid=`
2. Execute `page.go_back()`
3. Wait for network idle
4. Retry from search page

## Logging

The system provides comprehensive logging:

```
Phase 1: Discovering all page URLs...
Total pages: 30
Page 1: https://...
Page 2: https://...
...
✓ Found 30 pages

Phase 2: Checking page completion status...
Checking page 1/30...
Page 1: ✓ COMPLETE
Checking page 2/30...
Page 2: ✗ INCOMPLETE (45/100)
...
✓ Page completion check complete:
  - Complete pages: 10/30
  - Incomplete pages: 20/30

Phase 3: Parallel batch download (5 pages at a time)
Total documents to download: 1450

Processing batch: pages 11-15 (5/20)
[Page 11] Starting download of 100 documents
[Page 12] Starting download of 100 documents
[Page 13] Starting download of 100 documents
[Page 14] Starting download of 100 documents
[Page 15] Starting download of 100 documents
[Page 11] Downloaded: document1.pdf
[Page 12] Downloaded: document2.pdf
...
```

## Testing

All code passes strict quality checks:

```bash
# Linting
uv run ruff check src/

# Type checking
uv run mypy src/

# Both should pass with no errors
```

## Future Enhancements

Potential improvements:
1. **Persistent state**: Save page discovery results to disk to skip Phase 1 on restart
2. **Dynamic parallelism**: Auto-tune `parallel_pages` based on system resources
3. **Rate limiting**: Add configurable delays between batches
4. **Metrics tracking**: Export download statistics to JSON/CSV
5. **Cloud storage**: Direct upload to S3/GCS instead of local disk

## Troubleshooting

### "Browser not started" error
**Solution**: Ensure you're using the context manager (`async with`) or call `await downloader.start()`

### Downloads stuck at 0%
**Solution**: Check pagination selectors are still valid on the target website

### Out of memory errors
**Solution**: Reduce `parallel_pages` from 5 to 3 or 2

### "Element not found" errors
**Solution**: Increase timeout or check if lazy loading needs more scroll time

## License

This implementation is part of the pedofinder project. See LICENSE.md for details.
