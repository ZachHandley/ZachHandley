import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_CYu0UJCJ.mjs';
import { manifest } from './manifest_BPFA_38f.mjs';
let __astrojsSsrVirtualEntry, pageMap;
let __tla = (async ()=>{
    globalThis.process ??= {};
    globalThis.process.env ??= {};
    const serverIslandMap = new Map();
    ;
    const _page0 = ()=>import('./pages/_image.astro.mjs');
    const _page1 = ()=>import('./pages/index.astro.mjs');
    pageMap = new Map([
        [
            "node_modules/.pnpm/astro@5.7.12_@types+node@22.15.17_encoding@0.1.13_jiti@2.4.2_lightningcss@1.29.2_rollup_b1eaed5fee0e3f65992d725b9bd517b1/node_modules/astro/dist/assets/endpoint/generic.js",
            _page0
        ],
        [
            "src/pages/index.astro",
            _page1
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
