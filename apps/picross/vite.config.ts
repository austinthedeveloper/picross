/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { sharedPublic } from '@picross/shared/vite';
import { scopeByBoard } from './scripts/scopeByBoard';

export default defineConfig({
  // Relative base so the build works from the GitHub Pages project path.
  base: './',
  // The site is built at the repo root: Flat in dist/, Cubed beside it in dist/3d/.
  build: { outDir: '../../dist', emptyOutDir: true },
  // The shared art (packages/shared/public) is served and built beside public/.
  plugins: [sharedPublic()],
  // Each game's screen styles apply only on its board (a boss that switches to a block).
  css: { postcss: { plugins: [scopeByBoard()] } },
  test: {
    environment: 'jsdom',
    // Agent worktrees under .claude/ are separate checkouts; don't run their tests.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**', 'e2e/**'],
  },
});
