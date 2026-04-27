"""Test the correct download flow: click → download → go back."""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright


async def test_download_flow() -> None:
    """Test the full download flow for one document."""
    start_url = "https://journaliststudio.google.com/u/3/pinpoint/search?collection=092314e384a58618&pageId=none&p=1&docid=de734d358d9e36ad_092314e384a58618_0&page=1"
    download_dir = Path("test_downloads")
    download_dir.mkdir(exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()

        print(f"Navigating to: {start_url}")
        await page.goto(start_url, wait_until="networkidle")

        print("\nFinding first document...")
        elements = await page.query_selector_all('[data-tooltip]')
        if not elements:
            print("No documents found!")
            await browser.close()
            return

        first_element = elements[0]
        first_tooltip = await first_element.get_attribute('data-tooltip')
        print(f"First document: {first_tooltip}")

        # Step 1: Click to open document view
        print("\n=== Step 1: Clicking document ===")
        await first_element.click()
        await page.wait_for_load_state("networkidle")
        print(f"Navigated to: {page.url}")

        # Step 2: Find and click more_vert icon
        print("\n=== Step 2: Finding more_vert icon ===")
        more_vert_selector = 'i.material-icons-extended:has-text("more_vert")'
        await page.wait_for_selector(more_vert_selector, timeout=10000)
        more_vert = await page.query_selector(more_vert_selector)
        if more_vert:
            print("Found more_vert icon, clicking...")
            await more_vert.click()
            await asyncio.sleep(1)  # Wait for menu to appear
        else:
            print("❌ more_vert icon not found!")
            await browser.close()
            return

        # Step 3: Click "download original file"
        print("\n=== Step 3: Looking for download button ===")
        # Try to find the download option in the menu
        download_selectors = [
            'text="Download original file"',
            'text="download original file"',
            'text="Download"',
            '[aria-label*="ownload"]',
        ]

        download_button = None
        for selector in download_selectors:
            download_button = await page.query_selector(selector)
            if download_button:
                print(f"Found download button with selector: {selector}")
                break

        if download_button:
            print("Clicking download button...")
            async with page.expect_download() as download_info:
                await download_button.click()
            download = await download_info.value

            # Save the download
            save_path = download_dir / first_tooltip
            await download.save_as(save_path)
            print(f"✅ Downloaded to: {save_path}")
        else:
            print("❌ Download button not found!")
            print("Available menu items:")
            menu_items = await page.query_selector_all('[role="menuitem"]')
            for item in menu_items:
                text = await item.inner_text()
                print(f"  - {text}")

        # Step 4: Go back to search page
        print("\n=== Step 4: Navigating back ===")
        await page.go_back()
        await page.wait_for_load_state("networkidle")
        print(f"Back at: {page.url}")

        # Verify we're back at the search page
        elements_after = await page.query_selector_all('[data-tooltip]')
        print(f"Found {len(elements_after)} documents (should be 100)")

        print("\nBrowser will stay open for 10 seconds for inspection...")
        await asyncio.sleep(10)

        await browser.close()


if __name__ == "__main__":
    asyncio.run(test_download_flow())
