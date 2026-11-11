/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from the GitHub Pages project path.
  base: './',
  // three.js is one ~550 kB chunk, loaded only by the play screen.
  build: { chunkSizeWarningLimit: 700 },
  // 5174, so it can run beside the 2D game's dev server on 5173.
  server: { port: 5174 },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**', 'e2e/**'],
  },
});
