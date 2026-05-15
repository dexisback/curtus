import { describe, expect, it } from 'vitest';
import { normalizeLeaderboardScores } from '../../lib/leaderboard';

describe('normalizeLeaderboardScores', () => {
  it('sorts by total minutes descending', () => {
    expect(
      normalizeLeaderboardScores([
        { userId: 'charlie', totalMinutes: 10 },
        { userId: 'alpha', totalMinutes: 45 },
        { userId: 'bravo', totalMinutes: 20 },
      ]),
    ).toEqual([
      { userId: 'alpha', totalMinutes: 45 },
      { userId: 'bravo', totalMinutes: 20 },
      { userId: 'charlie', totalMinutes: 10 },
    ]);
  });

  it('breaks equal-minute ties by user id ascending', () => {
    expect(
      normalizeLeaderboardScores([
        { userId: 'zeta', totalMinutes: 60 },
        { userId: 'alpha', totalMinutes: 60 },
        { userId: 'mike', totalMinutes: 60 },
      ]),
    ).toEqual([
      { userId: 'alpha', totalMinutes: 60 },
      { userId: 'mike', totalMinutes: 60 },
      { userId: 'zeta', totalMinutes: 60 },
    ]);
  });
});
