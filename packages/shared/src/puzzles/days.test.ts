import { describe, expect, it } from 'vitest';
import { addDays, dailyDimension, dateKey, dayNumber, keyOfDay, previousDay } from './days';

describe('day keys', () => {
  it('use the local calendar date', () => {
    expect(dateKey(new Date(2026, 10, 3, 23, 59))).toBe('2026-11-03');
    expect(dayNumber('1970-01-02')).toBe(1);
  });

  it('turn back into keys', () => {
    for (const key of ['1970-01-01', '2026-02-28', '2028-02-29', '2026-11-11', '2099-12-31']) {
      expect(keyOfDay(dayNumber(key))).toBe(key);
    }
  });

  it('step across months and years', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    // Days, not hours: a clock change (here, Europe's and America's spring ones) can't skip one.
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
  });
});

describe('dailyDimension', () => {
  it('is Flat on odd days since the epoch and Cubed on even ones', () => {
    expect(dayNumber('2026-11-12') % 2).toBe(1);
    expect(dailyDimension('2026-11-12')).toBe('grid');
    expect(dailyDimension('2026-11-11')).toBe('block');
  });

  it('alternates across the end of a 31-day month and a year', () => {
    const keys = Array.from({ length: 40 }, (_, i) => addDays('2026-12-15', i));
    for (let i = 1; i < keys.length; i++) {
      expect(dailyDimension(keys[i]), keys[i]).not.toBe(dailyDimension(keys[i - 1]));
    }
  });
});
