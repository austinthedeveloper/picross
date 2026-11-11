import { describe, expect, it } from 'vitest';
import { FIGHT_SAVE, fightBoards, packFight, readFight } from './save';

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

  it('reads back a save of this version or the last, and nothing else', () => {
    const save = packFight({ block: { battle: { enemyHp: 1 } } });
    expect(save!.v).toBe(3);
    expect(fightBoards(JSON.parse(JSON.stringify(save)))).toEqual(save!.boards);
    // Version 2 (#169) is the same shape; its block counted only its own (#170).
    const old = { v: 2, boards: { flat: { battle: { enemyHp: 2 } } } };
    expect(readFight(old)).toEqual(old);
    for (const other of [undefined, null, 7, {}, { v: 1, boards: {} }, { v: 4, boards: {} }]) {
      expect(fightBoards(other)).toBeUndefined();
    }
  });
});
