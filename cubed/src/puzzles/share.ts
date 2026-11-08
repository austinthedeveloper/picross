import { parsePuzzle, type Puzzle, type PuzzleFile } from './format';

/**
 * Share links: a puzzle file in the URL (`#/p/<code>`), deflated and base64url-encoded.
 * The code starts with `z` when compressed and `j` when not (where CompressionStream
 * isn't available), so either kind can be read.
 */
const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** The share code for a puzzle file. */
export async function encodeShare(file: PuzzleFile): Promise<string> {
  const { id, name, colors, layers, hide } = file;
  const json = new TextEncoder().encode(JSON.stringify({ id, name, colors, layers, hide }));
  if (typeof CompressionStream === 'undefined') return 'j' + toBase64Url(json);
  return 'z' + toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

/** Reads a share code back into a checked puzzle. Throws if it's broken or invalid. */
export async function decodeShare(code: string): Promise<Puzzle> {
  const body = fromBase64Url(code.slice(1));
  const bytes = code[0] === 'z' ? await pipe(body, new DecompressionStream('deflate-raw')) : body;
  const file = JSON.parse(new TextDecoder().decode(bytes)) as PuzzleFile;
  // Shared puzzles get their own id space, so they never collide with the pack's saves.
  return parsePuzzle({ ...file, id: `shared-${String(file.id).slice(0, 40)}` });
}
