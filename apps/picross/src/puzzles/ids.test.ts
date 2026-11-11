import { describe, expect, it } from 'vitest';
import { parseId, qualify, type Dimension } from '@picross/shared/puzzles/ids';
import { allPuzzles as gridPuzzles } from '@picross/grid/puzzles/index';
import { PUZZLES as blockPack, STORY_PUZZLES as blockStory } from '@picross/block/puzzles/index';
import { runPuzzleFiles } from '@picross/story/puzzles/files/runPuzzles';

/**
 * Both packs' ids side by side (#147). This is the one place that reads both: packages/grid
 * and packages/block don't import each other, and this app plays both.
 */

// The 2D pack and its run puzzles (`allPuzzles` has both), and the 3D pack and its story puzzles.
const gridIds = gridPuzzles.map((p) => p.id);
const blockIds = [...blockPack, ...blockStory].map((p) => p.id);

/** The 2D run puzzles' ids, read straight from their files. */
const gridRunIds = Object.values(runPuzzleFiles).map((m) => (m.default as { id: string }).id);

const sorted = (ids: Iterable<string>) => [...new Set(ids)].sort();
const both = (a: string[], b: string[]) => sorted(a.filter((id) => b.includes(id)));

describe('puzzle ids with a dimension', () => {
  it.each([
    ['grid', gridIds],
    ['block', blockIds],
  ] as [Dimension, string[]][])('round-trip every %s id', (dimension, ids) => {
    expect(ids.length).toBeGreaterThan(50);
    for (const id of ids) {
      const qualified = qualify(dimension, id);
      expect(qualified).toBe(`${dimension}:${id}`);
      expect(parseId(qualified)).toEqual({ dimension, id });
    }
  });

  it('tell the two packs apart', () => {
    const grid = new Set(gridIds.map((id) => qualify('grid', id)));
    expect([...new Set(blockIds)].some((id) => grid.has(qualify('block', id)))).toBe(false);
  });
});

describe('ids in both packs', () => {
  // A new clash shows up here, in review. The story puzzles below share ids on purpose.
  it('the free-play packs share these', () => {
    const shared = both(
      gridPuzzles.map((p) => p.id).filter((id) => !gridRunIds.includes(id)),
      blockPack.map((p) => p.id),
    );
    console.log(`Free-play ids in both packs (${shared.length}): ${shared.join(', ')}`);
    expect(shared).toEqual([
      'alarm-clock',
      'ammonite',
      'anchor',
      'apple',
      'armchair',
      'cactus',
      'candelabra',
      'castle',
      'cat',
      'cauldron',
      'cupcake',
      'diving-helmet',
      'ghost',
      'haunted-house',
      'heart',
      'house',
      'jack-o-lantern',
      'jellyfish',
      'lab-rat',
      'ladybug',
      'marble-bust',
      'microscope',
      'mug',
      'mushroom',
      'pufferfish',
      'ray-gun',
      'robot',
      'rocket',
      'rubber-duck',
      'sailboat',
      'skull',
      'slime',
      'snowman',
      'stegosaurus',
      'submarine',
      'sunflower',
      'teapot',
      'tesla-coil',
      'toaster',
      'tombstone',
      'toolbox',
      'treasure-chest',
      'tree',
      'trilobite',
      'umbrella',
      'wheelbarrow',
    ]);
  });

  it("every 3D story puzzle has its 2D run puzzle's id, by design", () => {
    // packages/block/src/puzzles/story/: the story finds its 3D puzzle by the 2D one's id.
    expect(sorted(blockStory.map((p) => p.id))).toEqual(sorted(gridRunIds));
  });

  it('and nothing else is in both', () => {
    const all = both(gridIds, blockIds);
    console.log(`Every id in both packs (${all.length}): ${all.join(', ')}`);
    const freePlay = both(
      gridIds.filter((id) => !gridRunIds.includes(id)),
      blockPack.map((p) => p.id),
    );
    expect(all).toEqual(sorted([...freePlay, ...gridRunIds]));
  });

  it('four 2D run puzzles are also in the 3D free-play pack, so block: names two puzzles', () => {
    // A 3D story puzzle and a 3D free-play puzzle with the same id: `block:bat` alone can't
    // say which. Nothing reads a qualified id yet; when one does, it needs telling apart.
    expect(
      both(
        blockStory.map((p) => p.id),
        blockPack.map((p) => p.id),
      ),
    ).toEqual(['anglerfish', 'bat', 'octopus', 'rex-skull']);
  });
});
