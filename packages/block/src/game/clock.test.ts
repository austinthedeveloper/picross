import { describe, expect, it } from 'vitest';
import { Clock } from './clock';

describe('Clock', () => {
  const fake = () => {
    let t = 1000;
    return { now: () => t, tick: (ms: number) => (t += ms) };
  };

  it('adds this session to the time already played', () => {
    const time = fake();
    const clock = new Clock(5000, time.now);
    time.tick(2500);
    expect(clock.elapsed).toBe(7500);
  });

  it('keeps the time it stopped at', () => {
    const time = fake();
    const clock = new Clock(0, time.now);
    time.tick(42_000);
    clock.pause();
    time.tick(60_000);
    expect(clock.elapsed).toBe(42_000);
    expect(clock.running).toBe(false);
  });

  it('pauses and resumes without counting the gap', () => {
    const time = fake();
    const clock = new Clock(0, time.now);
    time.tick(1000);
    clock.pause();
    time.tick(9000);
    clock.resume();
    clock.resume();
    time.tick(1000);
    expect(clock.elapsed).toBe(2000);
  });

  it('starts over on reset', () => {
    const time = fake();
    const clock = new Clock(3000, time.now);
    time.tick(1000);
    clock.reset();
    time.tick(500);
    expect(clock.elapsed).toBe(500);
  });
});
