import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_lZjeLPeO.mjs';
import { manifest } from './manifest_B46lqFnh.mjs';
let __astrojsSsrVirtualEntry, pageMap;
let __tla = (async ()=>{
    globalThis.process ??= {};
    globalThis.process.env ??= {};
    const serverIslandMap = new Map();
    ;
    const _page0 = ()=>import('./pages/index.astro.mjs');
    pageMap = new Map([
        [
            "src/pages/index.astro",
            _page0
        ]
    ]);
    const _manifest = Object.assign(manifest, {
        pageMap,
        serverIslandMap,
        renderers,
        actions: ()=>import('./_noop-actions.mjs'),
        middleware: ()=>import('./_astro-internal_middleware.mjs')
    });
    const _args = undefined;
    const _exports = createExports(_manifest);
    __astrojsSsrVirtualEntry = _exports.default;
    const _start = 'start';
    if (_start in serverEntrypointModule) {
        serverEntrypointModule[_start](_manifest, _args);
    }
})();
export { __astrojsSsrVirtualEntry as default, pageMap, __tla };
