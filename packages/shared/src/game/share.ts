/**
 * Share codes (#159): a value as JSON in a URL, deflated and base64url-encoded. The code
 * starts with `z` when compressed and `j` when not (where CompressionStream isn't
 * available), so either kind can be read. Both boards' share links use it (each package's
 * `puzzles/share.ts`, which says what goes in), so one format reads everywhere.
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

/** The share code for `value` (anything JSON can hold). */
export async function encodeJson(value: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(value));
  if (typeof CompressionStream === 'undefined') return 'j' + toBase64Url(json);
  return 'z' + toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

/** A share code's value. Throws if the code is broken. */
export async function decodeJson(code: string): Promise<unknown> {
  const body = fromBase64Url(code.slice(1));
  const bytes = code[0] === 'z' ? await pipe(body, new DecompressionStream('deflate-raw')) : body;
  return JSON.parse(new TextDecoder().decode(bytes));
}
