/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { sharedPublic } from '@picross/shared/vite';
import { pwa } from './scripts/pwaPlugin';
import { scopeByBoard } from './scripts/scopeByBoard';

export default defineConfig({
  // Relative base so the build works from the GitHub Pages project path.
  base: './',
  // The site is built at the repo root, in dist/ (public/3d/ sends Cubed's old /3d/ links on). The
  // manifest (.vite/manifest.json) is for npm run check:budget (#148).
  build: { outDir: '../../dist', emptyOutDir: true, manifest: true },
  // The shared art (packages/shared/public) is served and built beside public/. A build is
  // installable and works offline: manifest.webmanifest and sw.js (scripts/pwa.ts).
  plugins: [sharedPublic(), pwa()],
  // Each game's screen styles apply only on its board (a boss that switches to a block).
  css: { postcss: { plugins: [scopeByBoard()] } },
  test: {
    environment: 'jsdom',
    // Agent worktrees under .claude/ are separate checkouts; don't run their tests.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**', 'e2e/**'],
  },
});
