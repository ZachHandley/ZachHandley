globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createAstro, a as createComponent, b as addAttribute, r as renderScript, e as renderTemplate, f as renderComponent, g as renderHead, h as renderSlot, m as maybeRenderHead } from '../chunks/astro/server_BxFlCYW6.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Astro$2 = createAstro("https://dev.zachhandley.com");
const $$ClientRouter = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$ClientRouter;
  const { fallback = "animate" } = Astro2.props;
  return renderTemplate`<meta name="astro-view-transitions-enabled" content="true"><meta name="astro-view-transitions-fallback"${addAttribute(fallback, "content")}>${renderScript($$result, "/home/runner/work/ZachHandley/ZachHandley/website/node_modules/.pnpm/astro@5.7.12_@types+node@22.15.17_encoding@0.1.13_jiti@2.4.2_lightningcss@1.29.2_rollup_b1eaed5fee0e3f65992d725b9bd517b1/node_modules/astro/components/ClientRouter.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/runner/work/ZachHandley/ZachHandley/website/node_modules/.pnpm/astro@5.7.12_@types+node@22.15.17_encoding@0.1.13_jiti@2.4.2_lightningcss@1.29.2_rollup_b1eaed5fee0e3f65992d725b9bd517b1/node_modules/astro/components/ClientRouter.astro", void 0);

const $$ClarityInit = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderScript($$result, "/home/runner/work/ZachHandley/ZachHandley/website/src/components/global/ClarityInit.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/runner/work/ZachHandley/ZachHandley/website/src/components/global/ClarityInit.astro", void 0);

const $$Astro$1 = createAstro("https://dev.zachhandley.com");
const $$SiteMetadata = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$SiteMetadata;
  const {
    title,
    description,
    image = "/og-image.jpg",
    noindex = false
  } = Astro2.props;
  const canonicalURL = new URL(Astro2.url.pathname, Astro2.site);
  const siteName = "Socialaize";
  const fullTitle = `${title} - ${siteName}`;
  return renderTemplate`<!-- Essential Meta Tags --><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="generator"${addAttribute(Astro2.generator, "content")}><!-- SEO Meta Tags --><title>${fullTitle}</title><meta name="description"${addAttribute(description, "content")}><link rel="canonical"${addAttribute(canonicalURL, "href")}>${noindex && renderTemplate`<meta name="robots" content="noindex">`}<!-- OpenGraph Meta Tags --><meta property="og:title"${addAttribute(fullTitle, "content")}><meta property="og:description"${addAttribute(description, "content")}><meta property="og:type" content="website"><meta property="og:url"${addAttribute(canonicalURL, "content")}><meta property="og:image"${addAttribute(new URL(image, Astro2.url), "content")}><meta property="og:site_name"${addAttribute(siteName, "content")}><!-- Twitter Meta Tags --><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title"${addAttribute(fullTitle, "content")}><meta name="twitter:description"${addAttribute(description, "content")}><meta name="twitter:image"${addAttribute(new URL(image, Astro2.url), "content")}><!-- Favicon --><link rel="icon" type="image/webp" href="/favicon.webp"><!-- Theme Color --><meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#333333" media="(prefers-color-scheme: dark)"><!-- Client Router for Transitions -->${renderComponent($$result, "ClientRouter", $$ClientRouter, {})}${renderComponent($$result, "ClarityInit", $$ClarityInit, {})}<!-- Themes Handler (light/dark mode) --><!-- <Themes /> -->`;
}, "/home/runner/work/ZachHandley/ZachHandley/website/src/components/global/SiteMetadata.astro", void 0);

const $$Astro = createAstro("https://dev.zachhandley.com");
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title, description } = Astro2.props;
  return renderTemplate`<html lang="en"> <head>${renderComponent($$result, "SiteMetadata", $$SiteMetadata, { "title": title, "description": description })}<title>${title}</title>${renderHead()}</head> <body> ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "/home/runner/work/ZachHandley/ZachHandley/website/src/layouts/Layout.astro", void 0);

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Zach Handley's Site", "description": "Use Steve the dragon to navigate my site" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="w-full min-h-screen min-w-screen relative bg-gray-900"> ${renderComponent($$result2, "LinkApp", null, { "client:only": "svelte", "client:component-hydration": "only", "client:component-path": "~/components/svelte/LinkApp.svelte", "client:component-export": "default" })} </main> ` })}`;
}, "/home/runner/work/ZachHandley/ZachHandley/website/src/pages/index.astro", void 0);

const $$file = "/home/runner/work/ZachHandley/ZachHandley/website/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Index,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
