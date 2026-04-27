import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: false,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'echarts-vendor': ['echarts', 'vue-echarts'],
          'appwrite-vendor': ['appwrite'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'echarts', 'vue-echarts', 'appwrite', 'zod'],
  },
});
