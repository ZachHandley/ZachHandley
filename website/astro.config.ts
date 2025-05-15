import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import vue from "@astrojs/vue";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";

import svelte from "@astrojs/svelte";

import tsConfigPaths from "vite-tsconfig-paths";
import topLevelAwait from "vite-plugin-top-level-await";
import removeConsole from "vite-plugin-remove-console";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  site: import.meta.env.DEV
    ? "http://localhost:3000"
    : "https://dev.zachhandley.com",

  server: {
    port: import.meta.env.DEV ? 3000 : 4321,
  },

  vite: {
    plugins: [
      tailwindcss(),
      tsConfigPaths(),
      topLevelAwait({
        // The export name of top-level await promise for each chunk module
        promiseExportName: "__tla",
        // The function to generate import names of top-level await promise in each chunk module
        promiseImportName: (i) => `__tla_${i}`,
      }),
      removeConsole(),
    ],
    esbuild: {
      target: "esnext",
    },
    build: {
      target: "esnext",
    },
  },

  integrations: [
    vue({
      include: "src/components/vue/**/*.vue",
    }),
    partytown(),
    sitemap(),
    svelte({
      include: "**/**.svelte",
    }),
  ],

  adapter: cloudflare({
    imageService: "passthrough",
  }),
});
