/** Reads a JSON object from localStorage, falling back when it is missing or unreadable. */
export function readStore<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); progress just won't persist.
  }
}
