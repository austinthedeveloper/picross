import { describe, expect, it } from 'vitest';
import { badges, getBadge, jobBadgeFor, pictureOf } from './badges';
import { chapters } from './chapters';
import { getEncounter, getRun } from './runs';

describe('badge catalog', () => {
  it('gives every job on the board exactly one badge', () => {
    const jobs = chapters.flatMap((c) => c.jobs);
    expect(jobs.length).toBeGreaterThan(0);
    for (const job of jobs) expect(jobBadgeFor(job.id), job.id).toBeDefined();
    expect(badges.filter((b) => b.rule.kind === 'job')).toHaveLength(jobs.length);
  });

  it('has unique ids and can find each badge', () => {
    expect(new Set(badges.map((b) => b.id)).size).toBe(badges.length);
    for (const badge of badges) expect(getBadge(badge.id)).toBe(badge);
  });

  it('only refers to jobs and encounters that exist', () => {
    for (const { id, rule, opensWith } of badges) {
      if (opensWith) expect(getRun(opensWith), id).toBeDefined();
      if ('job' in rule) expect(getRun(rule.job), id).toBeDefined();
      if ('encounter' in rule) expect(getEncounter(rule.encounter), id).toBeDefined();
    }
  });

  it('hides anything that names a job or enemy until its job is open', () => {
    for (const badge of badges) {
      if (badge.rule.kind === 'job' || badge.rule.kind === 'loss') {
        expect(badge.opensWith, badge.id).toBe(badge.rule.job);
      }
    }
    expect(getBadge('no-sponge-required')?.opensWith).toBe('deep-end');
  });

  it('has a square, drawn picture for each badge', () => {
    for (const badge of badges) {
      const { width, height, cells } = pictureOf(badge);
      expect(height, badge.id).toBe(width);
      for (const row of badge.picture) {
        expect(row, badge.id).toMatch(/^[#.]+$/);
        expect(row.length, badge.id).toBe(width);
      }
      expect(cells.filter(Boolean).length, badge.id).toBeGreaterThan(10);
    }
  });
});
