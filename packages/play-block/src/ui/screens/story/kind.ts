import type { Game, GameMode } from '@picross/block/game/game';
import { formatTime } from '../../format';
import type { Play, PlayHooks } from '../play';

/** What an encounter's kind (fight, dig, rest) adds to the play screen. */
export interface Kind {
  mode: GameMode;
  /** Shown above the block (the battle bar, the dig sign, the rest clock). */
  header: HTMLElement;
  hooks?: Omit<PlayHooks, 'solved' | 'failed'>;
  /** Once the play screen exists. */
  attach?(play: Play): void;
  /** The solved panel's first line. */
  note(game: Game): string;
  /** Called when solved, before the encounter is cleared (the finisher). */
  land?(): void;
  /** Kept with the run, so a reload resumes the fight. */
  save?(): unknown;
  /** The panel when the run is lost mid-encounter, if it can be. */
  knockedOut?(): Node[];
  dispose?(): void;
}

/** The time a puzzle took, for notes. */
export const took = (game: Game) => formatTime(game.elapsed);
