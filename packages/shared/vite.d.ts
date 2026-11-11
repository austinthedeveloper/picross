import type { Plugin } from 'vite';

/** The package's public dir (the shared art). */
export const PUBLIC: string;

/** Serves the package's public dir in dev and copies it into the build output. */
export function sharedPublic(): Plugin;
