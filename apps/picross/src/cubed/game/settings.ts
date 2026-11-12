import type { Mode } from '@picross/block/game/game';
import {
  getSettings as getAll,
  updateSettings as updateAll,
  type ListFilter,
} from '../../game/settings';

/**
 * Cubed's settings: a view of the one set (`game/settings.ts`, `picross:settings`, #154).
 * Sound, high contrast, haptics, the mode and the list's filters are both games'; the
 * fields only Cubed has are `dimDone` and `cubedTutorialDone` there. Before #155 they had
 * their own key, `picross3d:settings`, which only the migration reads now.
 */

// The block package defines the mode (a Game is played in one); the settings keep the choice.
export type { Mode, ListFilter };

export interface Settings {
  mode: Mode;
  listFilter: ListFilter;
  /** A difficulty band's id, or 'any'. */
  listDifficulty: string;
  /** Fade the clues of finished lines. */
  dimDone: boolean;
  /** The guided tutorial was finished or skipped. */
  tutorialDone: boolean;
  muted: boolean;
  highContrast: boolean;
  /** Vibrates on taps, finished lines, and mistakes, where the phone can. Separate from mute. */
  haptics: boolean;
}

export function getSettings(): Readonly<Settings> {
  const all = getAll();
  return {
    mode: all.mode,
    listFilter: all.listFilter,
    listDifficulty: all.listDifficulty,
    dimDone: all.dimDone,
    tutorialDone: all.cubedTutorialDone,
    muted: all.muted,
    highContrast: all.highContrast,
    haptics: all.haptics,
  };
}

export function updateSettings(patch: Partial<Settings>): void {
  const { tutorialDone, listDifficulty, ...rest } = patch;
  updateAll({
    ...rest,
    ...(tutorialDone === undefined ? {} : { cubedTutorialDone: tutorialDone }),
    ...(listDifficulty === undefined
      ? {}
      : { listDifficulty: listDifficulty as ReturnType<typeof getAll>['listDifficulty'] }),
  });
}
