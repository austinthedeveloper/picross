/**
 * The chapters' files (`chapters/*.json`).
 * `import.meta.glob` needs a real relative path, so the globbing is here, beside the
 * folder, one module per folder; each game parses the records.
 */
export const chapterFiles = import.meta.glob<{ default: unknown }>('../chapters/*.json', {
  eager: true,
});
