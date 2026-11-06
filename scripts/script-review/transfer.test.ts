import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scenes } from '../../src/puzzles/scenes';
import { buildPages, buildTargets, isItem } from './model';
import { locateAll, type Note } from './notes';
import { buildExport, readImport, type ExportDoc, type SceneItem, type TextItem } from './transfer';
import { renderVersionSection } from './render';
import { importVersion, planApply, replaceScript, versionPages, type Version } from './versions';

const pages = buildPages();
const items = (doc: ExportDoc) => doc.pages.flatMap((p) => p.sections.flatMap((s) => s.content));
const texts = (doc: ExportDoc) => items(doc).filter((i): i is TextItem => i.type === 'text');
const sceneItems = (doc: ExportDoc) => items(doc).filter((i): i is SceneItem => i.type === 'scene');
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const firstChapter = pages[0].slug;
const fresh = (slug?: string) => buildExport(pages, [], slug);
const reread = (doc: ExportDoc) => readImport(JSON.stringify(doc), pages);

const dirs: string[] = [];
const tempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'script-versions-'));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('buildExport', () => {
  it('covers every scene and piece of writing when exporting everything', () => {
    const doc = fresh();
    expect(doc.pages).toHaveLength(pages.length);
    expect(
      sceneItems(doc)
        .map((s) => s.id)
        .sort(),
    ).toEqual(scenes.map((s) => s.id).sort());
    const keys = new Set(texts(doc).map((t) => t.key));
    for (const item of pages.flatMap((p) => p.sections.flatMap((s) => s.entries.filter(isItem)))) {
      const isGenerated = item.key.startsWith('rank/') || /^Clear .*\.$/.test(item.text);
      if (item.key.startsWith('scene/') || isGenerated || !item.text) continue;
      expect(keys).toContain(item.key);
    }
  });

  it('lists each scene and text once, even when a page shares them', () => {
    const doc = fresh();
    const ids = [...sceneItems(doc).map((s) => s.id), ...texts(doc).map((t) => t.key)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('limits a page export to that page', () => {
    const doc = fresh(firstChapter);
    expect(doc.pages.map((p) => p.slug)).toEqual([firstChapter]);
  });

  it('puts open notes on their lines and leaves resolved ones out', () => {
    const scene = sceneItems(fresh())[0];
    const node = Object.keys(scene.nodes)[0];
    const key = `scene/${scene.id}/${node}/0`;
    const text = scene.nodes[node].lines![0].text;
    const note = (id: string, resolved?: boolean): Note => ({
      id,
      key,
      text,
      tag: 'change',
      body: `note ${id}`,
      createdAt: '2026-01-01',
      ...(resolved ? { resolved } : {}),
    });
    const located = locateAll([note('open'), note('done', true)], buildTargets(pages));
    const exported = sceneItems(buildExport(pages, located)).find((s) => s.id === scene.id)!;
    const line = exported.nodes[node].lines![0] as unknown as { notes: { id: string }[] };
    expect(line.notes.map((n) => n.id)).toEqual(['open']);
  });
});

describe('readImport', () => {
  it('finds no changes in an untouched export', () => {
    const { changes, errors } = reread(fresh());
    expect(errors).toEqual([]);
    expect(changes.bases).toEqual({});
  });

  it('accepts JSON wrapped in a code fence', () => {
    const fenced = `\`\`\`json\n${JSON.stringify(fresh(firstChapter))}\n\`\`\``;
    expect(readImport(fenced, pages).errors).toEqual([]);
  });

  it('reports text and scene rewrites, and ignores notes on the way back', () => {
    const doc = clone(fresh(firstChapter));
    const text = texts(doc)[0];
    text.text = 'A new blurb.';
    const scene = sceneItems(doc)[0];
    const node = Object.values(scene.nodes)[0];
    node.lines = [...node.lines!, { text: 'A brand new line.', notes: [] } as never];
    const { changes, errors } = reread(doc);
    expect(errors).toEqual([]);
    expect(changes.texts[text.key]).toBe('A new blurb.');
    const saved = Object.values(changes.scenes[scene.id].nodes)[0].lines!;
    expect(saved.at(-1)).toEqual({ text: 'A brand new line.' });
  });

  it("keeps a scene's backdrop whatever comes back", () => {
    const doc = clone(fresh());
    const scene = sceneItems(doc).find((s) => s.backdrop)!;
    const original = scene.backdrop;
    scene.backdrop = 'van-that-does-not-exist';
    Object.values(scene.nodes)[0].lines![0].text = 'Changed.';
    const { changes, errors } = reread(doc);
    expect(errors).toEqual([]);
    expect(changes.scenes[scene.id].backdrop).toBe(original);
  });

  it("keeps a scene's cast whatever comes back", () => {
    const doc = clone(fresh());
    const scene = sceneItems(doc).find((s) => Object.keys(s.cast).length)!;
    const original = clone(scene.cast);
    const [id] = Object.keys(scene.cast);
    scene.cast[id].name = 'Renamed';
    scene.cast.stranger = { name: 'Stranger', portrait: 'no-such-art' };
    Object.values(scene.nodes)[0].lines![0].text = 'Changed.';
    const { changes, errors } = reread(doc);
    expect(errors).toEqual([]);
    expect(changes.scenes[scene.id].cast).toEqual(original);
  });

  it('refuses a line from someone outside the cast', () => {
    const doc = clone(fresh());
    const scene = sceneItems(doc)[0];
    scene.cast.stranger = { name: 'Stranger', portrait: '🙂' };
    Object.values(scene.nodes)[0].lines![0].who = 'stranger';
    expect(reread(doc).errors.join()).toMatch(/unknown speaker "stranger"/);
  });

  it('refuses what the game could not play', () => {
    const doc = clone(fresh());
    const [one, two, , four] = sceneItems(doc);
    Object.values(one.nodes)[0].lines![0].who = 'nobody';
    Object.values(two.nodes)[0].next = 'nowhere';
    Object.values(four.nodes)[0].lines![0].if = 'made-up';
    const { errors } = reread(doc);
    expect(errors.join('\n')).toMatch(/unknown speaker "nobody"/);
    expect(errors.join('\n')).toMatch(/unknown node "nowhere"/);
    expect(errors.join('\n')).toMatch(/"made-up"/);
  });

  it('refuses unknown keys and things that are not exports', () => {
    const doc = clone(fresh(firstChapter));
    texts(doc)[0].key = 'chapter/nope/blurb';
    expect(reread(doc).errors.join()).toMatch(/Unknown text key/);
    expect(readImport('{"a":1}', pages).errors.join()).toMatch(/isn't a script export/);
    expect(readImport('nope', pages).errors.join()).toMatch(/isn't valid JSON/);
  });

  it('warns when a scene loses a win or lose outcome', () => {
    const doc = clone(fresh());
    const scene = sceneItems(doc).find((s) =>
      Object.values(s.nodes).some((n) => n.lines?.some((l) => l.if === '!won')),
    )!;
    for (const node of Object.values(scene.nodes)) {
      node.lines = node.lines?.filter((l) => l.if !== '!won');
    }
    expect(reread(doc).warnings.join()).toMatch(/no longer has any "!won" lines/);
  });

  it('warns when the text changed after it was exported', () => {
    const doc = clone(fresh(firstChapter));
    const text = texts(doc)[0];
    text.text = 'Rewritten.';
    text.base = 'older';
    expect(reread(doc).warnings.join()).toMatch(/edited since this was exported/);
  });
});

describe('versions', () => {
  const rewrite = () => {
    const doc = clone(fresh(firstChapter));
    texts(doc)[0].text = 'A new blurb.';
    const scene = sceneItems(doc)[0];
    const lines = Object.values(scene.nodes)[0].lines!;
    lines[0].text = 'Reworded.';
    lines.push({ text: 'Added.' });
    return JSON.stringify(doc);
  };

  it('saves a named version and refuses to reuse the name', () => {
    const dir = tempDir();
    const first = importVersion(rewrite(), 'Bolder Draft!', pages, dir);
    expect(first.version?.name).toBe('bolder-draft');
    expect(importVersion(rewrite(), 'bolder draft', pages, dir).errors?.join()).toMatch(/already/);
    expect(fs.readdirSync(dir)).toEqual(['bolder-draft.json']);
  });

  it('refuses a name that could leave the versions folder', () => {
    const dir = tempDir();
    const { version } = importVersion(rewrite(), '../../escape', pages, dir);
    expect(version?.name).toBe('escape');
    expect(fs.existsSync(path.join(dir, 'escape.json'))).toBe(true);
  });

  it('refuses a file that changes nothing', () => {
    const outcome = importVersion(JSON.stringify(fresh()), 'same', pages, tempDir());
    expect(outcome.errors?.join()).toMatch(/Nothing in this file differs/);
  });

  it('shows the rewrite with the original beside it, counting what moved', () => {
    const { version } = importVersion(rewrite(), 'draft', pages, tempDir());
    const [view] = versionPages(pages, version!);
    expect(view.page.slug).toBe(firstChapter);
    expect(view.changed).toBe(2);
    expect(view.added).toBe(1);
    expect(view.removed).toBe(0);
    const changed = view.sections.filter((s) => s.original);
    expect(changed.length).toBeGreaterThan(0);
    const after = changed.flatMap((s) => s.section.entries.filter(isItem).map((i) => i.text));
    expect(after).toContain('Added.');
    const before = changed.flatMap((s) => s.original!.entries.filter(isItem).map((i) => i.text));
    expect(before).not.toContain('Added.');
  });
});

describe('renderVersionSection', () => {
  it('shows a changed section as two columns, marking lines only one side has', () => {
    const doc = clone(fresh(firstChapter));
    const scene = sceneItems(doc)[0];
    Object.values(scene.nodes)[0].lines!.unshift({ text: 'Only in the rewrite.' });
    const { version } = importVersion(JSON.stringify(doc), 'draft', pages, tempDir());
    const [view] = versionPages(pages, version!);
    const html = renderVersionSection(view.sections.find((s) => s.original)!);
    expect(html).toContain('In the game now');
    expect(html).toContain('This version');
    expect(html).toMatch(/class="item [a-z]+ unique"[^]*Only in the rewrite\./);
    expect(html).not.toContain('<details');
  });

  it('leaves an untouched section as one column', () => {
    const [{ sections }] = pages.map((page) => ({ sections: page.sections }));
    const html = renderVersionSection({ section: sections[0] });
    expect(html).not.toContain('class="compare"');
  });
});

describe('replaceScript', () => {
  const copyScene = (id: string) => {
    const root = tempDir();
    const file = `src/puzzles/scenes/${id}.json`;
    fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
    fs.copyFileSync(file, path.join(root, file));
    return { root, written: path.join(root, file), before: fs.readFileSync(file, 'utf8') };
  };

  it("writes a restructured conversation over the game's file, with the cast as it was", async () => {
    const doc = clone(fresh());
    const scene = sceneItems(doc)[0];
    const { root, written } = copyScene(scene.id);
    const cast = clone(scene.cast);
    const node = scene.nodes[scene.start];
    const lines = node.lines!;
    node.lines = [...lines.reverse(), ...Array(48).fill({ text: 'One more.' })];
    scene.cast.stranger = { name: 'Stranger', portrait: '🙂' };
    const outcome = await replaceScript(JSON.stringify(doc), pages, root);
    expect(outcome.errors).toBeUndefined();
    const saved = JSON.parse(fs.readFileSync(written, 'utf8'));
    expect(saved.nodes[scene.start].lines).toHaveLength(lines.length + 48);
    expect(saved.nodes[scene.start].lines[0].text).toBe(lines[0].text);
    expect(saved.cast).toEqual(cast);
  });

  it('writes nothing when any of it fails the checks', async () => {
    const doc = clone(fresh());
    const [good, bad] = sceneItems(doc);
    const { root, written, before } = copyScene(good.id);
    good.nodes[good.start].lines![0].text = 'Changed.';
    Object.values(bad.nodes)[0].next = 'nowhere';
    const outcome = await replaceScript(JSON.stringify(doc), pages, root);
    expect(outcome.errors?.join()).toMatch(/unknown node "nowhere"/);
    expect(fs.readFileSync(written, 'utf8')).toBe(before);
  });

  it('refuses a file that changes nothing', async () => {
    const outcome = await replaceScript(JSON.stringify(fresh()), pages, tempDir());
    expect(outcome.errors?.join()).toMatch(/Nothing in this file differs/);
  });
});

describe('planApply', () => {
  const allRewritten = () => {
    const doc = clone(fresh());
    for (const text of texts(doc)) text.text = `REWRITTEN ${text.key}`;
    for (const scene of sceneItems(doc)) {
      for (const node of Object.values(scene.nodes)) {
        for (const line of node.lines ?? []) line.text = `REWRITTEN ${line.text}`;
      }
    }
    return reread(doc);
  };
  const asVersion = (changes: ReturnType<typeof allRewritten>['changes']): Version => ({
    name: 'all',
    createdAt: '',
    warnings: [],
    ...changes,
  });

  it('can place every rewritten line of the whole game', async () => {
    const { changes, errors } = allRewritten();
    expect(errors).toEqual([]);
    const plan = await planApply(asVersion(changes), pages);
    expect(plan.manual.map((m) => m.key)).toEqual([]);
    expect(plan.stale).toEqual([]);
    const written = plan.writes.map((w) => w.content).join('\n');
    for (const key of Object.keys(changes.texts)) expect(written).toContain(`REWRITTEN ${key}`);
  }, 60000);

  it('writes files that keep the format of the originals', async () => {
    const scene = scenes[0];
    const doc = clone(fresh());
    const item = sceneItems(doc).find((s) => s.id === scene.id)!;
    const original = item.nodes[item.start].lines![0].text;
    item.nodes[item.start].lines![0].text = `${original}!`;
    const plan = await planApply(asVersion(reread(doc).changes), pages);
    const [write] = plan.writes;
    const file = `src/puzzles/scenes/${scene.id}.json`;
    expect(write.file).toBe(file);
    const before = fs.readFileSync(file, 'utf8');
    expect(write.content).toBe(
      before.replace(JSON.stringify(original), JSON.stringify(`${original}!`)),
    );
  });

  it('flags changes based on an older copy of the script', async () => {
    const doc = clone(fresh(firstChapter));
    const text = texts(doc)[0];
    text.text = 'Rewritten.';
    text.base = 'older';
    const plan = await planApply(asVersion(reread(doc).changes), pages);
    expect(plan.stale).toEqual([text.key]);
  });
});
