/**
 * Puzzles used only by run encounters (`run/*.json`); they're not on the 2D puzzle list.
 * `import.meta.glob` needs a real relative path, so the globbing is here, beside the
 * folder, one module per folder; each game parses the records.
 */
export const runPuzzleFiles = import.meta.glob<{ default: unknown }>('../run/*.json', {
  eager: true,
});
