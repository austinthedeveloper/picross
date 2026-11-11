/**
 * The encounters' files (`encounters/*.json`).
 * `import.meta.glob` needs a real relative path, so the globbing is here, beside the
 * folder, one module per folder; each game parses the records.
 */
export const encounterFiles = import.meta.glob<{ default: unknown }>('../encounters/*.json', {
  eager: true,
});
