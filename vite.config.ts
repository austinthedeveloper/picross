/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from the GitHub Pages project path.
  base: './',
  test: {
    environment: 'jsdom',
  },
});
