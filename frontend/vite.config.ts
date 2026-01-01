import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    // Polyfill Node.js modules for Beacon SDK / Taquito compatibility
    nodePolyfills({
      include: ['buffer', 'util', 'stream', 'crypto', 'events', 'process', 'path', 'os'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Force proper resolution of these modules
      'stream': 'stream-browserify',
      'buffer': 'buffer',
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  // Optimize deps configuration
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    // Exclude beacon-sdk from optimization to prevent bundling issues
    exclude: ['@airgap/beacon-sdk'],
  },
  define: {
    'process.env': {},
    'global': 'globalThis',
  },
});
