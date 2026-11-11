import { runs, type RunDef } from './runs';
import { chapterFiles } from '@picross/story/puzzles/files/chapters';
import { assembleChapters, parseChapter, type StoryChapter } from '@picross/story/puzzles/chapters';

export { assembleChapters, parseChapter, type ChapterFile } from '@picross/story/puzzles/chapters';

/** A chapter (#23) of this game's jobs; read and checked in `@picross/story`. */
export type Chapter = StoryChapter<RunDef>;

/** Every chapter, in board order. */
export const chapters: Chapter[] = assembleChapters(
  Object.values(chapterFiles).map((mod) =>
    parseChapter(mod.default, (id) => runs.find((r) => r.id === id)),
  ),
  runs,
);
