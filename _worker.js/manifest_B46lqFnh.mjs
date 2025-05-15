globalThis.process ??= {}; globalThis.process.env ??= {};
import { g as decodeKey } from './chunks/astro/server_DVsG1dew.mjs';
import './chunks/astro-designed-error-pages_CaqMnQ7q.mjs';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/noop-middleware_B8qIYW3z.mjs';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///home/runner/work/ZachHandley/ZachHandley/website/","cacheDir":"file:///home/runner/work/ZachHandley/ZachHandley/website/node_modules/.astro/","outDir":"file:///home/runner/work/ZachHandley/ZachHandley/website/dist/","srcDir":"file:///home/runner/work/ZachHandley/ZachHandley/website/src/","publicDir":"file:///home/runner/work/ZachHandley/ZachHandley/website/public/","buildClientDir":"file:///home/runner/work/ZachHandley/ZachHandley/website/dist/","buildServerDir":"file:///home/runner/work/ZachHandley/ZachHandley/website/dist/_worker.js/","adapterName":"@astrojs/cloudflare","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"site":"https://dev.zachhandley.com","base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/home/runner/work/ZachHandley/ZachHandley/website/src/pages/index.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000astro-internal:middleware":"_astro-internal_middleware.mjs","\u0000noop-actions":"_noop-actions.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"index.js","\u0000@astro-renderers":"renderers.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_B46lqFnh.mjs","/home/runner/work/ZachHandley/ZachHandley/website/node_modules/.pnpm/unstorage@1.16.0/node_modules/unstorage/drivers/cloudflare-kv-binding.mjs":"chunks/cloudflare-kv-binding_DMly_2Gl.mjs","~/components/svelte/LinkApp.svelte":"_astro/LinkApp.BKB0nsxf.js","@astrojs/vue/client.js":"_astro/client.BovlPRtL.js","@astrojs/svelte/client.js":"_astro/client.svelte.BTpHLrzd.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/index.zieKSfrm.css","/favicon.svg","/_astro/LinkApp.BKB0nsxf.js","/_astro/client.BovlPRtL.js","/_astro/client.svelte.BTpHLrzd.js","/_astro/snippet.DGwB_Q4A.js","/_worker.js/_@astrojs-ssr-adapter.mjs","/_worker.js/_astro-internal_middleware.mjs","/_worker.js/_noop-actions.mjs","/_worker.js/index.js","/_worker.js/renderers.mjs","/files/Handley_Zach.vcfZone.Identifier","/files/contact.vcf","/files/resume.pdf","/fonts/Inter-Black.ttf","/fonts/Inter-Bold.ttf","/fonts/Inter-ExtraBold.ttf","/fonts/Inter-ExtraBoldItalic.ttf","/fonts/Inter-ExtraLight.ttf","/fonts/Inter-ExtraLightItalic.ttf","/fonts/Inter-Italic.ttf","/fonts/Inter-Light.ttf","/fonts/Inter-LightItalic.ttf","/fonts/Inter-Medium.ttf","/fonts/Inter-MediumItalic.ttf","/fonts/Inter-Regular.ttf","/fonts/Inter-SemiBold.ttf","/fonts/Inter-SemiBoldItalic.ttf","/fonts/Inter-Thin.ttf","/fonts/Inter-ThinItalic.ttf","/fonts/InterSemiBold_Regular.json","/sounds/Fireball.wav","/models/Crate-transformed.glb","/models/Dragon-transformed.glb","/models/Flowers-transformed.glb","/models/Grass-transformed.glb","/models/LargeSquareTowerBricks-transformed.glb","/models/LargeSquareTowerBricks.gltf","/models/Mountain_Group_1-transformed.glb","/models/Mountain_Group_2-transformed.glb","/models/PineTree_1-transformed.glb","/models/PineTree_4-transformed.glb","/models/PointyTower-transformed.glb","/models/Rock_1-transformed.glb","/models/Rock_4-transformed.glb","/models/Skeleton-transformed.glb","/models/TallWallBricks-transformed.glb","/models/TallWallBricks.gltf","/models/Temple_SecondAge_Level3-transformed.glb","/models/WallBricks-transformed.glb","/models/WallBricks.gltf","/models/WallEntranceBricks-transformed.glb","/models/WallEntranceBricks.gltf","/models/WindowSquare-transformed.glb","/models/WindowSquare.gltf","/models/WoodLog_Moss-transformed.glb","/models/fire_animation-transformed.glb","/textures/cloud.png","/textures/flame.webp","/_worker.js/_astro/index.zieKSfrm.css","/_worker.js/chunks/_@astrojs-ssr-adapter_lZjeLPeO.mjs","/_worker.js/chunks/astro-designed-error-pages_CaqMnQ7q.mjs","/_worker.js/chunks/astro_B-t-uQMJ.mjs","/_worker.js/chunks/cloudflare-kv-binding_DMly_2Gl.mjs","/_worker.js/chunks/index_CLbQuTDt.mjs","/_worker.js/chunks/noop-middleware_B8qIYW3z.mjs","/_worker.js/pages/index.astro.mjs","/_worker.js/chunks/astro/server_DVsG1dew.mjs","/index.html","/~partytown/partytown-atomics.js","/~partytown/partytown-media.js","/~partytown/partytown-sw.js","/~partytown/partytown.js"],"buildFormat":"directory","checkOrigin":true,"serverIslandNameMap":[],"key":"AzjjUqlxMTOOG487O1Gf75Jstv42gCLJ2Qw9aYhQttg=","sessionConfig":{"driver":"cloudflare-kv-binding","options":{"binding":"SESSION"}}});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = () => import('./chunks/cloudflare-kv-binding_DMly_2Gl.mjs');

export { manifest };
