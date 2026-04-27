# Playwright PDF Downloader

This module provides a robust, type-safe Playwright-based downloader for all 2911 Epstein court documents from Google Journalist Studio Pinpoint.

## Features

- **Sequential Download**: Downloads one document at a time to avoid rate limiting
- **Resume Capability**: Automatically skips already downloaded files
- **Progress Tracking**: Rich progress bars showing download status
- **Error Handling**: Automatic retries with configurable attempts
- **Anti-Detection**: Uses page.evaluate() for all DOM interactions
- **Type Safety**: Full type hints passing strict mypy checks
- **Verification**: Post-download verification to identify missing files

## Architecture

### Components

1. **`models.py`** - Type-safe data models
   - `DocumentInfo`: Information about each document
   - `DownloadProgress`: Progress tracking with statistics
   - `DownloadConfig`: Configuration settings

2. **`playwright_downloader.py`** - Main downloader class
   - `PlaywrightDownloader`: Async context manager for downloading
   - Anti-detection using page.evaluate() instead of Playwright selectors
   - Sequential processing with automatic pagination

3. **`scripts/download_pdfs.py`** - CLI entry point
   - Logging setup with Rich
   - Progress display
   - Error handling

## Usage

### Basic Usage

```bash
cd /home/zach/github/ZachHandley/packages/pedofinder
uv run python scripts/download_pdfs.py
```

### Advanced Usage

```python
from pathlib import Path
from pedofinder.scraper import PlaywrightDownloader, DownloadConfig

async def main():
    config = DownloadConfig(
        start_url="https://journaliststudio.google.com/u/3/pinpoint/search?...",
        download_dir=Path("data/pdfs"),
        total_documents=2911,
        headless=False,  # Set True for production
        timeout=30000,
        retry_attempts=3,
        retry_delay=2,
    )

    async with PlaywrightDownloader(config) as downloader:
        # Download all documents
        progress = await downloader.download_all()

        # Verify downloads
        downloaded, missing = await downloader.verify_downloads()

        print(f"Downloaded: {len(downloaded)}")
        print(f"Missing: {len(missing)}")
```

## Download Flow

1. **Page Navigation**
   - Navigate to the collection page
   - Extract all document filenames using page.evaluate()

2. **Document Download** (for each document)
   - Check if file already exists (resume capability)
   - Ctrl+Click document link to open in new tab
   - Use page.evaluate() to find and click `more_vert` icon
   - Use page.evaluate() to click "download original file"
   - Wait for download to complete
   - Close document tab
   - Move to next document

3. **Pagination**
   - Navigate to next page using page.evaluate()
   - Repeat until all 2911 documents downloaded

4. **Verification**
   - Compare downloaded files against expected filenames
   - Report any missing files

## Anti-Detection Strategy

All DOM interactions use `page.evaluate()` instead of Playwright selectors to avoid bot detection:

```javascript
// Example: Click the more_vert icon
await page.evaluate(() => {
    const icons = Array.from(document.querySelectorAll('i.material-icons-extended'));
    const moreVertIcon = icons.find(icon => icon.textContent.trim() === 'more_vert');
    if (moreVertIcon) {
        moreVertIcon.click();
        return true;
    }
    return false;
});
```

This approach:
- Executes JavaScript in the page context
- Appears as normal user interaction
- Avoids Playwright's WebDriver detection

## Configuration

### DownloadConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `start_url` | str | - | Collection starting URL |
| `download_dir` | Path | - | Directory for downloaded PDFs |
| `total_documents` | int | 2911 | Total expected documents |
| `headless` | bool | False | Run browser in headless mode |
| `timeout` | int | 30000 | Download timeout (ms) |
| `retry_attempts` | int | 3 | Number of retry attempts |
| `retry_delay` | int | 2 | Delay between retries (seconds) |

## Error Handling

- **Automatic Retries**: Failed downloads retry up to 3 times (configurable)
- **Error Tracking**: Failed files logged with error messages
- **Graceful Degradation**: Continues downloading even if individual files fail
- **Resume Support**: Skips already downloaded files on restart

## Type Safety

All code passes:
- `uv run ruff check` - Code quality and style
- `uv run mypy src/` - Strict type checking

## Output

Downloaded PDFs are saved to: `/home/zach/github/ZachHandley/packages/pedofinder/data/pdfs/`

Each file retains its original filename from the collection.

## Progress Display

```
Downloading 157/2911 (5.4%) - Page 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 5% 0:42:15
```

Shows:
- Current/Total documents
- Percentage complete
- Current page number
- Estimated time remaining

## Verification

After download completion, run verification:

```python
downloaded, missing = await downloader.verify_downloads()
```

This compares:
- Files on disk (actual downloaded files)
- Expected files (tracked during download)
- Reports any missing files for re-download
