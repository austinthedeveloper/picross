/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { scopeByBoard } from './scripts/scopeByBoard';

export default defineConfig({
  // Relative base so the build works from the GitHub Pages project path.
  base: './',
  // Each game's screen styles apply only on its board (a boss that switches to a block).
  css: { postcss: { plugins: [scopeByBoard()] } },
  test: {
    environment: 'jsdom',
    // Agent worktrees under .claude/ are separate checkouts; don't run their tests.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**', 'e2e/**', 'cubed/**'],
  },
});
