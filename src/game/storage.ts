const KEY = 'picross:v1';

/** Reads a JSON value from localStorage, falling back when it is missing or unreadable. */
export function readStore<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore(value: unknown): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); progress just won't persist.
  }
}
