/**
 * The Vite plugin that makes the build installable and playable offline (#160). It's
 * JavaScript, like packages/shared/vite.js, because it needs Node's APIs and the app's
 * TypeScript has no Node types; what it decides is in pwa.ts, with tests.
 *
 * - The page's `<title>` is `GAME_NAME` (src/name.ts), in dev and builds.
 * - A build gets `manifest.webmanifest` at its root (`webManifest`), and `sw.js`:
 *   src/offline/worker.ts bundled with the build's file lists (`precacheList`) and a
 *   version, a hash of the files, so an unchanged build is an unchanged worker.
 * - A build gets `import.meta.env.VITE_SW`, so the page registers the worker
 *   (src/offline/register.ts); `npm run dev` has neither.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { GAME_NAME } from '../src/name';
import { precacheList, webManifest } from './pwa';

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const TOKENS = here('../../../packages/shared/src/styles/tokens.css');
const WORKER = here('../src/offline/worker.ts');

/** three.js, in a chunk (Rollup's module ids). */
const isThree = (id) => /[/\\]node_modules[/\\]three[/\\]/.test(id);

/** Every file under `dir`, as paths relative to it with `/`. */
function filesIn(dir) {
  return fs
    .readdirSync(dir, { recursive: true })
    .map((file) => file.split(path.sep).join('/'))
    .filter((file) => fs.statSync(path.join(dir, file)).isFile())
    .sort();
}

/** @returns {import('vite').Plugin} */
export function pwa() {
  let outDir = '';
  let command = 'serve';
  /** Built chunks with three.js in them, which aren't precached. */
  const heavy = new Set();
  return {
    name: 'picross-pwa',
    config: (_, env) =>
      env.command === 'build' ? { define: { 'import.meta.env.VITE_SW': '"1"' } } : undefined,
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      command = config.command;
    },
    transformIndexHtml: () => [
      { tag: 'title', children: GAME_NAME, injectTo: 'head' },
      ...(command === 'build'
        ? [{ tag: 'link', attrs: { rel: 'manifest', href: './manifest.webmanifest' } }]
        : []),
      { tag: 'link', attrs: { rel: 'apple-touch-icon', href: './icons/apple-touch-icon.png' } },
    ],
    generateBundle(_, bundle) {
      heavy.clear();
      for (const out of Object.values(bundle)) {
        if (out.type === 'chunk' && out.moduleIds.some(isThree)) heavy.add(out.fileName);
      }
      if (!heavy.size) this.error("Can't find three.js in any chunk (isThree in pwaPlugin.js).");
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: `${JSON.stringify(webManifest(fs.readFileSync(TOKENS, 'utf8')), null, 2)}\n`,
      });
    },
    // After every plugin has written its files: the shared art is copied in writeBundle.
    async closeBundle() {
      if (command !== 'build') return;
      const manifest = JSON.parse(fs.readFileSync(path.join(outDir, '.vite/manifest.json')));
      const lists = precacheList(filesIn(outDir), manifest, (file) => heavy.has(file));
      const hash = createHash('sha256');
      for (const file of lists.precache) {
        hash.update(`${file}\0`).update(fs.readFileSync(path.join(outDir, file)));
      }
      for (const file of lists.assets) hash.update(`${file}\0`);
      const info = { version: hash.digest('hex').slice(0, 12), ...lists };
      const out = await build({
        configFile: false,
        logLevel: 'warn',
        publicDir: false,
        define: { __PICROSS_BUILD__: JSON.stringify(info) },
        build: {
          write: false,
          emptyOutDir: false,
          minify: true,
          lib: { entry: WORKER, formats: ['iife'], name: 'picrossWorker', fileName: () => 'sw.js' },
        },
      });
      const [chunk] = (Array.isArray(out) ? out[0] : out).output;
      fs.writeFileSync(path.join(outDir, 'sw.js'), chunk.code);
    },
  };
}
