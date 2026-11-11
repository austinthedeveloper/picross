/**
 * The jobs' files (`runs/*.json`).
 * `import.meta.glob` needs a real relative path, so the globbing is here, beside the
 * folder, one module per folder; each game parses the records.
 */
export const runFiles: Record<string, { default: unknown }> = import.meta.glob('../runs/*.json', {
  eager: true,
});
