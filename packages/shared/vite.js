import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The shared art (`public/art/{cast,enemies,gadgets,icons}`), served beside each app's own. */
export const PUBLIC = fileURLToPath(new URL('./public', import.meta.url));

/** @type {Record<string, string>} */
const TYPES = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.json': 'application/json',
};

/** URLs under the shared public dir's top-level folders: `/art/…`. */
const sharedUrl = () => {
  const folders = fs
    .readdirSync(PUBLIC, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  return new RegExp(`^/(${folders.join('|')})/`);
};

/**
 * Makes the package's `public/` part of an app's public dir: the dev server serves its
 * files at the same paths (`art/cast/rook.png`), and a build copies them into the output.
 *
 * Vite has one public dir per app, so CSS that points at a shared file (`url('/art/icons/…')`
 * in art.css) can't be checked at build time. The URL is left alone, then rewritten the way
 * Vite writes public URLs: relative to the CSS file with a relative `base`, else under it.
 */
/** @returns {import('vite').Plugin} */
export function sharedPublic() {
  let outDir = '';
  let base = '/';
  const shared = sharedUrl();
  /** @param {string} url */
  const isShared = (url) => shared.test(url);
  return {
    name: 'picross-shared-public',
    enforce: 'post',
    // An external URL isn't resolved, or warned about, at build time.
    config: () => ({ build: { rollupOptions: { external: [shared] } } }),
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        let url;
        try {
          url = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
        } catch {
          return next();
        }
        const devBase = server.config.base;
        if (devBase !== '/' && url.startsWith(devBase)) url = url.slice(devBase.length - 1);
        if (!isShared(url)) return next();
        const file = path.join(PUBLIC, url);
        if (
          !file.startsWith(PUBLIC + path.sep) ||
          !fs.statSync(file, { throwIfNoEntry: false })?.isFile()
        )
          return next();
        res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        if (req.method === 'HEAD') return res.end();
        fs.createReadStream(file).pipe(res);
      });
    },
    generateBundle(_, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset' || !asset.fileName.endsWith('.css')) continue;
        if (typeof asset.source !== 'string') continue;
        const relative = base === '' || base.startsWith('.');
        const prefix = relative
          ? path.posix.relative(path.posix.dirname(asset.fileName), '') || '.'
          : base.replace(/\/$/, '');
        asset.source = asset.source.replace(/url\((['"]?)(\/[^'")]+)\1\)/g, (match, _quote, url) =>
          isShared(url) ? `url(${prefix}${url})` : match,
        );
      }
    },
    writeBundle() {
      fs.cpSync(PUBLIC, outDir, { recursive: true });
    },
  };
}
