"""Simple demo script to test Ctrl+Click functionality."""

import asyncio
from playwright.async_api import async_playwright


async def test_ctrl_click() -> None:
    """Test Ctrl+Click on Google Pinpoint documents."""
    url = "https://journaliststudio.google.com/u/3/pinpoint/search?collection=092314e384a58618&pageId=none&p=1&docid=de734d358d9e36ad_092314e384a58618_0&page=1"

    async with async_playwright() as p:
        # Launch browser (visible for debugging)
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        print(f"Navigating to: {url}")
        await page.goto(url, wait_until="networkidle")

        print(f"Current URL: {page.url}")
        print("\nLooking for documents with data-tooltip...")

        # Find all elements with data-tooltip
        elements = await page.query_selector_all('[data-tooltip]')
        print(f"Found {len(elements)} elements with data-tooltip")

        if elements:
            # Print first few tooltips
            for i, element in enumerate(elements[:5]):
                tooltip = await element.get_attribute('data-tooltip')
                print(f"  {i+1}. {tooltip}")

            # Test Ctrl+Click on first element
            print(f"\n=== Testing Ctrl+Click on first element ===")
            first_element = elements[0]
            first_tooltip = await first_element.get_attribute('data-tooltip')
            print(f"Target: {first_tooltip}")
            print(f"Page URL before click: {page.url}")
            print(f"Open pages before click: {len(context.pages)}")

            # Get the clickable link element and its href
            print("\nFinding the actual link element...")
            link_info = await page.evaluate('''(tooltip) => {
                const element = document.querySelector(`[data-tooltip="${tooltip}"]`);
                if (element) {
                    // Try to find an <a> tag within or near this element
                    const link = element.closest('a') || element.querySelector('a');
                    if (link) {
                        return {
                            href: link.href,
                            hasHref: true
                        };
                    }
                    // If no link, try clicking the element to see what URL it goes to
                    return {
                        href: null,
                        hasHref: false,
                        innerHTML: element.innerHTML.substring(0, 200)
                    };
                }
                return null;
            }''', first_tooltip)
            print(f"Link info: {link_info}")

            if link_info and link_info.get('href'):
                # Try using window.open() directly
                print(f"\nAttempt: Using window.open() with href: {link_info['href']}")
                await page.evaluate('''(url) => {
                    window.open(url, '_blank');
                }''', link_info['href'])
            else:
                # Try regular click to see where it goes
                print("\nNo href found, trying regular click to see navigation...")
                await first_element.click()

            # Wait a moment for new tab to open
            await asyncio.sleep(2)

            print(f"Page URL after click: {page.url}")
            print(f"Open pages after click: {len(context.pages)}")

            if page.url == url:
                print("✅ SUCCESS: Stayed on same page (didn't navigate)")
            else:
                print("❌ FAILED: Page navigated away")

            if len(context.pages) > 1:
                print(f"✅ SUCCESS: New tab opened! Total tabs: {len(context.pages)}")
                # Print URLs of all pages
                for i, p in enumerate(context.pages):
                    print(f"  Tab {i+1}: {p.url}")
            else:
                print("❌ FAILED: No new tab opened")

            # Keep browser open for manual inspection
            print("\nBrowser will stay open for 30 seconds for inspection...")
            await asyncio.sleep(30)

        await browser.close()


if __name__ == "__main__":
    asyncio.run(test_ctrl_click())
