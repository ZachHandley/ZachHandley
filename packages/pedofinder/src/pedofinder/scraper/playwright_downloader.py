"""Playwright-based PDF downloader for Epstein documents."""

import asyncio
import logging
from types import TracebackType

from playwright.async_api import Browser, BrowserContext, Download, Page, async_playwright
from rich.console import Console
from rich.progress import BarColumn, Progress, TaskID, TextColumn, TimeRemainingColumn

from pedofinder.scraper.models import DocumentInfo, DownloadConfig, DownloadProgress, PageInfo

logger = logging.getLogger(__name__)
console = Console()


class PlaywrightDownloader:
    """Downloads PDFs from Google Journalist Studio using Playwright with anti-detection."""

    def __init__(self, config: DownloadConfig) -> None:
        """Initialize the downloader.

        Args:
            config: Download configuration
        """
        self.config = config
        self.progress = DownloadProgress(
            current=0,
            total=config.total_documents,
            current_page=1,
        )
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.main_page: Page | None = None

        # Ensure download directory exists
        self.config.download_dir.mkdir(parents=True, exist_ok=True)

    async def __aenter__(self) -> "PlaywrightDownloader":
        """Context manager entry."""
        await self.start()
        return self

    async def __aexit__(
        self, exc_type: type[BaseException] | None, exc_val: BaseException | None, exc_tb: TracebackType | None
    ) -> None:
        """Context manager exit."""
        await self.close()

    async def start(self) -> None:
        """Start the browser and navigate to the initial page."""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=self.config.headless)

        # Create context with anti-detection settings
        self.context = await self.browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            ),
            accept_downloads=True,
        )

        self.main_page = await self.context.new_page()
        logger.info(f"Navigating to {self.config.start_url}")
        await self.main_page.goto(self.config.start_url, wait_until="networkidle")
        await asyncio.sleep(2)  # Wait for JavaScript to initialize

    async def close(self) -> None:
        """Close the browser and cleanup."""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()

    async def _get_documents_on_page(self) -> list[str]:
        """Get all document filenames on the current page using page.evaluate().

        Returns:
            List of filenames found on the page
        """
        if not self.main_page:
            return []

        # Use page.evaluate() to extract filenames from DOM
        filenames = await self.main_page.evaluate("""
            () => {
                const elements = document.querySelectorAll('[data-tooltip]');
                return Array.from(elements).map(el => el.getAttribute('data-tooltip')).filter(Boolean);
            }
        """)

        return filenames if isinstance(filenames, list) else []

    async def _download_document(self, filename: str, _doc_info: DocumentInfo) -> bool:
        """Download a single document using the tested flow: click → download → go back.

        Args:
            filename: The filename to download
            _doc_info: Document information for tracking

        Returns:
            True if download succeeded, False otherwise
        """
        if not self.main_page:
            return False

        # Check if file already exists
        output_path = self.config.download_dir / filename
        if output_path.exists():
            logger.info(f"Skipping {filename} (already exists)")
            self.progress.skipped_files.add(filename)
            return True

        for attempt in range(self.config.retry_attempts):
            try:
                # Find the document element
                element_selector = f'[data-tooltip="{filename}"]'
                element = await self.main_page.wait_for_selector(element_selector, timeout=10000)

                if not element:
                    logger.error(f"Could not find element for {filename}")
                    return False

                # Step 1: Regular click to navigate to document view (no Ctrl+Click!)
                await element.click()
                await self.main_page.wait_for_load_state("networkidle")
                logger.debug(f"Navigated to document view for {filename}")

                # Step 2: Find and click more_vert icon
                more_vert_selector = 'i.material-icons-extended:has-text("more_vert")'
                await self.main_page.wait_for_selector(more_vert_selector, timeout=10000)
                more_vert = await self.main_page.query_selector(more_vert_selector)

                if not more_vert:
                    logger.error(f"Could not find more_vert menu for {filename}")
                    await self.main_page.go_back()
                    await self.main_page.wait_for_load_state("networkidle")
                    return False

                await more_vert.click()
                await asyncio.sleep(1)  # Wait for menu to appear

                # Step 3: Find and click "Download original file" button
                download_selectors = [
                    'text="Download original file"',
                    'text="download original file"',
                    'text="Download"',
                ]

                download_button = None
                for selector in download_selectors:
                    download_button = await self.main_page.query_selector(selector)
                    if download_button:
                        logger.debug(f"Found download button with selector: {selector}")
                        break

                if not download_button:
                    logger.error(f"Could not find download button for {filename}")
                    await self.main_page.go_back()
                    await self.main_page.wait_for_load_state("networkidle")
                    return False

                # Step 4: Click download and wait for download to complete
                async with self.main_page.expect_download(timeout=self.config.timeout) as download_info:
                    await download_button.click()

                download: Download = await download_info.value

                # Save the download
                await download.save_as(output_path)
                logger.info(f"Downloaded: {filename}")

                # Step 5: Navigate back to search page
                await self.main_page.go_back()
                await self.main_page.wait_for_load_state("networkidle")
                await asyncio.sleep(1)  # Brief pause to ensure page is fully loaded

                self.progress.downloaded_files.add(filename)
                return True

            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed for {filename}: {e}")
                # Try to return to search page if we're stuck on document view
                try:
                    if self.main_page and "docid=" in self.main_page.url:
                        await self.main_page.go_back()
                        await self.main_page.wait_for_load_state("networkidle")
                except Exception:
                    pass

                if attempt < self.config.retry_attempts - 1:
                    await asyncio.sleep(self.config.retry_delay)
                else:
                    logger.error(f"Failed to download {filename} after {self.config.retry_attempts} attempts")
                    self.progress.failed_files.append((filename, str(e)))
                    return False

        return False

    async def _navigate_to_next_page(self) -> bool:
        """Navigate to the next page of results.

        Returns:
            True if navigation succeeded, False if no more pages
        """
        if not self.main_page:
            return False

        # Use page.evaluate() to find and click next page button
        has_next = await self.main_page.evaluate("""
            () => {
                // Look for pagination controls
                const buttons = Array.from(document.querySelectorAll('button, a'));
                const nextButton = buttons.find(btn => {
                    const text = btn.textContent?.toLowerCase() || '';
                    const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
                    return text.includes('next') || ariaLabel.includes('next') || text === '>';
                });

                if (nextButton && !nextButton.hasAttribute('disabled')) {
                    nextButton.click();
                    return true;
                }
                return false;
            }
        """)

        if has_next:
            await self.main_page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)  # Wait for new page to fully load
            self.progress.current_page += 1
            return True

        return False

    async def _scroll_to_load_all_documents(self, page: Page | None = None) -> int:
        """Scroll down the page to trigger lazy loading of all documents.

        Keeps scrolling until no new documents appear, ensuring all ~100 documents
        on the page are loaded before proceeding.

        Args:
            page: Page to scroll (defaults to self.main_page)

        Returns:
            Total number of documents found after scrolling
        """
        target_page = page or self.main_page
        if not target_page:
            return 0

        logger.debug("Scrolling to load all documents via lazy loading")

        # Track document count to detect when loading stops
        previous_count = 0
        stable_count = 0
        max_stable_checks = 3  # Stop if count is stable for 3 checks

        while stable_count < max_stable_checks:
            # Scroll down in increments
            await target_page.evaluate("window.scrollBy(0, 500)")
            await asyncio.sleep(0.5)

            # Count current documents
            current_count = await target_page.evaluate("""
                () => document.querySelectorAll('[data-tooltip]').length
            """)

            if current_count == previous_count:
                stable_count += 1
                logger.debug(
                    f"Document count stable at {current_count} (check {stable_count}/{max_stable_checks})"
                )
            else:
                stable_count = 0
                logger.debug(f"Loaded {current_count} documents (was {previous_count})")

            previous_count = current_count

        # Scroll back to top for easier element finding
        await target_page.evaluate("window.scrollTo(0, 0)")
        await asyncio.sleep(1)

        logger.info(f"Finished scrolling - found {previous_count} documents on page")
        return previous_count

    async def discover_all_pages(self) -> dict[int, str]:
        """Phase 1: Discover all page URLs by navigating through pagination.

        Finds the total number of pages and collects all page URLs.

        Returns:
            Dictionary mapping page numbers to URLs
        """
        if not self.main_page:
            raise RuntimeError("Browser not started - call start() first")

        logger.info("Phase 1: Discovering all page URLs...")
        page_urls: dict[int, str] = {}

        try:
            # Wait for pagination element to load
            await self.main_page.wait_for_selector("[data-current-page][data-total-pages]", timeout=10000)

            # Extract total pages from pagination
            total_pages = await self.main_page.evaluate("""
                () => {
                    const paginationElement = document.querySelector('[data-current-page][data-total-pages]');
                    if (!paginationElement) return null;
                    return parseInt(paginationElement.getAttribute('data-total-pages') || '0');
                }
            """)

            if not total_pages or total_pages == 0:
                logger.warning("Could not determine total pages, will navigate until no more pages found")
                total_pages = None

            logger.info(f"Total pages: {total_pages if total_pages else 'unknown'}")

            # Navigate through all pages
            page_number = 1
            while True:
                # Record current page URL
                current_url = self.main_page.url
                page_urls[page_number] = current_url
                logger.info(f"Page {page_number}: {current_url}")

                # Check if we've reached the expected total
                if total_pages and page_number >= total_pages:
                    logger.info(f"Reached page {page_number}/{total_pages}")
                    break

                # Try to navigate to next page
                previous_url = current_url

                # Find pagination element and click the LAST button (next button)
                next_clicked = await self.main_page.evaluate("""
                    () => {
                        const paginationElement = document.querySelector('[data-current-page][data-total-pages]');
                        if (!paginationElement) return false;

                        const buttons = paginationElement.querySelectorAll('[role="button"]');
                        if (buttons.length === 0) return false;

                        const nextButton = buttons[buttons.length - 1];
                        if (nextButton.hasAttribute('disabled')) return false;

                        nextButton.click();
                        return true;
                    }
                """)

                if not next_clicked:
                    logger.info(f"No more pages available after page {page_number}")
                    break

                # Wait for navigation
                await self.main_page.wait_for_load_state("networkidle")
                await asyncio.sleep(2)

                # Check if URL changed
                new_url = self.main_page.url
                if new_url == previous_url:
                    logger.info(f"URL did not change, reached end at page {page_number}")
                    break

                page_number += 1

                # Safety limit
                if page_number > 50:
                    logger.warning("Reached safety limit of 50 pages")
                    break

            logger.info(f"Discovered {len(page_urls)} pages")
            return page_urls

        except Exception as e:
            logger.error(f"Error discovering pages: {e}")
            # Return whatever we found so far
            if page_urls:
                logger.info(f"Returning {len(page_urls)} pages discovered before error")
                return page_urls
            raise

    async def check_page_completion(self, page_urls: dict[int, str]) -> dict[int, PageInfo]:
        """Phase 2: Check which pages are complete by verifying downloaded files.

        Args:
            page_urls: Dictionary mapping page numbers to URLs

        Returns:
            Dictionary mapping page numbers to PageInfo objects
        """
        if not self.main_page:
            raise RuntimeError("Browser not started - call start() first")

        logger.info("Phase 2: Checking page completion status...")
        page_info: dict[int, PageInfo] = {}

        for page_num, url in page_urls.items():
            try:
                logger.info(f"Checking page {page_num}/{len(page_urls)}...")

                # Navigate to page
                await self.main_page.goto(url, wait_until="networkidle")
                await asyncio.sleep(2)

                # Scroll to load all documents
                await self._scroll_to_load_all_documents()

                # Extract all filenames
                filenames = await self.main_page.evaluate("""
                    () => {
                        const elements = document.querySelectorAll('[data-tooltip]');
                        return Array.from(elements)
                            .map(el => el.getAttribute('data-tooltip'))
                            .filter(Boolean);
                    }
                """)

                if not isinstance(filenames, list):
                    filenames = []

                # Check how many files exist on disk
                existing_count = 0
                for filename in filenames:
                    file_path = self.config.download_dir / filename
                    if file_path.exists():
                        existing_count += 1

                # Determine if page is complete
                is_complete = len(filenames) > 0 and existing_count == len(filenames)

                page_info[page_num] = PageInfo(
                    page_number=page_num,
                    url=url,
                    filenames=filenames,
                    complete=is_complete,
                    downloaded_count=existing_count,
                    total_count=len(filenames),
                )

                status = "✓ COMPLETE" if is_complete else f"✗ INCOMPLETE ({existing_count}/{len(filenames)})"
                logger.info(f"Page {page_num}: {status}")

            except Exception as e:
                logger.error(f"Error checking page {page_num}: {e}")
                # Create a PageInfo for failed check
                page_info[page_num] = PageInfo(
                    page_number=page_num,
                    url=url,
                    filenames=[],
                    complete=False,
                    downloaded_count=0,
                    total_count=0,
                )

        complete_pages = sum(1 for info in page_info.values() if info.complete)
        logger.info(f"Completion check done: {complete_pages}/{len(page_info)} pages complete")

        return page_info

    async def _download_document_from_page(
        self,
        page: Page,
        filename: str,
        page_number: int,
        task_id: TaskID | None = None,
        progress_bar: Progress | None = None,
    ) -> bool:
        """Download a single document from a specific page.

        Args:
            page: The page to download from
            filename: The filename to download
            page_number: The page number (for logging)
            task_id: Optional progress bar task ID
            progress_bar: Optional progress bar instance

        Returns:
            True if download succeeded, False otherwise
        """
        # Check if file already exists
        output_path = self.config.download_dir / filename
        if output_path.exists():
            logger.debug(f"[Page {page_number}] Skipping {filename} (already exists)")
            self.progress.skipped_files.add(filename)
            return True

        for attempt in range(self.config.retry_attempts):
            try:
                # Find the document element
                element_selector = f'[data-tooltip="{filename}"]'
                element = await page.wait_for_selector(element_selector, timeout=10000)

                if not element:
                    logger.error(f"[Page {page_number}] Could not find element for {filename}")
                    return False

                # Step 1: Regular click to navigate to document view
                await element.click()
                await page.wait_for_load_state("networkidle")

                # Step 2: Find and click more_vert icon
                more_vert_selector = 'i.material-icons-extended:has-text("more_vert")'
                await page.wait_for_selector(more_vert_selector, timeout=10000)
                more_vert = await page.query_selector(more_vert_selector)

                if not more_vert:
                    logger.error(f"[Page {page_number}] Could not find more_vert menu for {filename}")
                    await page.go_back()
                    await page.wait_for_load_state("networkidle")
                    return False

                await more_vert.click()
                await asyncio.sleep(1)

                # Step 3: Find and click "Download original file" button
                download_selectors = [
                    'text="Download original file"',
                    'text="download original file"',
                    'text="Download"',
                ]

                download_button = None
                for selector in download_selectors:
                    download_button = await page.query_selector(selector)
                    if download_button:
                        break

                if not download_button:
                    logger.error(f"[Page {page_number}] Could not find download button for {filename}")
                    await page.go_back()
                    await page.wait_for_load_state("networkidle")
                    return False

                # Step 4: Click download and wait for download to complete
                async with page.expect_download(timeout=self.config.timeout) as download_info:
                    await download_button.click()

                download: Download = await download_info.value
                await download.save_as(output_path)
                logger.info(f"[Page {page_number}] Downloaded: {filename}")

                # Step 5: Navigate back to search page
                await page.go_back()
                await page.wait_for_load_state("networkidle")
                await asyncio.sleep(1)

                self.progress.downloaded_files.add(filename)

                # Update progress bar if provided
                if progress_bar and task_id is not None:
                    progress_bar.update(task_id, advance=1)

                return True

            except Exception as e:
                logger.warning(f"[Page {page_number}] Attempt {attempt + 1} failed for {filename}: {e}")
                # Try to return to search page if stuck
                try:
                    if "docid=" in page.url:
                        await page.go_back()
                        await page.wait_for_load_state("networkidle")
                except Exception:
                    pass

                if attempt < self.config.retry_attempts - 1:
                    await asyncio.sleep(self.config.retry_delay)
                else:
                    logger.error(
                        f"[Page {page_number}] Failed to download {filename} "
                        f"after {self.config.retry_attempts} attempts"
                    )
                    self.progress.failed_files.append((filename, str(e)))
                    return False

        return False

    async def download_single_page(
        self,
        page_num: int,
        url: str,
        filenames: list[str],
        task_id: TaskID | None = None,
        progress_bar: Progress | None = None,
    ) -> None:
        """Download all documents from a single page in a separate browser tab.

        Args:
            page_num: Page number
            url: Page URL
            filenames: List of filenames on this page
            task_id: Optional progress bar task ID
            progress_bar: Optional progress bar instance
        """
        if not self.context:
            raise RuntimeError("Browser context not available")

        logger.info(f"[Page {page_num}] Starting download of {len(filenames)} documents")

        # Create a new page (tab) for this download
        page = await self.context.new_page()

        try:
            # Navigate to page
            await page.goto(url, wait_until="networkidle")
            await asyncio.sleep(2)

            # Scroll to load all documents
            await self._scroll_to_load_all_documents(page)

            # Download each document
            for idx, filename in enumerate(filenames, start=1):
                logger.debug(f"[Page {page_num}] Processing {idx}/{len(filenames)}: {filename}")

                success = await self._download_document_from_page(
                    page=page,
                    filename=filename,
                    page_number=page_num,
                    task_id=task_id,
                    progress_bar=progress_bar,
                )

                if success:
                    # Scroll again after returning from document view
                    await self._scroll_to_load_all_documents(page)
                    await asyncio.sleep(0.5)

            logger.info(f"[Page {page_num}] Completed")

        except Exception as e:
            logger.error(f"[Page {page_num}] Error during download: {e}")
            raise
        finally:
            # Always close the page
            await page.close()

    async def download_all_parallel(
        self,
        page_urls: dict[int, str],
        page_info: dict[int, PageInfo],
        incomplete_pages: list[int],
    ) -> None:
        """Phase 3: Download incomplete pages in parallel batches.

        Args:
            page_urls: Dictionary mapping page numbers to URLs
            page_info: Dictionary mapping page numbers to PageInfo objects
            incomplete_pages: List of page numbers that need downloading
        """
        logger.info(f"Phase 3: Starting parallel batch download ({self.config.parallel_pages} pages at a time)")

        # Calculate total documents to download
        total_documents = sum(page_info[p].missing_count for p in incomplete_pages)
        logger.info(f"Total documents to download: {total_documents}")

        # Setup rich progress display
        with Progress(
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TextColumn("({task.completed}/{task.total})"),
            TimeRemainingColumn(),
            console=console,
        ) as progress_bar:
            task: TaskID = progress_bar.add_task(
                f"[cyan]Downloading {total_documents} documents...",
                total=total_documents,
            )

            # Process pages in batches
            for batch_start in range(0, len(incomplete_pages), self.config.parallel_pages):
                batch = incomplete_pages[batch_start : batch_start + self.config.parallel_pages]
                batch_end = min(batch_start + self.config.parallel_pages, len(incomplete_pages))

                logger.info(f"\nProcessing batch: pages {batch[0]}-{batch[-1]} ({batch_end}/{len(incomplete_pages)})")

                # Create tasks for parallel execution
                download_tasks = [
                    self.download_single_page(
                        page_num=page_num,
                        url=page_urls[page_num],
                        filenames=page_info[page_num].filenames,
                        task_id=task,
                        progress_bar=progress_bar,
                    )
                    for page_num in batch
                ]

                # Run batch in parallel
                try:
                    await asyncio.gather(*download_tasks, return_exceptions=True)
                except Exception as e:
                    logger.error(f"Error in batch processing: {e}")
                    # Continue with next batch even if this one had errors

                logger.info(f"Batch complete: {batch_end}/{len(incomplete_pages)} pages processed")

    async def download_all(self) -> DownloadProgress:
        """Download all documents using 3-phase parallel approach.

        Phase 1: Discover all page URLs
        Phase 2: Check page completion status
        Phase 3: Download incomplete pages in parallel batches

        Returns:
            Final download progress with statistics
        """
        # Phase 1: Discover all page URLs
        logger.info("\n" + "=" * 80)
        logger.info("PHASE 1: Discovering all page URLs")
        logger.info("=" * 80)

        page_urls = await self.discover_all_pages()
        logger.info(f"✓ Found {len(page_urls)} pages")

        # Phase 2: Check page completion
        logger.info("\n" + "=" * 80)
        logger.info("PHASE 2: Checking page completion status")
        logger.info("=" * 80)

        page_info = await self.check_page_completion(page_urls)

        # Determine which pages need downloading
        incomplete_pages = [p for p, info in page_info.items() if not info.complete]
        complete_pages = [p for p, info in page_info.items() if info.complete]

        logger.info("\n✓ Page completion check complete:")
        logger.info(f"  - Complete pages: {len(complete_pages)}/{len(page_info)}")
        logger.info(f"  - Incomplete pages: {len(incomplete_pages)}/{len(page_info)}")

        if complete_pages:
            logger.info(f"  - Complete page numbers: {sorted(complete_pages)}")
        if incomplete_pages:
            logger.info(f"  - Incomplete page numbers: {sorted(incomplete_pages)}")

        # If all pages are complete, we're done
        if not incomplete_pages:
            logger.info("\n[green]All pages are already complete! No downloads needed.[/green]")
            # Update progress statistics from disk
            for info in page_info.values():
                for filename in info.filenames:
                    if (self.config.download_dir / filename).exists():
                        self.progress.skipped_files.add(filename)
            return self.progress

        # Phase 3: Parallel batch download
        logger.info("\n" + "=" * 80)
        logger.info("PHASE 3: Parallel batch download")
        logger.info("=" * 80)

        await self.download_all_parallel(page_urls, page_info, incomplete_pages)

        # Final summary
        console.print("\n" + "=" * 80)
        console.print("[green]Download complete![/green]")
        console.print("=" * 80)
        console.print(f"Successfully downloaded: {len(self.progress.downloaded_files)}")
        console.print(f"Skipped (already exist): {len(self.progress.skipped_files)}")
        console.print(f"Failed downloads: {len(self.progress.failed_files)}")
        console.print(f"Total processed: {self.progress.processed_count}/{self.config.total_documents}")

        if self.progress.failed_files:
            console.print("\n[yellow]Failed files:[/yellow]")
            for filename, error in self.progress.failed_files:
                console.print(f"  - {filename}: {error}")

        return self.progress

    async def verify_downloads(self) -> tuple[set[str], set[str]]:
        """Verify downloaded files against expected filenames.

        Returns:
            Tuple of (downloaded_files, missing_files)
        """
        downloaded_files = {f.name for f in self.config.download_dir.glob("*.pdf")}
        expected_files = self.progress.downloaded_files
        missing_files = expected_files - downloaded_files

        console.print("\n[cyan]Verification:[/cyan]")
        console.print(f"Files on disk: {len(downloaded_files)}")
        console.print(f"Expected files: {len(expected_files)}")
        console.print(f"Missing files: {len(missing_files)}")

        if missing_files:
            console.print("\n[yellow]Missing files:[/yellow]")
            for filename in sorted(missing_files):
                console.print(f"  - {filename}")

        return downloaded_files, missing_files
