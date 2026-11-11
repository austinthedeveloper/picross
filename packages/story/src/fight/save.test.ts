import { describe, expect, it } from 'vitest';
import { FIGHT_SAVE, fightBoards, packFight } from './save';

describe('a fight save (#169)', () => {
  it('has an entry for each board with progress, flat first, as given', () => {
    const block = { board: { blocks: '0120' }, battle: { enemyHp: 3 } };
    const flat = { board: { cells: '01' }, battle: { enemyHp: 9, struck: [] } };
    const save = packFight({ block, flat });
    expect(save).toEqual({ v: FIGHT_SAVE, boards: { flat, block } });
    expect(Object.keys(save!.boards)).toEqual(['flat', 'block']);
    expect(save!.boards.block!.battle).toBe(block.battle);
  });

  it('leaves out what a board has not got, and is nothing with no progress', () => {
    expect(packFight({ flat: { board: undefined, battle: { enemyHp: 1 } } })).toEqual({
      v: FIGHT_SAVE,
      boards: { flat: { battle: { enemyHp: 1 } } },
    });
    expect(packFight({ flat: { board: undefined, battle: undefined }, block: undefined })).toBe(
      undefined,
    );
  });

  it('reads back only a save of this version', () => {
    const save = packFight({ block: { battle: { enemyHp: 1 } } });
    expect(fightBoards(JSON.parse(JSON.stringify(save)))).toEqual(save!.boards);
    for (const other of [undefined, null, 7, {}, { v: 1, boards: {} }, { v: 3, boards: {} }]) {
      expect(fightBoards(other)).toBeUndefined();
    }
  });
});
