"""Type-safe models for the PDF downloader."""

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class DocumentInfo:
    """Information about a document to download."""

    filename: str
    page_number: int
    document_index: int
    total_documents: int


@dataclass
class PageInfo:
    """Information about a page and its documents."""

    page_number: int
    url: str
    filenames: list[str] = field(default_factory=list)
    complete: bool = False
    downloaded_count: int = 0
    total_count: int = 0

    @property
    def missing_count(self) -> int:
        """Number of files not yet downloaded."""
        return self.total_count - self.downloaded_count


@dataclass
class DownloadProgress:
    """Progress tracking for downloads."""

    current: int
    total: int
    current_page: int
    current_filename: str | None = None
    downloaded_files: set[str] = field(default_factory=set)
    skipped_files: set[str] = field(default_factory=set)
    failed_files: list[tuple[str, str]] = field(default_factory=list)

    @property
    def percentage(self) -> float:
        """Calculate download percentage."""
        if self.total == 0:
            return 0.0
        return (self.current / self.total) * 100

    @property
    def processed_count(self) -> int:
        """Total number of processed documents (downloaded + skipped + failed)."""
        return len(self.downloaded_files) + len(self.skipped_files) + len(self.failed_files)

    def __str__(self) -> str:
        """String representation for console output."""
        return (
            f"Processing {self.processed_count}/{self.total} "
            f"(Downloaded: {len(self.downloaded_files)}, "
            f"Skipped: {len(self.skipped_files)}, "
            f"Failed: {len(self.failed_files)}) - Page {self.current_page}"
        )


@dataclass
class DownloadConfig:
    """Configuration for the downloader."""

    start_url: str
    download_dir: Path
    total_documents: int = 2911
    headless: bool = False
    timeout: int = 30000
    retry_attempts: int = 3
    retry_delay: int = 2
    parallel_pages: int = 5  # Number of pages to process in parallel
