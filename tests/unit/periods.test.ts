import { describe, expect, it } from 'vitest';
import {
  getStudyDayStart,
  getDailyKey,
  getPeriodWindow,
  getPeriodTtlSeconds,
} from '../../lib/periods';

describe('periods core behavior', () => {
  it('anchors study day at 05:00 local', () => {
    const beforeReset = new Date(2026, 4, 6, 4, 30, 0, 0);
    const start = getStudyDayStart(beforeReset);
    expect(start.getHours()).toBe(5);
    expect(start.getDate()).toBe(5);
  });

  it('daily key follows study-day boundary', () => {
    const atNight = new Date(2026, 4, 6, 1, 0, 0, 0);
    expect(getDailyKey(atNight)).toBe('2026-05-05');
  });

  it('daily period window is 24 hours from 05:00', () => {
    const now = new Date(2026, 4, 6, 12, 0, 0, 0);
    const { start, end } = getPeriodWindow('daily', now);
    expect(start.getHours()).toBe(5);
    expect(end.getTime() - start.getTime()).toBe(86_400_000);
  });

  it('ttl seconds has sane floor', () => {
    const now = new Date();
    const ttl = getPeriodTtlSeconds('daily', now);
    expect(ttl).toBeGreaterThanOrEqual(60);
  });
});
