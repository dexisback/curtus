import { describe, expect, it } from 'vitest';
import {
  computeSelfTimerTotalSeconds,
  mergeSelfStudyTimer,
} from '../../lib/timer-sync';

describe('computeSelfTimerTotalSeconds', () => {
  it('returns baseline when inactive', () => {
    expect(
      computeSelfTimerTotalSeconds({
        active: false,
        todaySeconds: 37,
        elapsedSeconds: 10,
      }),
    ).toBe(37);
  });

  it('adds elapsed only once when active', () => {
    expect(
      computeSelfTimerTotalSeconds({
        active: true,
        todaySeconds: 37,
        elapsedSeconds: 10,
      }),
    ).toBe(47);
  });
});

describe('mergeSelfStudyTimer', () => {
  it('keeps merged self row at completed baseline seconds', () => {
    const boards = [
      {
        id: 'room-1',
        roomName: 'Room',
        roomCode: 'ABCD',
        members: [
          {
            id: 'self',
            name: 'Me',
            initials: 'ME',
            active: false,
            startedAtIso: new Date(0).toISOString(),
            todayMinutes: 0,
            todaySeconds: 0,
          },
        ],
      },
    ];

    const merged = mergeSelfStudyTimer(boards, 'self', {
      active: true,
      startedAtMs: Date.parse('2026-05-06T10:00:00.000Z'),
      todaySeconds: 120,
    });

    expect(merged[0]?.members[0]?.todaySeconds).toBe(120);
    expect(merged[0]?.members[0]?.todayMinutes).toBe(2);
    expect(merged[0]?.members[0]?.active).toBe(true);
  });
});
