import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireApiSessionMock = vi.fn();
const enforceMock = vi.fn();
const parseRequestJsonMock = vi.fn();
const readTimerStateMock = vi.fn();
const startLiveStudySessionMock = vi.fn();
const stopLiveStudySessionMock = vi.fn();

vi.mock('@/lib/api-session', () => ({
  requireApiSession: requireApiSessionMock,
  withApi: (handler: (request: Request, ctx: unknown) => Promise<Response>) =>
    handler,
}));

vi.mock('@/lib/ratelimit', () => ({
  limiters: { sessionsRead: 'sessionsRead', studyTimer: 'studyTimer' },
  enforce: enforceMock,
}));

vi.mock('@/lib/api', () => ({
  parseRequestJson: parseRequestJsonMock,
}));

vi.mock('@/lib/study-live-session', () => ({
  readTimerState: readTimerStateMock,
  startLiveStudySession: startLiveStudySessionMock,
  stopLiveStudySession: stopLiveStudySessionMock,
}));

describe('/api/study-timer route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
    enforceMock.mockResolvedValue(undefined);
  });

  it('GET returns canonical timer payload', async () => {
    readTimerStateMock.mockResolvedValueOnce({
      active: true,
      startedAt: '2026-01-01T00:00:00.000Z',
      todaySeconds: 42,
      dayKey: '2026-01-01',
      redisAvailable: true,
    });
    const route = await import('../../app/api/study-timer/route');
    const res = await route.GET(
      new Request('http://localhost/api/study-timer'),
      {},
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      timer: {
        active: true,
        startedAt: '2026-01-01T00:00:00.000Z',
        todaySeconds: 42,
        dayKey: '2026-01-01',
        redisAvailable: true,
      },
    });
  });

  it('POST stop returns timer and session metadata', async () => {
    parseRequestJsonMock.mockResolvedValueOnce({
      success: true,
      data: { action: 'stop' },
    });
    stopLiveStudySessionMock.mockResolvedValueOnce({
      durationSec: 15,
      durationMin: 1,
      lifetimeFocusMinutes: 123,
    });
    readTimerStateMock.mockResolvedValueOnce({
      active: false,
      startedAt: null,
      todaySeconds: 57,
      dayKey: '2026-01-01',
      redisAvailable: true,
    });

    const route = await import('../../app/api/study-timer/route');
    const res = await route.POST(
      new Request('http://localhost/api/study-timer', { method: 'POST' }),
      {},
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      timer: {
        active: false,
        startedAt: null,
        todaySeconds: 57,
        dayKey: '2026-01-01',
        redisAvailable: true,
      },
      session: {
        durationSec: 15,
        durationMin: 1,
        lifetimeFocusMinutes: 123,
      },
    });
  });
});
