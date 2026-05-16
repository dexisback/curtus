import type { RemoteSocket, Server, Socket } from 'socket.io';
import { z } from 'zod';

import { prisma } from './db.js';
import { redis } from './redis.js';
import { bumpLeaderboards } from './leaderboard.js';
import { bumpStreak } from './streak.js';
import { logger } from './logger.js';
import { withSocketSpan } from './observability.js';
import {
  eventProcessingDurationMs,
  redisErrorsTotal,
  redisOpDurationMs,
  roomJoinDurationMs,
  roomJoinFailuresTotal,
  roomsActive,
} from './metrics.js';
import { socketLimiters, socketAllow } from './ratelimit.js';

const DAY_RESET_HOUR_LOCAL = 5;
const MAX_ACTIVE_VIDEO_USERS = 4;

const roomEventSchema = z.object({
  roomId: z.string().min(1),
});

const chatEventSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().trim().min(1).max(1_000),
  clientNonce: z.string().trim().min(8).max(80),
});

const sessionStartedSchema = z.object({
  roomId: z.string().min(1).nullable().optional(),
});

const pingEventSchema = z.object({
  toUserId: z.string().min(1),
});

const roomVideoStateSchema = z.object({
  roomId: z.string().min(1),
  enabled: z.boolean(),
});

const mediaTargetSchema = z.object({
  roomId: z.string().min(1),
  toUserId: z.string().min(1),
});

const mediaDescriptionSchema = mediaTargetSchema.extend({
  description: z
    .object({
      type: z.enum(['offer', 'answer', 'pranswer', 'rollback']),
      sdp: z.string().optional(),
    })
    .passthrough(),
});

const mediaIceCandidateSchema = mediaTargetSchema.extend({
  candidate: z
    .object({
      candidate: z.string(),
      sdpMid: z.string().nullable().optional(),
      sdpMLineIndex: z.number().nullable().optional(),
      usernameFragment: z.string().nullable().optional(),
    })
    .passthrough(),
});

type LiveSession = {
  startedAt: string;
  roomId: string | null;
};

export type PresencePayload = {
  roomId: string;
  memberIds: string[];
  studyingUserIds: string[];
  videoEnabledUserIds: string[];
  todayMinutes: Record<string, number>;
  todaySeconds: Record<string, number>;
  /** ISO start time of each member's live session, when any (same Redis key as studying). */
  sessionStartedAt: Record<string, string | null>;
};

export type SocketData = {
  userId: string;
  userName: string;
  joinedRoomIds: string[];
  roomJoinReasons: Record<string, { ui: boolean; video: boolean }>;
  requestId?: string;
};

export type ClientToServerEvents = {
  'room:join': (
    payload: z.infer<typeof roomEventSchema>,
    ack?: (response: { ok: boolean; error?: string }) => void,
  ) => void;
  'room:leave': (payload: z.infer<typeof roomEventSchema>) => void;
  'chat:send': (
    payload: z.infer<typeof chatEventSchema>,
    ack?: ChatAck,
  ) => void;
  'room:video-state': (
    payload: z.infer<typeof roomVideoStateSchema>,
    ack?: (response: { ok: boolean; error?: string }) => void,
  ) => void;
  'media:join': (
    payload: z.infer<typeof roomEventSchema>,
    ack?: (response: { ok: boolean; peers?: string[]; error?: string }) => void,
  ) => void;
  'media:leave': (payload: z.infer<typeof roomEventSchema>) => void;
  'media:offer': (payload: z.infer<typeof mediaDescriptionSchema>) => void;
  'media:answer': (payload: z.infer<typeof mediaDescriptionSchema>) => void;
  'media:ice-candidate': (
    payload: z.infer<typeof mediaIceCandidateSchema>,
  ) => void;
  'session:started': (payload: z.infer<typeof sessionStartedSchema>) => void;
  'session:stopped': () => void;
  'ping:send': (payload: z.infer<typeof pingEventSchema>) => void;
  'presence:refresh': () => void;
};

export type ServerToClientEvents = {
  presence: (payload: PresencePayload) => void;
  'chat:message': (payload: {
    id: string;
    roomId: string;
    content: string;
    clientNonce: string | null;
    userId: string;
    userName: string;
    createdAt: string;
  }) => void;
  'session:logged': (payload: {
    durationMin: number;
    lifetimeFocusMinutes: number;
    roomId: string | null;
  }) => void;
  'ping:received': (payload: { fromUserId: string; createdAt: string }) => void;
  'room:error': (payload: { message: string }) => void;
  'room:kicked': (payload: { roomId: string }) => void;
  'media:offer': (payload: {
    roomId: string;
    fromUserId: string;
    description: z.infer<typeof mediaDescriptionSchema>['description'];
  }) => void;
  'media:answer': (payload: {
    roomId: string;
    fromUserId: string;
    description: z.infer<typeof mediaDescriptionSchema>['description'];
  }) => void;
  'media:ice-candidate': (payload: {
    roomId: string;
    fromUserId: string;
    candidate: z.infer<typeof mediaIceCandidateSchema>['candidate'];
  }) => void;
  'media:peer-left': (payload: { roomId: string; userId: string }) => void;
};

type StudySocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

type StudyServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

type StudyRemoteSocket = RemoteSocket<ServerToClientEvents, SocketData>;

function getKickKey(userId: string, roomId: string) {
  return `kick:${userId}:${roomId}`;
}

function getRoomMembersKey(roomId: string) {
  return `room:${roomId}:members`;
}

function getRoomVideoEnabledKey(roomId: string) {
  return `room:${roomId}:videoEnabled`;
}

function getTodayMinutesKey(userId: string) {
  return `user:${userId}:todayMinutes`;
}

function getTodaySecondsKey(userId: string) {
  return `user:${userId}:todaySeconds`;
}

function getLiveSessionKey(userId: string) {
  return `user:${userId}:liveSession`;
}

function getSecondsUntilNextFiveAm(now = new Date()) {
  const nextReset = new Date(now);
  nextReset.setHours(DAY_RESET_HOUR_LOCAL, 0, 0, 0);
  if (now >= nextReset) nextReset.setDate(nextReset.getDate() + 1);
  return Math.max(1, Math.ceil((nextReset.getTime() - now.getTime()) / 1_000));
}

function getStudyDayStart(date: Date) {
  const start = new Date(date);
  start.setHours(DAY_RESET_HOUR_LOCAL, 0, 0, 0);
  if (date < start) start.setDate(start.getDate() - 1);
  return start;
}

async function syncKeyExpiry(userId: string, roomId?: string) {
  const ttl = getSecondsUntilNextFiveAm();
  await Promise.all([
    redis.expire(getTodayMinutesKey(userId), ttl),
    redis.expire(getTodaySecondsKey(userId), ttl),
    roomId ? redis.expire(getRoomMembersKey(roomId), ttl) : Promise.resolve(1),
    roomId
      ? redis.expire(getRoomVideoEnabledKey(roomId), ttl)
      : Promise.resolve(1),
  ]);
}

async function getStudyingUserIds(memberIds: string[]): Promise<string[]> {
  if (!memberIds.length) return [];
  const keys = memberIds.map(getLiveSessionKey);
  const values = await Promise.all(keys.map((k) => redis.get<LiveSession>(k)));
  return memberIds.filter((_, i) => values[i] !== null);
}

async function getSessionStartedAtMap(
  memberIds: string[],
): Promise<Record<string, string | null>> {
  if (!memberIds.length) return {};
  const keys = memberIds.map(getLiveSessionKey);
  const values = await Promise.all(keys.map((k) => redis.get<LiveSession>(k)));
  const out: Record<string, string | null> = {};
  memberIds.forEach((id, i) => {
    out[id] = values[i]?.startedAt ?? null;
  });
  return out;
}

async function publishPresence(io: StudyServer, roomId: string) {
  const readMembers = redisOpDurationMs.startTimer({
    operation: 'smembers_room_members',
  });
  let memberIds: string[] = [];
  try {
    memberIds = await redis.smembers<string[]>(getRoomMembersKey(roomId));
  } catch (error) {
    redisErrorsTotal.inc({ operation: 'smembers_room_members' });
    throw error;
  } finally {
    readMembers();
  }
  const uniqueMemberIds = Array.from(new Set(memberIds)).sort();

  const [
    minutePairs,
    secondPairs,
    studyingUserIds,
    sessionStartedAt,
    videoEnabledIds,
  ] = await Promise.all([
    Promise.all(
      uniqueMemberIds.map(async (id) => [
        id,
        (await redis.get<number>(getTodayMinutesKey(id))) ?? 0,
      ]),
    ),
    Promise.all(
      uniqueMemberIds.map(async (id) => [
        id,
        Number((await redis.get<unknown>(getTodaySecondsKey(id))) ?? 0) || 0,
      ]),
    ),
    getStudyingUserIds(uniqueMemberIds),
    getSessionStartedAtMap(uniqueMemberIds),
    redis.smembers<string[]>(getRoomVideoEnabledKey(roomId)),
  ]);
  const enabledSet = new Set(videoEnabledIds);
  const videoEnabledUserIds = uniqueMemberIds.filter((id) =>
    enabledSet.has(id),
  );

  io.to(roomId).emit('presence', {
    roomId,
    memberIds: uniqueMemberIds,
    studyingUserIds,
    videoEnabledUserIds,
    todayMinutes: Object.fromEntries(minutePairs),
    todaySeconds: Object.fromEntries(secondPairs),
    sessionStartedAt,
  });

  const namespace = typeof io.of === 'function' ? io.of('/') : null;
  if (namespace?.adapter?.rooms) {
    const activeRoomCount = [...namespace.adapter.rooms.entries()].filter(
      ([rid, socketSet]) => !rid.startsWith('user:') && socketSet.size > 0,
    ).length;
    roomsActive.set(activeRoomCount);
  }
}

async function maybeRemovePresenceMember(
  io: StudyServer,
  socket: StudySocket,
  roomId: string,
) {
  const socketsStillInRoom = await io.in(roomId).fetchSockets();
  const userStillPresent = socketsStillInRoom.some(
    (s: StudyRemoteSocket) => s.data.userId === socket.data.userId,
  );
  if (!userStillPresent) {
    await redis.srem(getRoomMembersKey(roomId), socket.data.userId);
    await redis.srem(getRoomVideoEnabledKey(roomId), socket.data.userId);
    socket
      .to(roomId)
      .emit('media:peer-left', { roomId, userId: socket.data.userId });
  }
  await publishPresence(io, roomId);
}

async function finalizeSession(
  io: StudyServer,
  socket: StudySocket,
  liveSession: LiveSession,
) {
  const completedAt = new Date();
  const startedAt = new Date(liveSession.startedAt);
  const durationSec = Math.max(
    1,
    Math.floor((completedAt.getTime() - startedAt.getTime()) / 1_000),
  );
  const durationMin = Math.max(
    1,
    Math.floor((completedAt.getTime() - startedAt.getTime()) / 60_000),
  );
  const studyDayStart = getStudyDayStart(completedAt);
  const roomId = liveSession.roomId ?? null;

  const [, updatedUser] = await prisma.$transaction([
    prisma.focusSession.create({
      data: {
        userId: socket.data.userId,
        roomId,
        durationMin,
        completedAt,
      },
    }),
    prisma.user.update({
      where: { id: socket.data.userId },
      data: { lifetimeFocusMinutes: { increment: durationMin } },
    }),
    prisma.dailyStats.upsert({
      where: {
        userId_date: { userId: socket.data.userId, date: studyDayStart },
      },
      update: { totalMinutes: { increment: durationMin } },
      create: {
        userId: socket.data.userId,
        date: studyDayStart,
        totalMinutes: durationMin,
      },
    }),
  ]);

  await redis.incrby(getTodayMinutesKey(socket.data.userId), durationMin);
  await redis.incrby(getTodaySecondsKey(socket.data.userId), durationSec);
  await syncKeyExpiry(socket.data.userId);
  await bumpLeaderboards(socket.data.userId, durationMin, completedAt);
  await bumpStreak(socket.data.userId, completedAt);

  socket.emit('session:logged', {
    durationMin,
    lifetimeFocusMinutes: updatedUser.lifetimeFocusMinutes,
    roomId,
  });

  const roomsToRefresh = new Set<string>(socket.data.joinedRoomIds);
  if (roomId) roomsToRefresh.add(roomId);
  await Promise.all(
    [...roomsToRefresh].map((rid: string) => publishPresence(io, rid)),
  );
}

function toRoomError(message: string) {
  return { message };
}

type ChatAck = (response: {
  ok: boolean;
  message?: {
    id: string;
    roomId: string;
    content: string;
    clientNonce: string | null;
    userId: string;
    userName: string;
    createdAt: string;
  };
  error?: string;
}) => void;

async function checkAndEvictIfKicked(
  io: StudyServer,
  socket: StudySocket,
  roomId: string,
): Promise<boolean> {
  const kickKey = getKickKey(socket.data.userId, roomId);
  const kicked = await redis.getdel(kickKey);
  if (!kicked) return false;

  socket.leave(roomId);
  removeJoinedRoom(socket, roomId);
  await maybeRemovePresenceMember(io, socket, roomId);

  io.to(`user:${socket.data.userId}`).emit('room:kicked', { roomId });
  return true;
}

function addJoinedRoom(socket: StudySocket, roomId: string) {
  if (!socket.data.joinedRoomIds.includes(roomId)) {
    socket.data.joinedRoomIds.push(roomId);
  }
}

function getRoomJoinReason(socket: StudySocket, roomId: string) {
  if (!socket.data.roomJoinReasons) {
    socket.data.roomJoinReasons = {};
  }
  const existing = socket.data.roomJoinReasons[roomId];
  if (existing) return existing;
  const next = { ui: false, video: false };
  socket.data.roomJoinReasons[roomId] = next;
  return next;
}

function setUiJoinReason(socket: StudySocket, roomId: string, joined: boolean) {
  const reason = getRoomJoinReason(socket, roomId);
  reason.ui = joined;
  if (joined) {
    addJoinedRoom(socket, roomId);
    return;
  }
  if (!reason.video) {
    delete socket.data.roomJoinReasons[roomId];
    removeJoinedRoom(socket, roomId);
  }
}

function setVideoJoinReason(
  socket: StudySocket,
  roomId: string,
  enabled: boolean,
) {
  const reason = getRoomJoinReason(socket, roomId);
  reason.video = enabled;
  if (enabled) {
    addJoinedRoom(socket, roomId);
    return;
  }
  if (!reason.ui) {
    delete socket.data.roomJoinReasons[roomId];
    removeJoinedRoom(socket, roomId);
  }
}

function removeJoinedRoom(socket: StudySocket, roomId: string) {
  socket.data.joinedRoomIds = socket.data.joinedRoomIds.filter(
    (id: string) => id !== roomId,
  );
}

function isJoined(socket: StudySocket, roomId: string) {
  return socket.data.joinedRoomIds.includes(roomId);
}

async function isCurrentRoomMember(userId: string, roomId: string) {
  const membership = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId, roomId } },
    select: { userId: true },
  });
  return Boolean(membership);
}

async function evictFromRoom(
  io: StudyServer,
  socket: StudySocket,
  roomId: string,
) {
  socket.leave(roomId);
  delete socket.data.roomJoinReasons[roomId];
  removeJoinedRoom(socket, roomId);
  await redis.srem(getRoomVideoEnabledKey(roomId), socket.data.userId);
  await maybeRemovePresenceMember(io, socket, roomId);
}

async function enforceRoomAccess(
  io: StudyServer,
  socket: StudySocket,
  roomId: string,
  opts?: { emitRoomError?: boolean; evictWhenInvalid?: boolean },
) {
  if (!isJoined(socket, roomId)) {
    if (opts?.emitRoomError)
      socket.emit('room:error', toRoomError('Join room before continuing.'));
    return { ok: false as const, reason: 'not_joined' };
  }

  const wasKicked = await checkAndEvictIfKicked(io, socket, roomId);
  if (wasKicked) {
    return { ok: false as const, reason: 'kicked' };
  }

  const stillMember = await isCurrentRoomMember(socket.data.userId, roomId);
  if (!stillMember) {
    if (opts?.evictWhenInvalid !== false) {
      await evictFromRoom(io, socket, roomId);
    }
    io.to(`user:${socket.data.userId}`).emit('room:kicked', { roomId });
    if (opts?.emitRoomError)
      socket.emit(
        'room:error',
        toRoomError('You are no longer a member of this room.'),
      );
    return { ok: false as const, reason: 'not_member' };
  }

  return { ok: true as const };
}

async function validateMediaTarget(
  io: StudyServer,
  socket: StudySocket,
  roomId: string,
  toUserId: string,
) {
  const access = await enforceRoomAccess(io, socket, roomId, {
    emitRoomError: true,
  });
  if (!access.ok) return false;
  const [toMember, fromEnabled, toEnabled, socketsInRoom] = await Promise.all([
    isCurrentRoomMember(toUserId, roomId),
    redis.sismember(getRoomVideoEnabledKey(roomId), socket.data.userId),
    redis.sismember(getRoomVideoEnabledKey(roomId), toUserId),
    io.in(roomId).fetchSockets(),
  ]);
  const toActiveInRoom = socketsInRoom.some(
    (s: StudyRemoteSocket) => s.data.userId === toUserId,
  );
  return Boolean(
    toMember && toActiveInRoom && (Boolean(fromEnabled) || Boolean(toEnabled)),
  );
}

export function registerSocketEvents(io: StudyServer) {
  io.on('connection', (socket: StudySocket) => {
    const socketLog =
      typeof logger.child === 'function'
        ? logger.child({
            socket_id: socket.id,
            user_id_hash: socket.data.userId,
            request_id: socket.data.requestId,
          })
        : logger;
    const observeEvent = async (eventName: string, fn: () => Promise<void>) =>
      withSocketSpan(
        `socket.${eventName}`,
        {
          event_name: eventName,
          socket_id: socket.id,
          request_id: socket.data.requestId,
          user_id_hash: socket.data.userId,
        },
        async () => {
          const done = eventProcessingDurationMs.startTimer({
            event_name: eventName,
          });
          try {
            await fn();
          } finally {
            done();
          }
        },
      );

    socket.on(
      'room:join',
      async (
        payload: unknown,
        ack?: (response: { ok: boolean; error?: string }) => void,
      ) => {
        await observeEvent('room.join', async () => {
          const parsed = roomEventSchema.safeParse(payload);
          if (!parsed.success) {
            socket.emit(
              'room:error',
              toRoomError('Invalid room join payload.'),
            );
            roomJoinFailuresTotal.inc({ reason: 'invalid_payload' });
            ack?.({ ok: false, error: 'invalid_payload' });
            return;
          }

          if (
            !(await socketAllow(
              socketLimiters.roomJoin,
              `room:join:${socket.data.userId}`,
            ))
          ) {
            socket.emit('room:error', { message: 'rate_limited' });
            roomJoinFailuresTotal.inc({ reason: 'rate_limited' });
            ack?.({ ok: false, error: 'rate_limited' });
            return;
          }

          const membership = await prisma.roomMember.findUnique({
            where: {
              userId_roomId: {
                userId: socket.data.userId,
                roomId: parsed.data.roomId,
              },
            },
            select: { userId: true },
          });

          if (!membership) {
            socket.emit(
              'room:error',
              toRoomError('Join the room first via the app.'),
            );
            socketLog.warn('Room join denied: not member', {
              event_name: 'room.join.denied',
              room_id: parsed.data.roomId,
              error_code: 'NOT_MEMBER',
            });
            roomJoinFailuresTotal.inc({ reason: 'not_member' });
            ack?.({ ok: false, error: 'not_member' });
            return;
          }

          // Check if user was kicked since last connect
          const wasKicked = await checkAndEvictIfKicked(
            io,
            socket,
            parsed.data.roomId,
          );
          if (wasKicked) {
            ack?.({ ok: false, error: 'kicked' });
            return;
          }

          const joinDone = roomJoinDurationMs.startTimer();
          try {
            socket.join(parsed.data.roomId);
            setUiJoinReason(socket, parsed.data.roomId, true);

            await redis.sadd(
              getRoomMembersKey(parsed.data.roomId),
              socket.data.userId,
            );
            await syncKeyExpiry(socket.data.userId, parsed.data.roomId);
            await publishPresence(io, parsed.data.roomId);
            ack?.({ ok: true });
          } finally {
            joinDone();
          }
        });
      },
    );

    socket.on('room:leave', async (payload: unknown) => {
      const parsed = roomEventSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('room:error', toRoomError('Invalid room leave payload.'));
        return;
      }

      setUiJoinReason(socket, parsed.data.roomId, false);
      const reason = socket.data.roomJoinReasons[parsed.data.roomId];
      if (reason?.video) {
        await publishPresence(io, parsed.data.roomId);
        return;
      }

      socket.leave(parsed.data.roomId);
      await maybeRemovePresenceMember(io, socket, parsed.data.roomId);
    });

    socket.on('presence:refresh', async () => {
      const rooms = socket.data.joinedRoomIds ?? [];
      if (!rooms.length) return;
      if (
        !(await socketAllow(
          socketLimiters.presenceRefresh,
          `presence:refresh:${socket.data.userId}`,
        ))
      ) {
        return;
      }
      const validRooms: string[] = [];
      for (const rid of rooms) {
        const access = await enforceRoomAccess(io, socket, rid);
        if (access.ok) validRooms.push(rid);
      }
      await Promise.all(
        validRooms.map((rid: string) => publishPresence(io, rid)),
      );
    });

    socket.on(
      'room:video-state',
      async (
        payload: unknown,
        ack?: (response: { ok: boolean; error?: string }) => void,
      ) => {
        const parsed = roomVideoStateSchema.safeParse(payload);
        if (!parsed.success) {
          socket.emit(
            'room:error',
            toRoomError('Invalid room video state payload.'),
          );
          ack?.({ ok: false, error: 'invalid_payload' });
          return;
        }
        const access = await enforceRoomAccess(io, socket, parsed.data.roomId, {
          emitRoomError: true,
        });
        if (!access.ok) {
          ack?.({ ok: false, error: 'not_in_room' });
          return;
        }

        const key = getRoomVideoEnabledKey(parsed.data.roomId);
        if (parsed.data.enabled) {
          socket.join(parsed.data.roomId);
          setVideoJoinReason(socket, parsed.data.roomId, true);
          await redis.sadd(
            getRoomMembersKey(parsed.data.roomId),
            socket.data.userId,
          );
          const alreadyEnabled = await redis.sismember(key, socket.data.userId);
          const activeCount = await redis.scard(key);
          if (!alreadyEnabled && activeCount >= MAX_ACTIVE_VIDEO_USERS) {
            setVideoJoinReason(socket, parsed.data.roomId, false);
            if (!socket.data.roomJoinReasons[parsed.data.roomId]?.ui) {
              socket.leave(parsed.data.roomId);
              await redis.srem(
                getRoomMembersKey(parsed.data.roomId),
                socket.data.userId,
              );
            }
            socket.emit('room:error', toRoomError('Room video is full.'));
            ack?.({ ok: false, error: 'video_room_full' });
            return;
          }
          await redis.sadd(key, socket.data.userId);
          await syncKeyExpiry(socket.data.userId, parsed.data.roomId);
        } else {
          setVideoJoinReason(socket, parsed.data.roomId, false);
          await redis.srem(key, socket.data.userId);
          socket.to(parsed.data.roomId).emit('media:peer-left', {
            roomId: parsed.data.roomId,
            userId: socket.data.userId,
          });
          if (!socket.data.roomJoinReasons[parsed.data.roomId]?.ui) {
            socket.leave(parsed.data.roomId);
          }
        }
        await publishPresence(io, parsed.data.roomId);
        ack?.({ ok: true });
      },
    );

    socket.on(
      'media:join',
      async (
        payload: unknown,
        ack?: (response: {
          ok: boolean;
          peers?: string[];
          error?: string;
        }) => void,
      ) => {
        const parsed = roomEventSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.({ ok: false, error: 'not_in_room' });
          return;
        }
        const access = await enforceRoomAccess(io, socket, parsed.data.roomId);
        if (!access.ok) {
          ack?.({ ok: false, error: 'not_in_room' });
          return;
        }

        const key = getRoomVideoEnabledKey(parsed.data.roomId);
        const peers = (await redis.smembers<string[]>(key))
          .filter((userId: string) => userId !== socket.data.userId)
          .sort();
        ack?.({ ok: true, peers });
      },
    );

    socket.on('media:leave', async (payload: unknown) => {
      const parsed = roomEventSchema.safeParse(payload);
      if (!parsed.success) return;
      const access = await enforceRoomAccess(io, socket, parsed.data.roomId);
      if (!access.ok) return;
      setVideoJoinReason(socket, parsed.data.roomId, false);
      await redis.srem(
        getRoomVideoEnabledKey(parsed.data.roomId),
        socket.data.userId,
      );
      socket.to(parsed.data.roomId).emit('media:peer-left', {
        roomId: parsed.data.roomId,
        userId: socket.data.userId,
      });
      if (!socket.data.roomJoinReasons[parsed.data.roomId]?.ui) {
        socket.leave(parsed.data.roomId);
      }
      await publishPresence(io, parsed.data.roomId);
    });

    socket.on('media:offer', async (payload: unknown) => {
      await observeEvent('media.offer', async () => {
        const parsed = mediaDescriptionSchema.safeParse(payload);
        if (!parsed.success) return;
        if (
          !(await validateMediaTarget(
            io,
            socket,
            parsed.data.roomId,
            parsed.data.toUserId,
          ))
        )
          return;
        io.to(`user:${parsed.data.toUserId}`).emit('media:offer', {
          roomId: parsed.data.roomId,
          fromUserId: socket.data.userId,
          description: parsed.data.description,
        });
      });
    });

    socket.on('media:answer', async (payload: unknown) => {
      await observeEvent('media.answer', async () => {
        const parsed = mediaDescriptionSchema.safeParse(payload);
        if (!parsed.success) return;
        if (
          !(await validateMediaTarget(
            io,
            socket,
            parsed.data.roomId,
            parsed.data.toUserId,
          ))
        )
          return;
        io.to(`user:${parsed.data.toUserId}`).emit('media:answer', {
          roomId: parsed.data.roomId,
          fromUserId: socket.data.userId,
          description: parsed.data.description,
        });
      });
    });

    socket.on('media:ice-candidate', async (payload: unknown) => {
      await observeEvent('media.ice_candidate', async () => {
        const parsed = mediaIceCandidateSchema.safeParse(payload);
        if (!parsed.success) return;
        if (
          !(await validateMediaTarget(
            io,
            socket,
            parsed.data.roomId,
            parsed.data.toUserId,
          ))
        )
          return;
        io.to(`user:${parsed.data.toUserId}`).emit('media:ice-candidate', {
          roomId: parsed.data.roomId,
          fromUserId: socket.data.userId,
          candidate: parsed.data.candidate,
        });
      });
    });

    socket.on('chat:send', async (payload: unknown, ack?: ChatAck) => {
      await observeEvent('chat.send', async () => {
        const parsed = chatEventSchema.safeParse(payload);
        if (!parsed.success) {
          socket.emit('room:error', toRoomError('Invalid chat payload.'));
          ack?.({ ok: false, error: 'invalid_payload' });
          return;
        }

        const access = await enforceRoomAccess(io, socket, parsed.data.roomId, {
          emitRoomError: true,
        });
        if (!access.ok) {
          ack?.({ ok: false, error: 'not_in_room' });
          return;
        }

        if (
          !(await socketAllow(
            socketLimiters.chatSend,
            `chat:send:${socket.data.userId}`,
          ))
        ) {
          socket.emit('room:error', { message: 'rate_limited' });
          ack?.({ ok: false, error: 'rate_limited' });
          return;
        }

        let message;
        try {
          message = await prisma.message.upsert({
            where: {
              roomId_userId_clientNonce: {
                roomId: parsed.data.roomId,
                userId: socket.data.userId,
                clientNonce: parsed.data.clientNonce,
              },
            },
            update: {},
            create: {
              content: parsed.data.content,
              clientNonce: parsed.data.clientNonce,
              roomId: parsed.data.roomId,
              userId: socket.data.userId,
            },
          });
        } catch (err) {
          // If the client retries and the unique row is created between checks,
          // Prisma can throw a unique constraint error. Treat as idempotent.
          const code = (err as { code?: string } | null)?.code;
          if (code === 'P2002') {
            message = await prisma.message.findFirst({
              where: {
                roomId: parsed.data.roomId,
                userId: socket.data.userId,
                clientNonce: parsed.data.clientNonce,
              },
              orderBy: { createdAt: 'desc' },
            });
          }
          if (!message) {
            ack?.({ ok: false, error: 'chat_persist_failed' });
            return;
          }
        }

        const chatPayload = {
          id: message.id,
          roomId: message.roomId,
          content: message.content,
          clientNonce: message.clientNonce,
          userId: message.userId,
          userName: socket.data.userName,
          createdAt: message.createdAt.toISOString(),
        };

        ack?.({ ok: true, message: chatPayload });
        io.to(parsed.data.roomId).emit('chat:message', chatPayload);
      });
    });

    socket.on('session:started', async (payload: unknown) => {
      await observeEvent('session.started', async () => {
        const parsed = sessionStartedSchema.safeParse(payload);
        if (!parsed.success) {
          socket.emit(
            'room:error',
            toRoomError('Invalid session:started payload.'),
          );
          return;
        }

        if (
          !(await socketAllow(
            socketLimiters.sessionStarted,
            `session:started:${socket.data.userId}`,
          ))
        ) {
          socket.emit('room:error', { message: 'rate_limited' });
          return;
        }

        const roomId = parsed.data?.roomId ?? null;

        // If joining with a roomId, verify membership
        if (roomId) {
          const membership = await prisma.roomMember.findUnique({
            where: { userId_roomId: { userId: socket.data.userId, roomId } },
            select: { userId: true },
          });
          if (!membership) {
            socket.emit(
              'room:error',
              toRoomError('Not a member of that room.'),
            );
            return;
          }
        }

        // Atomically grab any existing liveSession and finalize it first
        // (handles "tab1 stop emit lost, tab2 starts new session" race)
        const staleLive = await redis.getdel<LiveSession>(
          getLiveSessionKey(socket.data.userId),
        );
        if (staleLive) {
          try {
            await finalizeSession(io, socket, staleLive);
          } catch (err) {
            socketLog.error(
              'Failed to finalize stale session on session:started',
              {
                error_code: 'STALE_SESSION_FINALIZE_FAILED',
                user_id_hash: socket.data.userId,
                error: err instanceof Error ? err.message : String(err),
              },
            );
          }
        }

        const liveSession: LiveSession = {
          startedAt: new Date().toISOString(),
          roomId,
        };
        await redis.set(getLiveSessionKey(socket.data.userId), liveSession, {
          ex: 12 * 60 * 60,
        });

        // Broadcast updated presence to all joined rooms
        const roomsToRefresh = new Set<string>(socket.data.joinedRoomIds);
        if (roomId) roomsToRefresh.add(roomId);
        await Promise.all(
          [...roomsToRefresh].map((rid: string) => publishPresence(io, rid)),
        );
      });
    });

    socket.on('session:stopped', async () => {
      const liveSession = await redis.getdel<LiveSession>(
        getLiveSessionKey(socket.data.userId),
      );
      if (!liveSession) return; // Nothing to finalize (or disconnect already claimed it)
      await finalizeSession(io, socket, liveSession);
    });

    socket.on('ping:send', async (payload: unknown) => {
      const parsed = pingEventSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('room:error', toRoomError('Invalid ping payload.'));
        return;
      }

      if (
        !(await socketAllow(
          socketLimiters.pingSend,
          `ping:send:${socket.data.userId}`,
        ))
      ) {
        socket.emit('room:error', { message: 'rate_limited' });
        return;
      }

      const ping = await prisma.ping.create({
        data: {
          fromUserId: socket.data.userId,
          toUserId: parsed.data.toUserId,
        },
      });

      io.to(`user:${parsed.data.toUserId}`).emit('ping:received', {
        fromUserId: ping.fromUserId,
        createdAt: ping.createdAt.toISOString(),
      });
    });

    socket.on('disconnect', async () => {
      const liveSession = await redis.getdel<LiveSession>(
        getLiveSessionKey(socket.data.userId),
      );
      if (liveSession) {
        // Finalize quietly — no `session:logged` emit since socket is gone
        try {
          const completedAt = new Date();
          const startedAt = new Date(liveSession.startedAt);
          const durationSec = Math.max(
            1,
            Math.floor((completedAt.getTime() - startedAt.getTime()) / 1_000),
          );
          const durationMin = Math.max(
            1,
            Math.floor((completedAt.getTime() - startedAt.getTime()) / 60_000),
          );
          const studyDayStart = getStudyDayStart(completedAt);
          const roomId = liveSession.roomId ?? null;

          await prisma.$transaction([
            prisma.focusSession.create({
              data: {
                userId: socket.data.userId,
                roomId,
                durationMin,
                completedAt,
              },
            }),
            prisma.user.update({
              where: { id: socket.data.userId },
              data: { lifetimeFocusMinutes: { increment: durationMin } },
            }),
            prisma.dailyStats.upsert({
              where: {
                userId_date: {
                  userId: socket.data.userId,
                  date: studyDayStart,
                },
              },
              update: { totalMinutes: { increment: durationMin } },
              create: {
                userId: socket.data.userId,
                date: studyDayStart,
                totalMinutes: durationMin,
              },
            }),
          ]);

          await redis.incrby(
            getTodayMinutesKey(socket.data.userId),
            durationMin,
          );
          await redis.incrby(
            getTodaySecondsKey(socket.data.userId),
            durationSec,
          );
          await syncKeyExpiry(socket.data.userId);
          await bumpLeaderboards(socket.data.userId, durationMin, completedAt);
          await bumpStreak(socket.data.userId, completedAt);
        } catch {}
      }

      await Promise.all(
        socket.data.joinedRoomIds.map((roomId: string) =>
          maybeRemovePresenceMember(io, socket, roomId),
        ),
      );
    });
  });
}

// — events.ts: Socket.IO handlers — rooms, chat, WebRTC signaling, focus sessions, presence in Redis, rate limits.
