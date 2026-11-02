/** Which puzzles the player has solved this session. */
const solved = new Set<string>();

export function isPuzzleSolved(id: string): boolean {
  return solved.has(id);
}

export function markPuzzleSolved(id: string): void {
  solved.add(id);
}
