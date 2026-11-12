import { gameHref, type GameKind } from '@picross/shared/game/boards';
import { boardTabs } from './boardTabs';

/** The editor's Flat | Cubed tabs (#152): `#/editor` and Cubed's, `#/cubed/editor`. */
export const editorTabs = (current: GameKind) =>
  boardTabs(current, (tab) => (tab === 'flat' ? '#/editor' : `${gameHref('cubed')}/editor`));
