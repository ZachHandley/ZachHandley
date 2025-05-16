import type { APIRoute } from "astro";
import CryptoJSW from "@originjs/crypto-js-wasm";

// In-memory cache with expiration
const CACHE: Record<
  string,
  { data: ArrayBuffer; contentType: string; timestamp: number }
> = {};
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const GET: APIRoute = async ({ params, request }) => {
  const siteDomain = params.siteFavicon;

  if (!siteDomain) {
    return new Response(JSON.stringify({ error: "Missing site domain" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  console.log(`Loading Crypto WASM`);
  await CryptoJSW.loadAllWasm();

  console.log(`Generating cache key for ${siteDomain}`);
  const cacheKey = CryptoJSW.MD5(siteDomain).toString();
  const now = Date.now();

  console.log(`Checking cache for ${siteDomain}`);
  // Check if we have a valid cached response
  if (CACHE[cacheKey] && now - CACHE[cacheKey].timestamp < CACHE_DURATION) {
    console.log(`Serving cached favicon for ${siteDomain}`);
    return new Response(CACHE[cacheKey].data, {
      status: 200,
      headers: {
        "Content-Type": CACHE[cacheKey].contentType,
        "Cache-Control": "public, max-age=604800", // 7 days
        "Access-Control-Allow-Origin": "*", // Allow CORS
        "X-Cache": "HIT",
      },
    });
  }

  try {
    // First try to fetch favicon directly from the website
    const siteUrl = `https://${siteDomain}`;
    console.log(`Trying to fetch favicon directly from ${siteUrl}`);

    // Fetch with a reasonable timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    // Fetch the website's HTML
    const siteResponse = await fetch(siteUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FaviconFetcher/1.0)",
      },
      redirect: "follow",
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);

    // If we got a response, try to parse it for favicon links
    if (siteResponse && siteResponse.ok) {
      const html = await siteResponse.text();

      // Look for favicon in HTML
      const faviconMatch =
        html.match(
          /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i
        ) ||
        html.match(
          /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i
        ) ||
        html.match(
          /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i
        ) ||
        html.match(
          /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i
        );

      if (faviconMatch && faviconMatch[1]) {
        let faviconUrl = faviconMatch[1];

        // Make sure the URL is absolute
        if (!faviconUrl.startsWith("http")) {
          if (faviconUrl.startsWith("/")) {
            faviconUrl = `https://${siteDomain}${faviconUrl}`;
          } else {
            faviconUrl = `https://${siteDomain}/${faviconUrl}`;
          }
        }

        // Try to fetch the favicon
        console.log(`Found favicon URL: ${faviconUrl}`);
        const faviconResponse = await fetch(faviconUrl, {
          redirect: "follow",
        }).catch(() => null);

        if (faviconResponse && faviconResponse.ok) {
          // Get content type and the binary data
          const contentType =
            faviconResponse.headers.get("Content-Type") || "image/x-icon";
          const imageBuffer = await faviconResponse.arrayBuffer();

          // Store in cache
          CACHE[cacheKey] = {
            data: imageBuffer,
            contentType,
            timestamp: now,
          };

          // Return the favicon with proper headers
          return new Response(imageBuffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=604800", // 7 days
              "Access-Control-Allow-Origin": "*", // Allow CORS
              "X-Cache": "MISS",
              "X-Source": "direct",
            },
          });
        }
      }

      // If no favicon found or fetch failed, try default favicon
      console.log(`Trying default favicon.ico for ${siteDomain}`);
      const defaultFaviconUrl = `https://${siteDomain}/favicon.ico`;
      const defaultFaviconResponse = await fetch(defaultFaviconUrl).catch(
        () => null
      );

      if (defaultFaviconResponse && defaultFaviconResponse.ok) {
        const contentType =
          defaultFaviconResponse.headers.get("Content-Type") || "image/x-icon";
        const imageBuffer = await defaultFaviconResponse.arrayBuffer();

        // Cache the result
        CACHE[cacheKey] = {
          data: imageBuffer,
          contentType,
          timestamp: now,
        };

        // Return the default favicon
        return new Response(imageBuffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=604800", // 7 days
            "Access-Control-Allow-Origin": "*", // Allow CORS
            "X-Cache": "MISS",
            "X-Source": "default",
          },
        });
      }
    }

    // Fallback to Google's favicon service if direct fetching fails
    console.log(`Falling back to Google's favicon service for ${siteDomain}`);
    const googleResponse = await fetch(
      `https://www.google.com/s2/favicons?domain=${decodeURIComponent(
        siteDomain
      )}&sz=64`
    );

    if (!googleResponse.ok) {
      // If Google's service fails, just return a 404
      return new Response(JSON.stringify({ error: "Favicon not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // Allow CORS
        },
      });
    }

    // Get content type and the binary data
    const contentType =
      googleResponse.headers.get("Content-Type") || "image/x-icon";
    const imageBuffer = await googleResponse.arrayBuffer();

    // Store in cache
    CACHE[cacheKey] = {
      data: imageBuffer,
      contentType,
      timestamp: now,
    };

    // Return the favicon with proper headers
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800", // 7 days
        "Access-Control-Allow-Origin": "*", // Allow CORS
        "X-Cache": "MISS",
        "X-Source": "google",
      },
    });
  } catch (error) {
    console.error("Error fetching favicon:", error);

    // Return a JSON error response
    return new Response(
      JSON.stringify({
        error: "Failed to fetch favicon",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // Allow CORS
        },
      }
    );
  }
};
