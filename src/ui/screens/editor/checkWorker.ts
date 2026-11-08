/// <reference lib="webworker" />
import { checkPuzzle } from '../../../puzzles/check';
import type { PuzzleFile } from '../../../puzzles/format';

/** Checks a shape off the main thread, so a big one never freezes the editor. */
self.onmessage = (e: MessageEvent<{ id: number; file: PuzzleFile; ratio: number }>) => {
  const { id, file, ratio } = e.data;
  self.postMessage({ id, result: checkPuzzle(file, ratio) });
};
