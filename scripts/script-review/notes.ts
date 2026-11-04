/**
 * Review notes: where they're kept, and how they find their line again after the
 * script has been edited.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { sourceFile, type Target } from './model';

export const TAGS = ['change', 'question', 'like'] as const;
export type Tag = (typeof TAGS)[number];

const TAG_LABELS: Record<Tag, string> = { change: 'Change', question: 'Question', like: 'Love it' };

export interface Note {
  id: string;
  key: string;
  /** The line as it read when the note was written. */
  text: string;
  speaker?: string;
  tag: Tag;
  body: string;
  createdAt: string;
  resolved?: boolean;
  /** What was done about it, shown under the note. */
  resolution?: string;
}

/**
 * - current: the line reads as it did when the note was written.
 * - changed: the line has been reworded since.
 * - removed: the line is gone.
 */
export type NoteStatus = 'current' | 'changed' | 'removed';

export interface LocatedNote extends Note {
  status: NoteStatus;
  /** Set unless the line was removed. `key` is updated to where the line is now. */
  currentText?: string;
  page?: string;
  pageTitle?: string;
  section?: string;
  source?: string;
}

/**
 * Finds where a note belongs now. Lines are numbered by position, so adding a
 * line renumbers the ones after it: the exact wording within the same scene is
 * trusted over the position.
 */
export function locate(note: Note, targets: Target[]): LocatedNote {
  const owner = (key: string) => key.split('/').slice(0, 2).join('/');
  const atKey = targets.find((t) => t.key === note.key);
  const sameText =
    atKey?.text === note.text
      ? atKey
      : targets.find((t) => owner(t.key) === owner(note.key) && t.text === note.text);
  const target = sameText ?? atKey;
  if (!target) return { ...note, status: 'removed' };
  return {
    ...note,
    key: target.key,
    status: sameText ? 'current' : 'changed',
    currentText: target.text,
    page: target.page,
    pageTitle: target.pageTitle,
    section: target.section,
    source: sourceFile(target.key),
  };
}

export const locateAll = (notes: Note[], targets: Target[]) => {
  const order = new Map(targets.map((t, i) => [t.key, i]));
  return notes
    .map((note) => locate(note, targets))
    .sort(
      (a, b) =>
        (order.get(a.key) ?? Infinity) - (order.get(b.key) ?? Infinity) ||
        a.createdAt.localeCompare(b.createdAt),
    );
};

/**
 * The notes file. It lives in the main checkout even when run from a worktree:
 * worktrees get cleaned up, and any session should be able to read the same notes.
 */
export function defaultNotesFile(): string {
  let root = process.cwd();
  try {
    const gitDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'])
      .toString()
      .trim();
    root = path.dirname(gitDir);
  } catch {
    // Not a git checkout: keep them next to wherever this was run.
  }
  return path.join(root, '.script-review', 'notes.json');
}

export function loadNotes(file: string): Note[] {
  if (!fs.existsSync(file)) return [];
  return (JSON.parse(fs.readFileSync(file, 'utf8')) as { notes: Note[] }).notes;
}

export function saveNotes(file: string, notes: Note[]) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify({ notes }, null, 2)}\n`);
  fs.renameSync(temp, file);
}

export interface NoteInput {
  key?: unknown;
  tag?: unknown;
  body?: unknown;
  resolved?: unknown;
}

/** A love-it can stand alone; anything else needs words to act on. */
function checkContent(tag: unknown, body: unknown): string | null {
  if (!TAGS.includes(tag as Tag)) return `tag must be one of ${TAGS.join(', ')}`;
  if (typeof body !== 'string') return 'body must be text';
  if (tag !== 'like' && !body.trim()) return 'Add some text, or pick Love it.';
  return null;
}

/** Applies a request from the site to the notes. Returns the new notes or what's wrong. */
export function addNote(notes: Note[], input: NoteInput, targets: Target[]): Note[] | string {
  const target = targets.find((t) => t.key === input.key);
  if (!target) return `unknown key "${String(input.key)}"`;
  const problem = checkContent(input.tag, input.body);
  if (problem) return problem;
  return [
    ...notes,
    {
      id: randomUUID().slice(0, 8),
      key: target.key,
      text: target.text,
      ...(target.speaker ? { speaker: target.speaker } : {}),
      tag: input.tag as Tag,
      body: (input.body as string).trim(),
      createdAt: new Date().toISOString(),
    },
  ];
}

export function updateNote(notes: Note[], id: string, input: NoteInput): Note[] | string {
  const note = notes.find((n) => n.id === id);
  if (!note) return `unknown note "${id}"`;
  const tag = input.tag ?? note.tag;
  const body = input.body ?? note.body;
  const problem = checkContent(tag, body);
  if (problem) return problem;
  if (input.resolved !== undefined && typeof input.resolved !== 'boolean') {
    return 'resolved must be true or false';
  }
  const updated: Note = { ...note, tag: tag as Tag, body: (body as string).trim() };
  if (input.resolved === true) updated.resolved = true;
  if (input.resolved === false) {
    delete updated.resolved;
    delete updated.resolution;
  }
  return notes.map((n) => (n.id === id ? updated : n));
}

function countBy(notes: LocatedNote[], label: (note: LocatedNote) => string | undefined) {
  const counts = new Map<string, number>();
  for (const note of notes) {
    const name = label(note);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} ${count}`)
    .join(' · ');
}

/** The notes as Markdown: what Claude reads to act on a review. */
export function notesReport(notes: LocatedNote[], { all = false } = {}): string {
  const open = notes.filter((n) => !n.resolved);
  const shown = all ? notes : open;
  const out = [
    '# Script review notes',
    '',
    `${open.length} open, ${notes.length - open.length} resolved.`,
  ];
  if (!shown.length) return [...out, '', 'Nothing to show.'].join('\n');
  out.push(`By kind: ${countBy(shown, (n) => TAG_LABELS[n.tag])}`);
  const speakers = countBy(shown, (n) => n.speaker);
  if (speakers) out.push(`By speaker: ${speakers}`);

  let page: string | undefined;
  for (const note of shown) {
    const pageTitle = note.pageTitle ?? 'Lines that no longer exist';
    if (pageTitle !== page) {
      page = pageTitle;
      out.push('', `## ${page}`);
    }
    out.push(
      '',
      `### [${TAG_LABELS[note.tag]}] ${note.speaker ?? note.section ?? note.key} (${note.id})`,
    );
    out.push(`> ${note.text}`);
    if (note.status === 'changed') out.push(`Now reads: ${note.currentText}`);
    if (note.status === 'removed') out.push('This line has since been removed.');
    if (note.body) out.push('', note.body);
    if (note.resolved) out.push('', `Resolved${note.resolution ? `: ${note.resolution}` : '.'}`);
    out.push('', `Where: ${[note.source, note.key].filter(Boolean).join(' · ')}`);
  }
  return out.join('\n');
}
