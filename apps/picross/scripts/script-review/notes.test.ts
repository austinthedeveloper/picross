import { describe, expect, it } from 'vitest';
import type { Target } from './model';
import { addNote, locate, locateAll, notesReport, updateNote, type Note } from './notes';

const target = (key: string, text: string, speaker?: string): Target => ({
  key,
  text,
  ...(speaker ? { speaker } : {}),
  page: 'chapter-1',
  pageTitle: 'Chapter 1: Odd Jobs',
  section: 'first-job-intro',
});

const note = (over: Partial<Note> = {}): Note => ({
  id: 'n1',
  key: 'scene/a/start/1',
  text: 'Old line',
  tag: 'change',
  body: 'Punch this up.',
  createdAt: '2026-11-04T00:00:00.000Z',
  ...over,
});

describe('locate', () => {
  it('stays put while the line reads the same', () => {
    const found = locate(note(), [target('scene/a/start/1', 'Old line')]);
    expect(found).toMatchObject({ status: 'current', key: 'scene/a/start/1', page: 'chapter-1' });
  });

  it('follows a line that moved when lines were added before it', () => {
    const found = locate(note(), [
      target('scene/a/start/1', 'A new line'),
      target('scene/a/start/2', 'Old line'),
    ]);
    expect(found).toMatchObject({ status: 'current', key: 'scene/a/start/2' });
  });

  it("doesn't follow the same words into a different scene", () => {
    const found = locate(note(), [target('scene/b/start/1', 'Old line')]);
    expect(found.status).toBe('removed');
  });

  it('flags a line reworded in place, keeping what it used to say', () => {
    const found = locate(note(), [target('scene/a/start/1', 'New line')]);
    expect(found).toMatchObject({ status: 'changed', text: 'Old line', currentText: 'New line' });
  });

  it('flags a line that is gone', () => {
    expect(locate(note(), []).status).toBe('removed');
  });
});

describe('locateAll', () => {
  it('sorts by reading order and puts removed lines last', () => {
    const targets = [target('scene/a/start/0', 'First'), target('scene/a/start/1', 'Second')];
    const sorted = locateAll(
      [
        note({ id: 'gone', key: 'scene/z/start/0', text: 'Gone' }),
        note({ id: 'second', key: 'scene/a/start/1', text: 'Second' }),
        note({ id: 'first', key: 'scene/a/start/0', text: 'First' }),
      ],
      targets,
    );
    expect(sorted.map((n) => n.id)).toEqual(['first', 'second', 'gone']);
  });
});

describe('addNote', () => {
  const targets = [target('scene/a/start/1', 'Old line', 'Dee')];

  it('snapshots the line and speaker from the script, not the request', () => {
    const notes = addNote([], { key: 'scene/a/start/1', tag: 'change', body: ' Hm. ' }, targets);
    expect(notes).toMatchObject([{ text: 'Old line', speaker: 'Dee', body: 'Hm.' }]);
  });

  it('lets a love-it stand alone but wants words for anything else', () => {
    const blank = { key: 'scene/a/start/1', body: '  ' };
    expect(addNote([], { ...blank, tag: 'like' }, targets)).toHaveLength(1);
    expect(addNote([], { ...blank, tag: 'change' }, targets)).toBeTypeOf('string');
  });

  it('refuses unknown lines and tags', () => {
    expect(addNote([], { key: 'nope', tag: 'like', body: '' }, targets)).toBeTypeOf('string');
    const bad = { key: 'scene/a/start/1', tag: 'angry', body: 'x' };
    expect(addNote([], bad, targets)).toBeTypeOf('string');
  });
});

describe('updateNote', () => {
  it('edits the body and leaves the rest alone', () => {
    const updated = updateNote([note()], 'n1', { body: 'New words' });
    expect(updated).toMatchObject([{ body: 'New words', tag: 'change', text: 'Old line' }]);
  });

  it('clears the resolution on reopen', () => {
    const done = note({ resolved: true, resolution: 'Reworded it.' });
    const [reopened] = updateNote([done], 'n1', { resolved: false }) as Note[];
    expect(reopened.resolved).toBeUndefined();
    expect(reopened.resolution).toBeUndefined();
  });

  it('refuses an unknown note', () => {
    expect(updateNote([note()], 'nope', { body: 'x' })).toBeTypeOf('string');
  });
});

describe('notesReport', () => {
  const targets = [target('scene/a/start/1', 'New line', 'Dee')];

  it('gives the note, the old and new wording, and where to edit it', () => {
    const report = notesReport(locateAll([note({ speaker: 'Dee' })], targets));
    expect(report).toContain('1 open, 0 resolved.');
    expect(report).toContain('[Change] Dee (n1)');
    expect(report).toContain('> Old line');
    expect(report).toContain('Now reads: New line');
    expect(report).toContain('Punch this up.');
    expect(report).toContain('src/puzzles/scenes/a.json');
  });

  it('leaves resolved notes out unless asked', () => {
    const located = locateAll([note({ resolved: true, resolution: 'Done.' })], targets);
    expect(notesReport(located)).not.toContain('Punch this up.');
    expect(notesReport(located, { all: true })).toContain('Resolved: Done.');
  });
});
