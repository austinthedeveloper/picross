/**
 * Saved rewrites. A version sits beside the script without touching it, so it can be
 * read and compared on the site, then applied to the game's files if it's a keeper.
 */
import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';
import { sceneEntries, sourceFile, isItem, type Entry, type Page, type Section } from './model';
import { currentBase, readImport, type Changes } from './transfer';

export interface Version extends Changes {
  name: string;
  createdAt: string;
  appliedAt?: string;
  warnings: string[];
}

export const versionsDir = (notesFile: string) => path.join(path.dirname(notesFile), 'versions');

export const slugifyName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

const versionFile = (dir: string, name: string) => path.join(dir, `${slugifyName(name)}.json`);

export function loadVersion(dir: string, name: string): Version | undefined {
  const file = versionFile(dir, name);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Version) : undefined;
}

export function listVersions(dir: string): Version[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as Version)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveVersion(dir: string, version: Version) {
  fs.mkdirSync(dir, { recursive: true });
  const file = versionFile(dir, version.name);
  fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(version, null, 2)}\n`);
  fs.renameSync(`${file}.tmp`, file);
}

export function deleteVersion(dir: string, name: string): boolean {
  const file = versionFile(dir, name);
  if (!fs.existsSync(file)) return false;
  fs.rmSync(file);
  return true;
}

export type ImportOutcome =
  { version: Version; errors?: undefined } | { errors: string[]; version?: undefined };

/** Checks a rewrite and saves what it changes as a named version. */
export function importVersion(
  raw: string,
  rawName: string,
  pages: Page[],
  dir: string,
): ImportOutcome {
  const name = slugifyName(rawName);
  if (!name) return { errors: ['Give this version a name with some letters or numbers in it.'] };
  if (loadVersion(dir, name)) {
    return { errors: [`There's already a version called "${name}". Pick another name.`] };
  }
  const { changes, errors, warnings } = readImport(raw, pages);
  if (errors.length) return { errors };
  if (!Object.keys(changes.bases).length) {
    return { errors: ["Nothing in this file differs from the game's current script."] };
  }
  const version: Version = { name, createdAt: new Date().toISOString(), ...changes, warnings };
  saveVersion(dir, version);
  return { version };
}

export type ReplaceOutcome =
  | { files: string[]; manual: ApplyPlan['manual']; warnings: string[]; errors?: undefined }
  | { errors: string[]; files?: undefined };

/**
 * Writes a rewrite straight into the game's files, with no version in between. Git is
 * the way back. Nothing is written if any of it fails the checks.
 */
export async function replaceScript(
  raw: string,
  pages: Page[],
  root = '.',
): Promise<ReplaceOutcome> {
  const { changes, errors, warnings } = readImport(raw, pages);
  if (errors.length) return { errors };
  if (!Object.keys(changes.bases).length) {
    return { errors: ["Nothing in this file differs from the game's current script."] };
  }
  const plan = await planApply({ name: '', createdAt: '', warnings, ...changes }, pages, root);
  writePlan(plan, root);
  return { files: plan.writes.map((w) => w.file), manual: plan.manual, warnings };
}

/** A section with the version's writing swapped in. */
function overlaySection(section: Section, version: Version): Section {
  const entries: Entry[] = [];
  let scene: string | undefined;
  for (const entry of section.entries) {
    if (isItem(entry) && entry.key.startsWith('scene/')) {
      const id = entry.key.split('/')[1];
      const rewritten = version.scenes[id];
      if (!rewritten) {
        entries.push(entry);
      } else if (id !== scene) {
        entries.push(...sceneEntries(rewritten));
      }
      scene = id;
    } else if (!isItem(entry)) {
      // A rewritten scene brings its own branch dividers.
      const ownBranch = scene && version.scenes[scene] && entry.id.startsWith(`branch-${scene}-`);
      if (!ownBranch) entries.push(entry);
    } else {
      scene = undefined;
      const text = version.texts[entry.key];
      entries.push(text === undefined ? entry : { ...entry, text });
    }
  }
  return { ...section, entries };
}

export interface VersionSection {
  section: Section;
  /** The section as the game has it now, when the version changes it. */
  original?: Section;
}

export interface VersionPage {
  page: Page;
  sections: VersionSection[];
  changed: number;
  added: number;
  removed: number;
}

const itemTexts = (sections: Section[]) =>
  sections.flatMap((s) => s.entries.filter(isItem).map((i) => `${i.speaker ?? ''}|${i.text}`));

/** The pages a version touches, each with its before and after. */
export function versionPages(pages: Page[], version: Version): VersionPage[] {
  return pages.flatMap((page): VersionPage[] => {
    const sections = page.sections.map((original): VersionSection => {
      const section = overlaySection(original, version);
      const same = JSON.stringify(section.entries) === JSON.stringify(original.entries);
      return same ? { section } : { section, original };
    });
    if (!sections.some((s) => s.original)) return [];
    const before = itemTexts(page.sections);
    const after = itemTexts(sections.map((s) => s.section));
    const left = [...before];
    let added = 0;
    for (const text of after) {
      const at = left.indexOf(text);
      if (at >= 0) left.splice(at, 1);
      else added += 1;
    }
    // A reworded line counts as changed; only a difference in length is added or cut.
    const changed = Math.min(added, left.length);
    return [
      {
        page,
        sections,
        changed,
        added: added - changed,
        removed: left.length - changed,
      },
    ];
  });
}

export interface ApplyPlan {
  writes: { file: string; content: string }[];
  /** Text this couldn't find a safe place for, to change by hand. */
  manual: { key: string; file: string; text: string }[];
  /** What has been edited since the rewrite was exported. */
  stale: string[];
}

/**
 * Swaps one string in a file, leaving the rest exactly as it was. Only when it's there
 * once, as a whole string, so it can't land on the wrong thing.
 */
function replaceLiteral(code: string, before: string, after: string): string | undefined {
  const forms = [
    JSON.stringify(before),
    `'${before.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`,
    `\`${before.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``,
  ];
  const found = forms.map((form) => code.split(form).length - 1);
  if (found.reduce((sum, count) => sum + count, 0) !== 1) return undefined;
  return code.split(forms[found.indexOf(1)]).join(JSON.stringify(after));
}

/** JSON with objects opened out, or with the innermost ones left for Prettier to fit on a line. */
function toJson(value: unknown, inlineLeaves: boolean, pad = ''): string {
  if (typeof value !== 'object' || value === null) return JSON.stringify(value);
  const inner = `${pad}  `;
  const open = (start: string, parts: string[], end: string) =>
    `${start}\n${parts.map((part) => inner + part).join(',\n')}\n${pad}${end}`;
  if (Array.isArray(value)) {
    return open(
      '[',
      value.map((v) => toJson(v, inlineLeaves, inner)),
      ']',
    );
  }
  const entries = Object.entries(value);
  if (inlineLeaves && !entries.some(([, v]) => typeof v === 'object')) return JSON.stringify(value);
  const parts = entries.map(([k, v]) => `${JSON.stringify(k)}: ${toJson(v, inlineLeaves, inner)}`);
  return open('{', parts, '}');
}

/** Works out every file a version changes, without writing any of them. */
export async function planApply(version: Version, pages: Page[], root = '.'): Promise<ApplyPlan> {
  const plan: ApplyPlan = { writes: [], manual: [], stale: [] };
  for (const [id, base] of Object.entries(version.bases)) {
    if (base !== currentBase(id, pages)) plan.stale.push(id);
  }

  const originals = new Map(
    pages.flatMap((p) =>
      p.sections.flatMap((s) => s.entries.filter(isItem).map((i) => [i.key, i.text] as const)),
    ),
  );
  const outputs = new Map<string, string>();
  const read = (file: string) =>
    outputs.get(file) ?? fs.readFileSync(path.join(root, file), 'utf8');

  for (const [id, scene] of Object.entries(version.scenes)) {
    // "start" is the default, so the scene files leave it out.
    const { start, ...rest } = scene;
    const data = start === 'start' ? rest : { ...rest, start };
    const file = `src/puzzles/scenes/${id}.json`;
    // Scene files differ in how much they fit on a line. Stay with what this one does.
    outputs.set(file, toJson(data, /\{ "/.test(read(file))));
  }

  for (const [key, text] of Object.entries(version.texts)) {
    const file = sourceFile(key);
    const exists = file && fs.existsSync(path.join(root, file));
    const updated = exists ? replaceLiteral(read(file), originals.get(key) ?? '', text) : undefined;
    if (updated) outputs.set(file, updated);
    else plan.manual.push({ key, file, text });
  }

  for (const [file, content] of outputs) {
    const filepath = path.join(root, file);
    const config = await prettier.resolveConfig(filepath);
    plan.writes.push({ file, content: await prettier.format(content, { ...config, filepath }) });
  }
  return plan;
}

export function writePlan(plan: ApplyPlan, root = '.') {
  for (const { file, content } of plan.writes) {
    fs.writeFileSync(path.join(root, file), content);
  }
}
