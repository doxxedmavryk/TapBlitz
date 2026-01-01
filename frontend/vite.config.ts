import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    // Polyfill Node.js modules for Beacon SDK / Taquito compatibility
    nodePolyfills({
      include: ['buffer', 'util', 'stream', 'crypto', 'events', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
  },
  // Optimize deps to include Beacon SDK
  optimizeDeps: {
    include: ['@airgap/beacon-sdk', '@taquito/taquito', '@taquito/beacon-wallet'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
});
