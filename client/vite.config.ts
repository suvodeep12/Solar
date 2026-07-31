/// <reference types="vitest/config" />
// GitHub Pages project site lives under /Solar/; local dev serves from /
const base = process.env.GH_PAGES ? '/Solar/' : '/';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three') || id.includes('@react-three')) {
            return 'three';
          }
          if (
            id.includes('/node_modules/react') ||
            id.includes('/node_modules/zustand') ||
            id.includes('/node_modules/@tanstack/react-query')
          ) {
            return 'vendor';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
