import { describe, expect, it } from 'vitest';
import { lineKey, noLines } from '@picross/grid/engine/lines';
import { parsePuzzle } from '@picross/grid/puzzles/format';
import { createBoardView } from './boardView';

/** Row 1 is 1 1 1, row 2 is 3, row 5 is 2. Column 1 is 2 1, so it has an order to lose. */
const puzzle = parsePuzzle({
  id: 'test',
  name: 'Test',
  width: 5,
  height: 5,
  solution: ['#.#.#', '###..', '.....', '#..#.', '...##'],
});

const shown = (group: Element) => [...group.querySelectorAll('span')].map((s) => s.textContent);

function setup() {
  const view = createBoardView(puzzle);
  const rows = [...view.root.querySelectorAll('.row-clue')];
  const cols = [...view.root.querySelectorAll('.col-clue')];
  return { view, rows, cols };
}

describe('setScramble on a board with forged clues', () => {
  it('keeps a fake with fewer numbers than the real clue', () => {
    const { view, rows } = setup();
    view.setFakes(new Map([[lineKey('row', 0), [5]]]));
    view.setScramble({ rows: [], cols: [0] });
    expect(shown(rows[0])).toEqual(['5']);
  });

  it('keeps a fake with more numbers than the real clue, hiding the real one', () => {
    const { view, rows } = setup();
    view.setFakes(new Map([[lineKey('row', 1), [1, 1]]]));
    view.setScramble({ rows: [], cols: [0] });
    expect(shown(rows[1])).toEqual(['1', '1']);
  });

  it('leaves a forged line out of the scramble, including its label', () => {
    const { view, rows } = setup();
    view.setFakes(new Map([[lineKey('row', 0), [5]]]));
    view.setScramble({ rows: [], cols: [0] });
    expect(rows[0].classList.contains('scrambled')).toBe(false);
    expect(rows[0].ariaLabel).toBe('Row 1 clues: 5');
  });

  it('shows the real clue again once the forgery is unmasked', () => {
    const { view, rows } = setup();
    view.setFakes(new Map([[lineKey('row', 0), [5]]]));
    view.setScramble({ rows: [], cols: [0] });
    view.setFakes(new Map());
    view.setScramble(noLines());
    expect(shown(rows[0])).toEqual(['1', '1', '1']);
  });
});

describe('setScramble on real clues', () => {
  it('sorts a scrambled line, then restores its real order', () => {
    const { view, cols } = setup();
    expect(shown(cols[0])).toEqual(['2', '1']);

    view.setScramble({ rows: [], cols: [0] });
    expect(shown(cols[0])).toEqual(['1', '2']);
    expect(cols[0].classList.contains('scrambled')).toBe(true);
    expect(cols[0].ariaLabel).toBe('Column 1 clues in unknown order: 1, 2');

    view.setScramble(noLines(), [{ kind: 'col', index: 0 }]);
    expect(shown(cols[0])).toEqual(['2', '1']);
    expect(cols[0].classList.contains('scrambled')).toBe(false);
  });

  it('still sorts a real line while another line is forged', () => {
    const { view, rows, cols } = setup();
    view.setFakes(new Map([[lineKey('row', 0), [5]]]));
    view.setScramble({ rows: [], cols: [0] });
    expect(shown(cols[0])).toEqual(['1', '2']);
    expect(shown(rows[4])).toEqual(['2']);
  });
});
