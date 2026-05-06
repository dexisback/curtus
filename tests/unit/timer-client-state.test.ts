import { describe, expect, it } from 'vitest';
import {
  normalizeTimerPayload,
  reconcileTodaySeconds,
} from '../../lib/timer-client-state';

describe('timer client state normalization', () => {
  it('normalizes unknown payload into deterministic defaults', () => {
    expect(normalizeTimerPayload(undefined)).toEqual({
      active: false,
      startedAtMs: null,
      todaySeconds: 0,
      dayKey: null,
      redisAvailable: true,
    });
  });

  it('parses and clamps payload values', () => {
    const normalized = normalizeTimerPayload({
      active: true,
      startedAt: '2026-05-06T10:00:00.000Z',
      todaySeconds: -20,
      dayKey: '2026-05-06',
      redisAvailable: false,
    });

    expect(normalized.active).toBe(true);
    expect(normalized.startedAtMs).toBeGreaterThan(0);
    expect(normalized.todaySeconds).toBe(0);
    expect(normalized.dayKey).toBe('2026-05-06');
    expect(normalized.redisAvailable).toBe(false);
  });
});

describe('todaySeconds reconciliation', () => {
  it('keeps same-day values monotonic', () => {
    const next = reconcileTodaySeconds({
      previousDayKey: '2026-05-06',
      previousTodaySeconds: 42,
      incomingDayKey: '2026-05-06',
      incomingTodaySeconds: 15,
    });
    expect(next).toBe(42);
  });

  it('accepts rollover day reset', () => {
    const next = reconcileTodaySeconds({
      previousDayKey: '2026-05-06',
      previousTodaySeconds: 120,
      incomingDayKey: '2026-05-07',
      incomingTodaySeconds: 3,
    });
    expect(next).toBe(3);
  });
});
