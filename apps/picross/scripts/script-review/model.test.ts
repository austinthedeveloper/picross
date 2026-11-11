import { describe, expect, it } from 'vitest';
import { chapters } from '../../src/puzzles/chapters';
import { scenes, type Scene } from '@picross/shared/puzzles/scenes';
import { buildPages, buildTargets, isItem, sceneEntries, type Item } from './model';
import { escapeHtml } from './render';

const pages = buildPages();
const items = pages.flatMap((p) => p.sections.flatMap((s) => s.entries.filter(isItem)));

describe('buildPages', () => {
  it('gives each chapter a page in board order, then the text outside the story', () => {
    expect(pages.map((p) => p.title)).toEqual([
      ...chapters.map((c) => c.title),
      'Tips, gadgets and tutorial',
    ]);
  });

  it('includes every line and choice of every scene', () => {
    const keys = new Set(items.map((i) => i.key));
    for (const scene of scenes) {
      for (const [nodeId, node] of Object.entries(scene.nodes)) {
        (node.lines ?? []).forEach((_, i) => {
          expect(keys).toContain(`scene/${scene.id}/${nodeId}/${i}`);
        });
        (node.choices ?? []).forEach((_, i) => {
          expect(keys).toContain(`scene/${scene.id}/${nodeId}/choice/${i}`);
        });
      }
    }
  });

  it('plays a chapter as opening, then intro, encounters, and sign-off', () => {
    const page = pages.find((p) => p.title === 'After Hours')!;
    const order = page.sections.map((s) => s.eyebrow);
    expect(order[0]).toBe('Jobs board');
    expect(order[1]).toBe('Chapter opening');
    expect(order[2]).toBe('Job');
    expect(order[3]).toBe('Job intro');
    expect(order.at(-1)).toBe('Job sign-off');
  });

  it('gives taunts to the form the enemy is in by then', () => {
    const taunts = items.filter((i) => i.key.startsWith('encounter/curator/taunt/'));
    expect(taunts.map((t) => [t.speaker, t.art, t.tag])).toEqual([
      ['Clockwork Curator', 'art/enemies/clockwork-curator.png', 'At 92% HP'],
      // This phase doesn't change form, so it keeps the one before.
      ['Clockwork Curator', 'art/enemies/clockwork-curator.png', 'At 85% HP'],
      ['Overwound Curator', 'art/enemies/overwound-curator.png', 'At 78% HP'],
      // Switching board (it unfolds into a block, then folds back) keeps its look.
      ['Unfolded Curator', 'art/enemies/overwound-curator.png', 'At 60% HP'],
      ['Overwound Curator', 'art/enemies/overwound-curator.png', 'At 30% HP'],
    ]);
  });
});

describe('buildTargets', () => {
  it('lists encounters shared between jobs once', () => {
    const keys = buildTargets(pages).map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('sceneEntries', () => {
  const scene: Scene = {
    id: 'test',
    start: 'start',
    cast: { pip: { name: 'Pip', portrait: '🧑‍🔧' }, dee: { name: 'Dee', portrait: 'dee' } },
    nodes: {
      start: {
        lines: [
          { text: 'Narration.' },
          { who: 'dee', text: 'Hello.', if: 'won' },
          { who: 'pip', text: 'Bye.', if: '!won' },
        ],
        choices: [{ text: 'Ask', next: 'ask' }, { text: 'Leave', next: 'end' }, { text: 'Quit' }],
      },
      ask: { lines: [{ who: 'dee', text: 'Well.' }], next: 'end' },
      end: { lines: [{ text: 'The end.' }] },
      lost: { lines: [{ text: 'Nothing goes here.' }] },
    },
  };
  const entries = sceneEntries(scene);
  const byKey = (key: string) => entries.find((e) => isItem(e) && e.key === key) as Item;

  it('shows narration, speakers, art, and conditions', () => {
    expect(byKey('scene/test/start/0')).toMatchObject({ kind: 'narration' });
    expect(byKey('scene/test/start/1')).toMatchObject({
      speaker: 'Dee',
      art: 'art/cast/dee.png',
      tag: 'If you win',
    });
    expect(byKey('scene/test/start/2')).toMatchObject({ art: '🧑‍🔧', tag: 'If you lose' });
  });

  it('reads branches in order and points choices at them', () => {
    const labels = entries.filter((e) => !isItem(e)).map((e) => (isItem(e) ? '' : e.text));
    expect(labels).toEqual([
      'After “Ask”',
      'After “Leave”, and the ask branch rejoins here',
      'lost: nothing leads here',
    ]);
    expect(byKey('scene/test/start/choice/0').jump).toBe('branch-test-ask');
    expect(byKey('scene/test/start/choice/2').jump).toBeUndefined();
  });
});

describe('escapeHtml', () => {
  it('escapes anything that could break out of text or an attribute', () => {
    expect(escapeHtml(`<a href="x" title='y'>&`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;',
    );
  });
});
