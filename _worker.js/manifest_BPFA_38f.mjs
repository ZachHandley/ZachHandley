globalThis.process ??= {}; globalThis.process.env ??= {};
import { g as decodeKey } from './chunks/astro/server_B1EJ9TDe.mjs';
import './chunks/astro-designed-error-pages_DfKsqSGN.mjs';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/noop-middleware_tsnYgP7K.mjs';

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

const manifest = deserializeManifest({"hrefRoot":"file:///home/runner/work/ZachHandley/ZachHandley/website/","cacheDir":"file:///home/runner/work/ZachHandley/ZachHandley/website/node_modules/.astro/","outDir":"file:///home/runner/work/ZachHandley/ZachHandley/website/dist/","srcDir":"file:///home/runner/work/ZachHandley/ZachHandley/website/src/","publicDir":"file:///home/runner/work/ZachHandley/ZachHandley/website/public/","buildClientDir":"file:///home/runner/work/ZachHandley/ZachHandley/website/dist/","buildServerDir":"file:///home/runner/work/ZachHandley/ZachHandley/website/dist/_worker.js/","adapterName":"@astrojs/cloudflare","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"stage":"head-inline","children":"!(function(w,p,f,c){if(!window.crossOriginIsolated && !navigator.serviceWorker) return;c=w[p]=Object.assign(w[p]||{},{\"lib\":\"/~partytown/\",\"debug\":false});c[f]=(c[f]||[])})(window,'partytown','forward');/* Partytown 0.11.0 - MIT QwikDev */\nconst t={preserveBehavior:!1},e=e=>{if(\"string\"==typeof e)return[e,t];const[n,r=t]=e;return[n,{...t,...r}]},n=Object.freeze((t=>{const e=new Set;let n=[];do{Object.getOwnPropertyNames(n).forEach((t=>{\"function\"==typeof n[t]&&e.add(t)}))}while((n=Object.getPrototypeOf(n))!==Object.prototype);return Array.from(e)})());!function(t,r,o,i,a,s,c,l,d,p,u=t,f){function h(){f||(f=1,\"/\"==(c=(s.lib||\"/~partytown/\")+(s.debug?\"debug/\":\"\"))[0]&&(d=r.querySelectorAll('script[type=\"text/partytown\"]'),i!=t?i.dispatchEvent(new CustomEvent(\"pt1\",{detail:t})):(l=setTimeout(v,(null==s?void 0:s.fallbackTimeout)||1e4),r.addEventListener(\"pt0\",w),a?y(1):o.serviceWorker?o.serviceWorker.register(c+(s.swPath||\"partytown-sw.js\"),{scope:c}).then((function(t){t.active?y():t.installing&&t.installing.addEventListener(\"statechange\",(function(t){\"activated\"==t.target.state&&y()}))}),console.error):v())))}function y(e){p=r.createElement(e?\"script\":\"iframe\"),t._pttab=Date.now(),e||(p.style.display=\"block\",p.style.width=\"0\",p.style.height=\"0\",p.style.border=\"0\",p.style.visibility=\"hidden\",p.setAttribute(\"aria-hidden\",!0)),p.src=c+\"partytown-\"+(e?\"atomics.js?v=0.11.0\":\"sandbox-sw.html?\"+t._pttab),r.querySelector(s.sandboxParent||\"body\").appendChild(p)}function v(n,o){for(w(),i==t&&(s.forward||[]).map((function(n){const[r]=e(n);delete t[r.split(\".\")[0]]})),n=0;n<d.length;n++)(o=r.createElement(\"script\")).innerHTML=d[n].innerHTML,o.nonce=s.nonce,r.head.appendChild(o);p&&p.parentNode.removeChild(p)}function w(){clearTimeout(l)}s=t.partytown||{},i==t&&(s.forward||[]).map((function(r){const[o,{preserveBehavior:i}]=e(r);u=t,o.split(\".\").map((function(e,r,o){var a;u=u[o[r]]=r+1<o.length?u[o[r]]||(a=o[r+1],n.includes(a)?[]:{}):(()=>{let e=null;if(i){const{methodOrProperty:n,thisObject:r}=((t,e)=>{let n=t;for(let t=0;t<e.length-1;t+=1)n=n[e[t]];return{thisObject:n,methodOrProperty:e.length>0?n[e[e.length-1]]:void 0}})(t,o);\"function\"==typeof n&&(e=(...t)=>n.apply(r,...t))}return function(){let n;return e&&(n=e(arguments)),(t._ptf=t._ptf||[]).push(o,arguments),n}})()}))})),\"complete\"==r.readyState?h():(t.addEventListener(\"DOMContentLoaded\",h),t.addEventListener(\"load\",h))}(window,document,navigator,top,window.crossOriginIsolated);;(e=>{e.addEventListener(\"astro:before-swap\",e=>{let r=document.body.querySelector(\"iframe[src*='/~partytown/']\");if(r)e.newDocument.body.append(r)})})(document);"}],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/.pnpm/astro@5.7.12_@types+node@22.15.17_encoding@0.1.13_jiti@2.4.2_lightningcss@1.29.2_rollup_b1eaed5fee0e3f65992d725b9bd517b1/node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"stage":"head-inline","children":"!(function(w,p,f,c){if(!window.crossOriginIsolated && !navigator.serviceWorker) return;c=w[p]=Object.assign(w[p]||{},{\"lib\":\"/~partytown/\",\"debug\":false});c[f]=(c[f]||[])})(window,'partytown','forward');/* Partytown 0.11.0 - MIT QwikDev */\nconst t={preserveBehavior:!1},e=e=>{if(\"string\"==typeof e)return[e,t];const[n,r=t]=e;return[n,{...t,...r}]},n=Object.freeze((t=>{const e=new Set;let n=[];do{Object.getOwnPropertyNames(n).forEach((t=>{\"function\"==typeof n[t]&&e.add(t)}))}while((n=Object.getPrototypeOf(n))!==Object.prototype);return Array.from(e)})());!function(t,r,o,i,a,s,c,l,d,p,u=t,f){function h(){f||(f=1,\"/\"==(c=(s.lib||\"/~partytown/\")+(s.debug?\"debug/\":\"\"))[0]&&(d=r.querySelectorAll('script[type=\"text/partytown\"]'),i!=t?i.dispatchEvent(new CustomEvent(\"pt1\",{detail:t})):(l=setTimeout(v,(null==s?void 0:s.fallbackTimeout)||1e4),r.addEventListener(\"pt0\",w),a?y(1):o.serviceWorker?o.serviceWorker.register(c+(s.swPath||\"partytown-sw.js\"),{scope:c}).then((function(t){t.active?y():t.installing&&t.installing.addEventListener(\"statechange\",(function(t){\"activated\"==t.target.state&&y()}))}),console.error):v())))}function y(e){p=r.createElement(e?\"script\":\"iframe\"),t._pttab=Date.now(),e||(p.style.display=\"block\",p.style.width=\"0\",p.style.height=\"0\",p.style.border=\"0\",p.style.visibility=\"hidden\",p.setAttribute(\"aria-hidden\",!0)),p.src=c+\"partytown-\"+(e?\"atomics.js?v=0.11.0\":\"sandbox-sw.html?\"+t._pttab),r.querySelector(s.sandboxParent||\"body\").appendChild(p)}function v(n,o){for(w(),i==t&&(s.forward||[]).map((function(n){const[r]=e(n);delete t[r.split(\".\")[0]]})),n=0;n<d.length;n++)(o=r.createElement(\"script\")).innerHTML=d[n].innerHTML,o.nonce=s.nonce,r.head.appendChild(o);p&&p.parentNode.removeChild(p)}function w(){clearTimeout(l)}s=t.partytown||{},i==t&&(s.forward||[]).map((function(r){const[o,{preserveBehavior:i}]=e(r);u=t,o.split(\".\").map((function(e,r,o){var a;u=u[o[r]]=r+1<o.length?u[o[r]]||(a=o[r+1],n.includes(a)?[]:{}):(()=>{let e=null;if(i){const{methodOrProperty:n,thisObject:r}=((t,e)=>{let n=t;for(let t=0;t<e.length-1;t+=1)n=n[e[t]];return{thisObject:n,methodOrProperty:e.length>0?n[e[e.length-1]]:void 0}})(t,o);\"function\"==typeof n&&(e=(...t)=>n.apply(r,...t))}return function(){let n;return e&&(n=e(arguments)),(t._ptf=t._ptf||[]).push(o,arguments),n}})()}))})),\"complete\"==r.readyState?h():(t.addEventListener(\"DOMContentLoaded\",h),t.addEventListener(\"load\",h))}(window,document,navigator,top,window.crossOriginIsolated);;(e=>{e.addEventListener(\"astro:before-swap\",e=>{let r=document.body.querySelector(\"iframe[src*='/~partytown/']\");if(r)e.newDocument.body.append(r)})})(document);"}],"styles":[{"type":"external","src":"/_astro/index.zieKSfrm.css"},{"type":"inline","content":"div.svelte-1osucwe{position:relative;width:100%;height:100%}canvas.svelte-1osucwe{display:block;position:relative;width:100%;height:100%}.icon-container svg{width:100%!important;height:100%!important;fill:currentColor!important}.icon-container{display:flex!important;align-items:center!important;justify-content:center!important}body{overflow:hidden;margin:0;padding:0}.text-shadow-lg.svelte-12blglt{text-shadow:0 2px 8px rgba(0,0,0,.7)}.sr-only.svelte-12blglt{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}.focus\\:not-sr-only.svelte-12blglt:focus{position:absolute;width:auto;height:auto;padding:.5rem;margin:0;overflow:visible;clip:auto;white-space:normal}\n"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"site":"https://dev.zachhandley.com","base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/home/runner/work/ZachHandley/ZachHandley/website/src/pages/index.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-actions":"_noop-actions.mjs","\u0000astro-internal:middleware":"_astro-internal_middleware.mjs","\u0000@astrojs-ssr-virtual-entry":"index.js","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astro-page:node_modules/.pnpm/astro@5.7.12_@types+node@22.15.17_encoding@0.1.13_jiti@2.4.2_lightningcss@1.29.2_rollup_b1eaed5fee0e3f65992d725b9bd517b1/node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","/home/runner/work/ZachHandley/ZachHandley/website/node_modules/.pnpm/astro@5.7.12_@types+node@22.15.17_encoding@0.1.13_jiti@2.4.2_lightningcss@1.29.2_rollup_b1eaed5fee0e3f65992d725b9bd517b1/node_modules/astro/dist/assets/services/noop.js":"chunks/noop_CrXY9vtL.mjs","/home/runner/work/ZachHandley/ZachHandley/website/node_modules/.pnpm/unstorage@1.16.0/node_modules/unstorage/drivers/cloudflare-kv-binding.mjs":"chunks/cloudflare-kv-binding_DMly_2Gl.mjs","\u0000@astrojs-manifest":"manifest_BPFA_38f.mjs","~/components/svelte/LinkApp.svelte":"_astro/LinkApp.BKB0nsxf.js","@astrojs/vue/client.js":"_astro/client.BovlPRtL.js","@astrojs/svelte/client.js":"_astro/client.svelte.BTpHLrzd.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/index.zieKSfrm.css","/favicon.svg","/_astro/LinkApp.BKB0nsxf.js","/_astro/client.BovlPRtL.js","/_astro/client.svelte.BTpHLrzd.js","/_astro/snippet.DGwB_Q4A.js","/_worker.js/_@astrojs-ssr-adapter.mjs","/_worker.js/_astro-internal_middleware.mjs","/_worker.js/_noop-actions.mjs","/_worker.js/index.js","/_worker.js/renderers.mjs","/files/Handley_Zach.vcfZone.Identifier","/files/contact.vcf","/files/resume.pdf","/sounds/Fireball.wav","/fonts/Inter-Black.ttf","/fonts/Inter-Bold.ttf","/fonts/Inter-ExtraBold.ttf","/fonts/Inter-ExtraBoldItalic.ttf","/fonts/Inter-ExtraLight.ttf","/fonts/Inter-ExtraLightItalic.ttf","/fonts/Inter-Italic.ttf","/fonts/Inter-Light.ttf","/fonts/Inter-LightItalic.ttf","/fonts/Inter-Medium.ttf","/fonts/Inter-MediumItalic.ttf","/fonts/Inter-Regular.ttf","/fonts/Inter-SemiBold.ttf","/fonts/Inter-SemiBoldItalic.ttf","/fonts/Inter-Thin.ttf","/fonts/Inter-ThinItalic.ttf","/fonts/InterSemiBold_Regular.json","/models/Crate-transformed.glb","/models/Dragon-transformed.glb","/models/Flowers-transformed.glb","/models/Grass-transformed.glb","/models/LargeSquareTowerBricks-transformed.glb","/models/LargeSquareTowerBricks.gltf","/models/Mountain_Group_1-transformed.glb","/models/Mountain_Group_2-transformed.glb","/models/PineTree_1-transformed.glb","/models/PineTree_4-transformed.glb","/models/PointyTower-transformed.glb","/models/Rock_1-transformed.glb","/models/Rock_4-transformed.glb","/models/Skeleton-transformed.glb","/models/TallWallBricks-transformed.glb","/models/TallWallBricks.gltf","/models/Temple_SecondAge_Level3-transformed.glb","/models/WallBricks-transformed.glb","/models/WallBricks.gltf","/models/WallEntranceBricks-transformed.glb","/models/WallEntranceBricks.gltf","/models/WindowSquare-transformed.glb","/models/WindowSquare.gltf","/models/WoodLog_Moss-transformed.glb","/models/fire_animation-transformed.glb","/textures/cloud.png","/textures/flame.webp","/_worker.js/_astro/index.zieKSfrm.css","/_worker.js/chunks/_@astrojs-ssr-adapter_CYu0UJCJ.mjs","/_worker.js/chunks/astro-designed-error-pages_DfKsqSGN.mjs","/_worker.js/chunks/astro_CcJLB1ba.mjs","/_worker.js/chunks/cloudflare-kv-binding_DMly_2Gl.mjs","/_worker.js/chunks/generic_D6ZEQbnC.mjs","/_worker.js/chunks/index_JpnttGUH.mjs","/_worker.js/chunks/internal_DPJyyAwZ.mjs","/_worker.js/chunks/noop-middleware_tsnYgP7K.mjs","/_worker.js/chunks/noop_CrXY9vtL.mjs","/_worker.js/pages/_image.astro.mjs","/_worker.js/pages/index.astro.mjs","/_worker.js/chunks/astro/server_B1EJ9TDe.mjs","/~partytown/partytown-atomics.js","/~partytown/partytown-media.js","/~partytown/partytown-sw.js","/~partytown/partytown.js"],"buildFormat":"directory","checkOrigin":true,"serverIslandNameMap":[],"key":"RxAhwlxm+7HUW1kwEnbBlZrkMVnRTRbg/Z7HV2XlYEI=","sessionConfig":{"driver":"cloudflare-kv-binding","options":{"binding":"SESSION"}}});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = () => import('./chunks/cloudflare-kv-binding_DMly_2Gl.mjs');

export { manifest };
