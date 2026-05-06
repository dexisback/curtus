import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const signSocketAuthTokenMock = vi.fn();

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock('@/lib/socket-auth-token', () => ({
  signSocketAuthToken: signSocketAuthTokenMock,
}));

describe('/api/socket/token route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const route = await import('../../app/api/socket/token/route');
    const res = await route.GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'unauthorized' });
  });

  it('returns token for authenticated user when secret exists', async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: 'u1' } });
    signSocketAuthTokenMock.mockReturnValueOnce('signed-token');
    process.env.BETTER_AUTH_SECRET = 'secret';

    const route = await import('../../app/api/socket/token/route');
    const res = await route.GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ token: 'signed-token' });
    expect(signSocketAuthTokenMock).toHaveBeenCalledWith('u1', 'secret');
  });
});
