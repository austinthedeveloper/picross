/**
 * Offline play and installing: registers the service worker in a build (updates.ts).
 * `VITE_SW` is set by scripts/pwaPlugin.js, which writes `sw.js` into every build, so
 * `npm run dev` registers none.
 */
import { registerWorker } from './updates';

registerWorker(import.meta.env.VITE_SW === '1');
