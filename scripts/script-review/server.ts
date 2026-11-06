/** Serves the review site and saves notes. Local only: it binds to this machine. */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import type { Page, Target } from './model';
import { addNote, loadNotes, locateAll, saveNotes, updateNote, type Note } from './notes';
import { buildExport } from './transfer';
import { deleteVersion, importVersion, replaceScript } from './versions';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
};

const MAX_BODY = 64 * 1024;
/** A rewrite of the whole game comes back through here. */
const MAX_IMPORT = 8 * 1024 * 1024;

function readJson(req: http.IncomingMessage, limit = MAX_BODY): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > limit) reject(new Error('That is too long.'));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        reject(new Error('Expected JSON.'));
      }
    });
    req.on('error', reject);
  });
}

export function startServer(options: {
  outDir: string;
  notesFile: string;
  targets: Target[];
  pages: Page[];
  versionsDir: string;
  /** Rewrites the site after a version is added or removed. */
  regenerate: () => void;
  /** Starts over on the new script, once the game's files have been replaced. */
  restart: () => void;
  port: number;
}) {
  const { outDir, notesFile, targets, pages, versionsDir, regenerate, restart, port } = options;
  const root = path.resolve(outDir);

  const respond = (res: http.ServerResponse, status: number, data: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  const respondNotes = (res: http.ServerResponse, status = 200) =>
    respond(res, status, { notes: locateAll(loadNotes(notesFile), targets) });

  /** Saves the result of a change, or reports why it was refused. */
  const apply = (res: http.ServerResponse, result: Note[] | string, status = 200) => {
    if (typeof result === 'string') return respond(res, 400, { error: result });
    saveNotes(notesFile, result);
    respondNotes(res, status);
  };

  const api = async (req: http.IncomingMessage, res: http.ServerResponse, url: URL) => {
    const id = url.pathname.split('/')[3];
    if (req.method === 'GET' && !id) return respondNotes(res);
    // A JSON content type can't be sent cross-site without permission, which this
    // server never grants, so other pages can't write notes.
    if (!req.headers['content-type']?.startsWith('application/json')) {
      return respond(res, 415, { error: 'Expected JSON.' });
    }
    const input = await readJson(req);
    const notes = loadNotes(notesFile);
    if (req.method === 'POST' && !id) return apply(res, addNote(notes, input, targets), 201);
    if (req.method === 'PATCH' && id) return apply(res, updateNote(notes, id, input));
    if (req.method === 'DELETE' && id) {
      const left = notes.filter((n) => n.id !== id);
      return apply(res, left.length < notes.length ? left : `unknown note "${id}"`);
    }
    respond(res, 405, { error: 'Not allowed.' });
  };

  const exportScript = (res: http.ServerResponse, url: URL) => {
    const scope = url.searchParams.get('page') ?? 'all';
    if (scope !== 'all' && !pages.some((page) => page.slug === scope)) {
      return respond(res, 404, { error: `Unknown page "${scope}".` });
    }
    const notes = locateAll(loadNotes(notesFile), targets);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="script-${scope}.json"`,
    });
    res.end(
      `${JSON.stringify(buildExport(pages, notes, scope === 'all' ? undefined : scope), null, 2)}\n`,
    );
  };

  const versionsApi = async (req: http.IncomingMessage, res: http.ServerResponse, url: URL) => {
    if (!req.headers['content-type']?.startsWith('application/json')) {
      return respond(res, 415, { error: 'Expected JSON.' });
    }
    const name = url.pathname.split('/')[3];
    if (req.method === 'POST' && !name) {
      const input = await readJson(req, MAX_IMPORT);
      const outcome = importVersion(
        String(input.document ?? ''),
        String(input.name ?? ''),
        pages,
        versionsDir,
      );
      if (outcome.errors) return respond(res, 400, { errors: outcome.errors });
      regenerate();
      return respond(res, 201, { name: outcome.version.name });
    }
    if (req.method === 'DELETE' && name) {
      if (!deleteVersion(versionsDir, decodeURIComponent(name))) {
        return respond(res, 404, { error: 'No such version.' });
      }
      regenerate();
      return respond(res, 200, {});
    }
    respond(res, 405, { error: 'Not allowed.' });
  };

  const replaceApi = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    if (req.method !== 'POST') return respond(res, 405, { error: 'Not allowed.' });
    if (!req.headers['content-type']?.startsWith('application/json')) {
      return respond(res, 415, { error: 'Expected JSON.' });
    }
    const input = await readJson(req, MAX_IMPORT);
    const outcome = await replaceScript(String(input.document ?? ''), pages);
    if (outcome.errors) return respond(res, 400, { errors: outcome.errors });
    res.on('finish', restart);
    respond(res, 200, outcome);
  };

  /** The file a URL path asks for, or null if it's malformed or outside the site. */
  const filePath = (pathname: string) => {
    try {
      const wanted = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
      const file = path.join(root, wanted);
      return file.startsWith(root + path.sep) ? file : null;
    } catch {
      return null;
    }
  };

  const serveFile = (url: URL, res: http.ServerResponse) => {
    const file = filePath(url.pathname);
    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/api/export' && req.method === 'GET') return exportScript(res, url);
    if (url.pathname.startsWith('/api/versions')) {
      versionsApi(req, res, url).catch((error: Error) =>
        respond(res, 400, { errors: [error.message] }),
      );
      return;
    }
    if (url.pathname === '/api/replace') {
      replaceApi(req, res).catch((error: Error) => respond(res, 400, { errors: [error.message] }));
      return;
    }
    if (!url.pathname.startsWith('/api/notes')) return serveFile(url, res);
    api(req, res, url).catch((error: Error) => respond(res, 400, { error: error.message }));
  });
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code !== 'EADDRINUSE') throw error;
    console.error(`Port ${port} is taken. Is another review running? Try --port <number>.`);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Script review: http://localhost:${port}`);
    console.log(`Notes save to: ${notesFile}`);
  });
  return server;
}
