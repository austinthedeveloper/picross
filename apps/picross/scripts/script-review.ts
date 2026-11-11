/**
 * Script review: every line in the game as a site of chat pages you can leave
 * notes on, and those notes as a report to act on. See docs/how-to.md.
 *
 *   npx vite-node scripts/script-review.ts serve [--port 4177]  generate and open for review
 *   npx vite-node scripts/script-review.ts build                only generate the site
 *   npx vite-node scripts/script-review.ts notes [--all|--json] print the notes
 *   npx vite-node scripts/script-review.ts resolve <id> [what changed]
 *   npx vite-node scripts/script-review.ts export [all|<chapter number>|<page>] [--out file]
 *   npx vite-node scripts/script-review.ts import <file> [--as name] [--apply] [--force]
 *   npx vite-node scripts/script-review.ts versions
 *   npx vite-node scripts/script-review.ts apply <version> [--force]
 *   npx vite-node scripts/script-review.ts delete-version <version>
 *
 * Add --notes <file> to use a different notes file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildPages, buildTargets } from './script-review/model';
import {
  defaultNotesFile,
  loadNotes,
  locateAll,
  notesReport,
  saveNotes,
} from './script-review/notes';
import { writeSite } from './script-review/render';
import { startServer } from './script-review/server';
import { buildExport } from './script-review/transfer';
import {
  deleteVersion,
  importVersion,
  listVersions,
  loadVersion,
  planApply,
  saveVersion,
  versionPages,
  versionsDir,
  writePlan,
  type Version,
} from './script-review/versions';

const OUT_DIR = 'dist-script-review';
const DEFAULT_PORT = 4177;

const args = process.argv.slice(2);
const takeOption = (name: string) => {
  const at = args.indexOf(name);
  if (at < 0) return undefined;
  return args.splice(at, 2)[1];
};
const takeFlag = (name: string) => {
  const at = args.indexOf(name);
  if (at >= 0) args.splice(at, 1);
  return at >= 0;
};

const notesFile = takeOption('--notes') ?? defaultNotesFile();
const [command, ...rest] = args;
const pages = buildPages();
const targets = buildTargets(pages);
const versionDir = versionsDir(notesFile);
const regenerate = () => writeSite(pages, OUT_DIR, listVersions(versionDir));

/** Writes a version into the game's files, unless it would overwrite newer edits. */
async function applyVersion(version: Version, force: boolean) {
  const plan = await planApply(version, pages);
  if (plan.stale.length && !force) {
    console.error(
      `These were edited after the export, so applying would overwrite that work:\n  ${plan.stale.join('\n  ')}\nAdd --force to apply anyway.`,
    );
    process.exit(1);
  }
  writePlan(plan);
  saveVersion(versionDir, { ...version, appliedAt: new Date().toISOString() });
  console.log(`Applied "${version.name}" to ${plan.writes.length} files:`);
  for (const { file } of plan.writes) console.log(`  ${file}`);
  if (plan.manual.length) {
    console.log('\nThese need changing by hand, because they are not simple strings:');
    for (const { key, file, text } of plan.manual) console.log(`  ${key} (${file})\n    ${text}`);
  }
  console.log('\nCheck the result with `git diff` and `npm test`, then restart the review site.');
}

if (command === 'serve') {
  const port = Number(takeOption('--port') ?? DEFAULT_PORT);
  regenerate();
  startServer({
    outDir: OUT_DIR,
    notesFile,
    targets,
    pages,
    versionsDir: versionDir,
    regenerate,
    port,
  });
} else if (command === 'build') {
  regenerate();
  console.log(`Wrote ${pages.length} pages and ${targets.length} reviewable lines to ${OUT_DIR}/`);
} else if (command === 'notes') {
  const located = locateAll(loadNotes(notesFile), targets);
  const json = takeFlag('--json');
  const all = takeFlag('--all');
  console.log(
    json
      ? JSON.stringify(all ? located : located.filter((n) => !n.resolved), null, 2)
      : notesReport(located, { all }),
  );
} else if (command === 'resolve') {
  const [id, ...message] = rest;
  const notes = loadNotes(notesFile);
  if (!notes.some((n) => n.id === id)) {
    console.error(`No note with id "${id}".`);
    process.exit(1);
  }
  const resolution = message.join(' ');
  saveNotes(
    notesFile,
    notes.map((n) =>
      n.id === id ? { ...n, resolved: true, ...(resolution ? { resolution } : {}) } : n,
    ),
  );
  console.log(`Resolved ${id}.`);
} else if (command === 'export') {
  const out = takeOption('--out');
  const wanted = args.slice(1).find((arg) => !arg.startsWith('--')) ?? 'all';
  const page = pages.find((p) => p.slug === wanted || p.slug.startsWith(`chapter-${wanted}-`));
  if (wanted !== 'all' && !page) {
    console.error(`No page "${wanted}". Pages: all, ${pages.map((p) => p.slug).join(', ')}`);
    process.exit(1);
  }
  const located = locateAll(loadNotes(notesFile), targets);
  const scope = page?.slug ?? 'all';
  const file = out ?? path.join(path.dirname(notesFile), 'exports', `script-${scope}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(buildExport(pages, located, page?.slug), null, 2)}\n`);
  console.log(`Exported ${scope} to ${file}`);
} else if (command === 'import') {
  const force = rest.includes('--force');
  const apply = rest.includes('--apply');
  const asAt = rest.indexOf('--as');
  const name = asAt >= 0 ? rest[asAt + 1] : undefined;
  const file = rest.find((arg, i) => !arg.startsWith('--') && (asAt < 0 || i !== asAt + 1));
  if (!file || !fs.existsSync(file)) {
    console.error(`Can't find the file to import${file ? `: ${file}` : ''}.`);
    process.exit(1);
  }
  const fallback = path.basename(file, path.extname(file));
  const outcome = importVersion(fs.readFileSync(file, 'utf8'), name ?? fallback, pages, versionDir);
  if (outcome.errors) {
    console.error(`Not imported:\n  ${outcome.errors.join('\n  ')}`);
    process.exit(1);
  }
  const { version } = outcome;
  console.log(`Saved version "${version.name}". It hasn't touched the game.`);
  for (const warning of version.warnings) console.log(`  Warning: ${warning}`);
  for (const { page, changed, added, removed } of versionPages(pages, version)) {
    console.log(`  ${page.title}: ${changed} changed, ${added} added, ${removed} cut`);
  }
  if (apply) await applyVersion(version, force);
} else if (command === 'versions') {
  const versions = listVersions(versionDir);
  if (!versions.length) console.log('No saved versions.');
  for (const version of versions) {
    const touched = versionPages(pages, version).map((v) => v.page.title);
    console.log(
      `${version.name}${version.appliedAt ? ' (applied)' : ''}: ${touched.join(', ') || 'nothing left to change'}`,
    );
  }
} else if (command === 'apply') {
  const [name] = rest;
  const version = name ? loadVersion(versionDir, name) : undefined;
  if (!version) {
    console.error(`No version "${name ?? ''}". See: script-review.ts versions`);
    process.exit(1);
  }
  await applyVersion(version, rest.includes('--force'));
} else if (command === 'delete-version') {
  const [name] = rest;
  if (!name || !deleteVersion(versionDir, name)) {
    console.error(`No version "${name ?? ''}".`);
    process.exit(1);
  }
  console.log(`Deleted version "${name}".`);
} else {
  console.error(
    'Usage: script-review.ts serve|build|notes|resolve|export|import|versions|apply|delete-version (see the top of the file)',
  );
  process.exit(1);
}
