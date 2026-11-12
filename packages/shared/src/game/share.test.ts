// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { decodeJson, encodeJson } from './share';

describe('share codes (#159)', () => {
  it('round-trips a value, compressed', async () => {
    const value = { id: 'mug', rows: ['#.#', '.#.'], n: 3 };
    const code = await encodeJson(value);
    expect(code[0]).toBe('z');
    expect(code).toMatch(/^[\w-]+$/);
    expect(await decodeJson(code)).toEqual(value);
  });

  it('reads an uncompressed code too, where CompressionStream is missing', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    const code = await encodeJson({ a: 1 });
    vi.unstubAllGlobals();
    expect(code[0]).toBe('j');
    expect(await decodeJson(code)).toEqual({ a: 1 });
  });

  it('throws on a broken code', async () => {
    await expect(decodeJson('z!!!')).rejects.toThrow();
  });
});
