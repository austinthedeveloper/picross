import type { Plugin } from 'vite';

/** Writes manifest.webmanifest and sw.js into a build, and titles the page (its decisions are in scripts/pwa.ts). */
export function pwa(): Plugin;
