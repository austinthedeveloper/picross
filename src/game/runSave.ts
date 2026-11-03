import type { RunState } from './run';
import { readStore, writeStore } from './storage';

const KEY = 'picross:run';

interface RunSave {
  current: RunState | null;
}

const data = readStore<RunSave>(KEY, { current: null });

/** The run in progress or just finished, if any. */
export function getCurrentRun(): RunState | null {
  return data.current;
}

/** Saves the run (or clears it with null). Called after every change, so a reload resumes it. */
export function saveCurrentRun(state: RunState | null): void {
  data.current = state;
  writeStore(KEY, data);
}
