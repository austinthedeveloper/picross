/**
 * Script review: every line in the game as a site of chat pages you can leave
 * notes on, and those notes as a report to act on. See docs/how-to.md.
 *
 *   npx vite-node scripts/script-review.ts serve [--port 4177]  generate and open for review
 *   npx vite-node scripts/script-review.ts build                only generate the site
 *   npx vite-node scripts/script-review.ts notes [--all|--json] print the notes
 *   npx vite-node scripts/script-review.ts resolve <id> [what changed]
 *
 * Add --notes <file> to use a different notes file.
 */
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

if (command === 'serve') {
  const port = Number(takeOption('--port') ?? DEFAULT_PORT);
  writeSite(pages, OUT_DIR);
  startServer({ outDir: OUT_DIR, notesFile, targets, port });
} else if (command === 'build') {
  writeSite(pages, OUT_DIR);
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
} else {
  console.error('Usage: script-review.ts serve|build|notes|resolve (see the top of the file)');
  process.exit(1);
}
