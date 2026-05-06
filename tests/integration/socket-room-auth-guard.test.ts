import { beforeEach, describe, expect, it, vi } from 'vitest';

const roomMemberFindUniqueMock = vi.fn();
const socketAllowMock = vi.fn();

const redisMock = {
  expire: vi.fn(async () => 1),
  smembers: vi.fn(async () => [] as string[]),
  get: vi.fn(async () => null),
  sadd: vi.fn(async () => 1),
  srem: vi.fn(async () => 1),
  getdel: vi.fn(async () => null),
  sismember: vi.fn(async () => true),
  scard: vi.fn(async () => 0),
  set: vi.fn(async () => 'OK'),
  incrby: vi.fn(async () => 1),
};

vi.mock('../../server/src/db.js', () => ({
  prisma: {
    roomMember: { findUnique: roomMemberFindUniqueMock },
    message: { upsert: vi.fn() },
    ping: { create: vi.fn() },
    focusSession: { create: vi.fn() },
    user: { update: vi.fn(), findUnique: vi.fn() },
    dailyStats: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../server/src/redis.js', () => ({
  redis: redisMock,
}));

vi.mock('../../server/src/leaderboard.js', () => ({
  bumpLeaderboards: vi.fn(),
}));

vi.mock('../../server/src/streak.js', () => ({
  bumpStreak: vi.fn(),
}));

vi.mock('../../server/src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../server/src/ratelimit.js', () => ({
  socketLimiters: {
    roomJoin: 'roomJoin',
    chatSend: 'chatSend',
    presenceRefresh: 'presenceRefresh',
  },
  socketAllow: socketAllowMock,
}));

type Handler = (...args: unknown[]) => unknown | Promise<unknown>;

type HandlerMap = Map<string, Handler>;

type TestIo = {
  on: (event: string, handler: Handler) => HandlerMap;
  to: (room: string) => { emit: (event: string, payload: unknown) => number };
  in: (room: string) => {
    fetchSockets: () => Promise<Array<{ data: { userId: string } }>>;
  };
};

type TestSocket = {
  id: string;
  data: { userId: string; userName: string; joinedRoomIds: string[] };
  on: (event: string, handler: Handler) => HandlerMap;
  emit: (event: string, payload: unknown) => number;
  join: (room: string) => Set<string>;
  leave: (room: string) => boolean;
  to: (room: string) => { emit: (event: string, payload: unknown) => number };
};

function makeIoAndSocket() {
  const socketHandlers = new Map<string, Handler>();
  const ioHandlers = new Map<string, Handler>();
  const ioDirectedEmits: Array<{
    room: string;
    event: string;
    payload: unknown;
  }> = [];
  const socketSelfEmits: Array<{ event: string; payload: unknown }> = [];
  const joinedRooms = new Set<string>();

  const io: TestIo = {
    on: (event: string, handler: Handler) => ioHandlers.set(event, handler),
    to: (room: string) => ({
      emit: (event: string, payload: unknown) =>
        ioDirectedEmits.push({ room, event, payload }),
    }),
    in: () => ({
      fetchSockets: async () => [] as Array<{ data: { userId: string } }>,
    }),
  };

  const socket: TestSocket = {
    id: 'sock-1',
    data: { userId: 'u1', userName: 'User 1', joinedRoomIds: [] as string[] },
    on: (event: string, handler: Handler) => socketHandlers.set(event, handler),
    emit: (event: string, payload: unknown) =>
      socketSelfEmits.push({ event, payload }),
    join: (room: string) => joinedRooms.add(room),
    leave: (room: string) => joinedRooms.delete(room),
    to: (room: string) => ({
      emit: (event: string, payload: unknown) =>
        ioDirectedEmits.push({ room, event, payload }),
    }),
  };

  return {
    io,
    socket,
    ioHandlers,
    socketHandlers,
    ioDirectedEmits,
    socketSelfEmits,
    joinedRooms,
  };
}

describe('socket room authorization guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketAllowMock.mockResolvedValue(true);
  });

  it('evicts and blocks chat/media when membership is revoked after join', async () => {
    const { registerSocketEvents } = await import('../../server/src/events');
    const { io, socket, ioHandlers, socketHandlers, ioDirectedEmits } =
      makeIoAndSocket();

    // First membership check: join allowed. Subsequent checks: membership revoked.
    roomMemberFindUniqueMock
      .mockResolvedValueOnce({ userId: 'u1' })
      .mockResolvedValue(null);

    registerSocketEvents(
      io as unknown as Parameters<typeof registerSocketEvents>[0],
    );
    await ioHandlers.get('connection')?.(
      socket as unknown as Parameters<Handler>[0],
    );

    await socketHandlers.get('room:join')?.({ roomId: 'room-1' });
    expect(socket.data.joinedRoomIds).toContain('room-1');

    const ack = vi.fn();
    await socketHandlers.get('chat:send')?.(
      { roomId: 'room-1', content: 'hello', clientNonce: 'nonce-123456' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'not_in_room' });
    expect(socket.data.joinedRoomIds).not.toContain('room-1');
    expect(
      ioDirectedEmits.some(
        (e) => e.room === 'user:u1' && e.event === 'room:kicked',
      ),
    ).toBe(true);

    const directedCountBeforeMedia = ioDirectedEmits.length;
    await socketHandlers.get('media:offer')?.({
      roomId: 'room-1',
      toUserId: 'u2',
      description: { type: 'offer', sdp: 'x' },
    });
    const mediaOfferDirected = ioDirectedEmits
      .slice(directedCountBeforeMedia)
      .filter((e) => e.room === 'user:u2' && e.event === 'media:offer');
    expect(mediaOfferDirected.length).toBe(0);
  });
});
