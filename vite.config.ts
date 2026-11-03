/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from the GitHub Pages project path.
  base: './',
  test: {
    environment: 'jsdom',
    // Agent worktrees under .claude/ are separate checkouts; don't run their tests.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
  },
});
