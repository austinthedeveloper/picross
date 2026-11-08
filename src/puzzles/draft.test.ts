import { describe, expect, it } from 'vitest';
import { indexOf } from '../engine/volume';
import { COLORS } from './format';
import { draftToFile, fileToDraft, newDraft, resizeDraft } from './draft';

describe('drafts', () => {
  it('turn into puzzle files and back', () => {
    const draft = newDraft({ x: 2, y: 2, z: 1 });
    draft.name = 'Two Tone';
    draft.cells[indexOf(draft.dims, { x: 0, y: 0, z: 0 })] = COLORS.indexOf('red') + 1;
    draft.cells[indexOf(draft.dims, { x: 1, y: 1, z: 0 })] = COLORS.indexOf('sky') + 1;
    const file = draftToFile(draft);
    expect(file).toEqual({
      id: 'two-tone',
      name: 'Two Tone',
      colors: { a: 'red', b: 'sky' },
      layers: [['a.'], ['.b']],
    });
    expect(fileToDraft(file).cells).toEqual(draft.cells);
  });

  it('keep what fits when resized', () => {
    const draft = newDraft({ x: 3, y: 3, z: 3 });
    draft.cells[indexOf(draft.dims, { x: 0, y: 0, z: 0 })] = 1;
    draft.cells[indexOf(draft.dims, { x: 2, y: 2, z: 2 })] = 1;
    const small = resizeDraft(draft, { x: 2, y: 2, z: 2 });
    expect([...small.cells].filter(Boolean).length).toBe(1);
    expect(small.cells[0]).toBe(1);
  });
});
