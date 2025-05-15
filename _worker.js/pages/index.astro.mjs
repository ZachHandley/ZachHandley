globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createAstro, a as createComponent, b as addAttribute, r as renderHead, d as renderSlot, e as renderTemplate, f as renderComponent, m as maybeRenderHead } from '../chunks/astro/server_B1EJ9TDe.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://dev.zachhandley.com");
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title, description } = Astro2.props;
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="description"${addAttribute(description, "content")}><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><title>${title}</title>${renderHead()}</head> <body> ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "/home/runner/work/ZachHandley/ZachHandley/website/src/layouts/Layout.astro", void 0);

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Zach Handley's Site", "description": "View my interactive link site to see my information" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="w-full min-h-screen min-w-screen relative bg-gray-900"> ${renderComponent($$result2, "LinkApp", null, { "client:only": "svelte", "client:component-hydration": "only", "client:component-path": "~/components/svelte/LinkApp.svelte", "client:component-export": "default" })} </main> ` })}`;
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
