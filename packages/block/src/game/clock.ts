/**
 * The play clock: time already played (from a save) plus the time this session has been
 * running. It pauses while the page is hidden and stops for good when the game ends, so
 * the time read at the end is the time played.
 */
export class Clock {
  private base: number;
  private startedAt: number | null;

  constructor(
    elapsed = 0,
    private now: () => number = () => performance.now(),
  ) {
    this.base = elapsed;
    this.startedAt = this.now();
  }

  get running(): boolean {
    return this.startedAt !== null;
  }

  /** Milliseconds played. */
  get elapsed(): number {
    return this.base + (this.startedAt === null ? 0 : this.now() - this.startedAt);
  }

  pause(): void {
    this.base = this.elapsed;
    this.startedAt = null;
  }

  resume(): void {
    if (this.startedAt === null) this.startedAt = this.now();
  }

  /** Starts again from `elapsed` (0 for a retry). */
  reset(elapsed = 0): void {
    this.base = elapsed;
    this.startedAt = this.now();
  }
}
