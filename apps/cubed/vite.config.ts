/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { sharedPublic } from '@picross/shared/vite';

export default defineConfig({
  // Relative base so the build works from the GitHub Pages project path.
  base: './',
  // The shared art (packages/shared/public) is served and built beside public/.
  plugins: [sharedPublic()],
  // three.js is one ~550 kB chunk, loaded only by the play screen.
  build: { chunkSizeWarningLimit: 700 },
  // 5174, so it can run beside the 2D game's dev server on 5173.
  server: { port: 5174 },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**', 'e2e/**'],
  },
});
