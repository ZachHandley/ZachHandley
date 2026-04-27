"""CLI script to download all Epstein documents using Playwright."""

import asyncio
import logging
import sys
from pathlib import Path

from rich.logging import RichHandler

from pedofinder.scraper.models import DownloadConfig
from pedofinder.scraper.playwright_downloader import PlaywrightDownloader

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(rich_tracebacks=True)],
)

logger = logging.getLogger(__name__)


async def main() -> int:
    """Main entry point for the PDF downloader."""
    # Configuration
    project_root = Path(__file__).parent.parent
    download_dir = project_root / "data" / "pdfs"

    config = DownloadConfig(
        start_url=(
            "https://journaliststudio.google.com/u/3/pinpoint/search?"
            "collection=092314e384a58618&pageId=none&p=1&"
            "docid=de734d358d9e36ad_092314e384a58618_0&page=1"
        ),
        download_dir=download_dir,
        total_documents=2911,
        headless=False,  # Set to True for production
        timeout=30000,
        retry_attempts=3,
        retry_delay=2,
    )

    logger.info("Starting Epstein document downloader")
    logger.info(f"Download directory: {config.download_dir}")
    logger.info(f"Total documents to download: {config.total_documents}")

    try:
        async with PlaywrightDownloader(config) as downloader:
            # Download all documents
            await downloader.download_all()

            # Verify downloads
            await downloader.verify_downloads()

            logger.info("\nDownload session complete!")
            return 0

    except KeyboardInterrupt:
        logger.warning("\nDownload interrupted by user")
        return 1
    except Exception as e:
        logger.exception(f"Fatal error during download: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
