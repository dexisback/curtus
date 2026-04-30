import type { Server, Socket } from "socket.io";
import { z } from "zod";

import { prisma } from "./db.js";
import { redis } from "./redis.js";
import { bumpLeaderboards } from "./leaderboard.js";
import { bumpStreak } from "./streak.js";
import { logger } from "./logger.js";
import { socketLimiters, socketAllow } from "./ratelimit.js";

const DAY_RESET_HOUR_UTC = 5;

// ─── Schemas ────────────────────────────────────────────────────────────────

const roomEventSchema = z.object({
  roomId: z.string().min(1),
});

const chatEventSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().trim().min(1).max(1_000),
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

// ─── Types ───────────────────────────────────────────────────────────────────

type LiveSession = {
  startedAt: string; // ISO string
  roomId: string | null;
};

export type PresencePayload = {
  roomId: string;
  memberIds: string[];
  studyingUserIds: string[];
  videoEnabledUserIds: string[];
  todayMinutes: Record<string, number>;
};

export type SocketData = {
  userId: string;
  userName: string;
  joinedRoomIds: string[];
};

export type ClientToServerEvents = {
  "room:join": (payload: z.infer<typeof roomEventSchema>) => void;
  "room:leave": (payload: z.infer<typeof roomEventSchema>) => void;
  "chat:send": (payload: z.infer<typeof chatEventSchema>) => void;
  "room:video-state": (payload: z.infer<typeof roomVideoStateSchema>) => void;
  "session:started": (payload: z.infer<typeof sessionStartedSchema>) => void;
  "session:stopped": () => void;
  "ping:send": (payload: z.infer<typeof pingEventSchema>) => void;
};

export type ServerToClientEvents = {
  presence: (payload: PresencePayload) => void;
  "chat:message": (payload: {
    id: string;
    roomId: string;
    content: string;
    userId: string;
    userName: string;
    createdAt: string;
  }) => void;
  "session:logged": (payload: {
    durationMin: number;
    lifetimeFocusMinutes: number;
    roomId: string | null;
  }) => void;
  "ping:received": (payload: {
    fromUserId: string;
    createdAt: string;
  }) => void;
  "room:error": (payload: {
    message: string;
  }) => void;
  "room:kicked": (payload: {
    roomId: string;
  }) => void;
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

// ─── Redis key helpers ───────────────────────────────────────────────────────

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

function getLiveSessionKey(userId: string) {
  return `user:${userId}:liveSession`;
}

// ─── Time helpers ────────────────────────────────────────────────────────────

function getSecondsUntilNextFiveAm(now = new Date()) {
  const nextReset = new Date(now);
  nextReset.setUTCHours(DAY_RESET_HOUR_UTC, 0, 0, 0);
  if (now >= nextReset) nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  return Math.max(1, Math.ceil((nextReset.getTime() - now.getTime()) / 1_000));
}

function getStudyDayStart(date: Date) {
  const shifted = new Date(date.getTime() - DAY_RESET_HOUR_UTC * 60 * 60 * 1_000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      DAY_RESET_HOUR_UTC,
      0,
      0,
      0,
    ),
  );
}

async function syncKeyExpiry(userId: string, roomId?: string) {
  const ttl = getSecondsUntilNextFiveAm();
  await Promise.all([
    redis.expire(getTodayMinutesKey(userId), ttl),
    roomId ? redis.expire(getRoomMembersKey(roomId), ttl) : Promise.resolve(1),
  ]);
}

// ─── Presence helpers ────────────────────────────────────────────────────────

async function getStudyingUserIds(memberIds: string[]): Promise<string[]> {
  if (!memberIds.length) return [];
  const keys = memberIds.map(getLiveSessionKey);
  const values = await Promise.all(keys.map((k) => redis.get<LiveSession>(k)));
  return memberIds.filter((_, i) => values[i] !== null);
}

async function publishPresence(io: StudyServer, roomId: string) {
  const memberIds = await redis.smembers<string[]>(getRoomMembersKey(roomId));
  const uniqueMemberIds = Array.from(new Set(memberIds)).sort();

  const [minutePairs, studyingUserIds, videoEnabledIds] = await Promise.all([
    Promise.all(
      uniqueMemberIds.map(async (id) => [
        id,
        (await redis.get<number>(getTodayMinutesKey(id))) ?? 0,
      ]),
    ),
    getStudyingUserIds(uniqueMemberIds),
    redis.smembers<string[]>(getRoomVideoEnabledKey(roomId)),
  ]);
  const enabledSet = new Set(videoEnabledIds);
  const videoEnabledUserIds = uniqueMemberIds.filter((id) => enabledSet.has(id));

  io.to(roomId).emit("presence", {
    roomId,
    memberIds: uniqueMemberIds,
    studyingUserIds,
    videoEnabledUserIds,
    todayMinutes: Object.fromEntries(minutePairs),
  });
}

async function maybeRemovePresenceMember(
  io: StudyServer,
  socket: StudySocket,
  roomId: string,
) {
  const socketsStillInRoom = await io.in(roomId).fetchSockets();
  const userStillPresent = socketsStillInRoom.some(
    (s) => s.data.userId === socket.data.userId,
  );
  if (!userStillPresent) {
    await redis.srem(getRoomMembersKey(roomId), socket.data.userId);
    await redis.srem(getRoomVideoEnabledKey(roomId), socket.data.userId);
  }
  await publishPresence(io, roomId);
}

// ─── Timer helpers ───────────────────────────────────────────────────────────

async function finalizeSession(
  io: StudyServer,
  socket: StudySocket,
  liveSession: LiveSession,
) {
  const completedAt = new Date();
  const startedAt = new Date(liveSession.startedAt);
  const durationMin = Math.max(1, Math.floor((completedAt.getTime() - startedAt.getTime()) / 60_000));
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
      where: { userId_date: { userId: socket.data.userId, date: studyDayStart } },
      update: { totalMinutes: { increment: durationMin } },
      create: { userId: socket.data.userId, date: studyDayStart, totalMinutes: durationMin },
    }),
  ]);

  await redis.incrby(getTodayMinutesKey(socket.data.userId), durationMin);
  await syncKeyExpiry(socket.data.userId);
  await bumpLeaderboards(socket.data.userId, durationMin, completedAt);
  await bumpStreak(socket.data.userId, completedAt);

  socket.emit("session:logged", {
    durationMin,
    lifetimeFocusMinutes: updatedUser.lifetimeFocusMinutes,
    roomId,
  });

  // Refresh presence for all joined rooms + the session's room
  const roomsToRefresh = new Set(socket.data.joinedRoomIds);
  if (roomId) roomsToRefresh.add(roomId);
  await Promise.all(Array.from(roomsToRefresh).map((id) => publishPresence(io, id)));
}

function toRoomError(message: string) {
  return { message };
}

/**
 * Checks Redis for a pending kick signal. If found, evicts the socket from the
 * room and emits `room:kicked`. Returns true if the user was kicked.
 */
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

  io.to(`user:${socket.data.userId}`).emit("room:kicked", { roomId });
  return true;
}

function addJoinedRoom(socket: StudySocket, roomId: string) {
  if (!socket.data.joinedRoomIds.includes(roomId)) {
    socket.data.joinedRoomIds.push(roomId);
  }
}

function removeJoinedRoom(socket: StudySocket, roomId: string) {
  socket.data.joinedRoomIds = socket.data.joinedRoomIds.filter((id) => id !== roomId);
}

// ─── Event registration ──────────────────────────────────────────────────────

export function registerSocketEvents(io: StudyServer) {
  io.on("connection", (socket) => {

    // room:join — validate RoomMember row exists before letting in
    socket.on("room:join", async (payload) => {
      const parsed = roomEventSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("room:error", toRoomError("Invalid room join payload."));
        return;
      }

      if (!await socketAllow(socketLimiters.roomJoin, `room:join:${socket.data.userId}`)) {
        socket.emit("room:error", { message: "rate_limited" });
        return;
      }

      const membership = await prisma.roomMember.findUnique({
        where: {
          userId_roomId: { userId: socket.data.userId, roomId: parsed.data.roomId },
        },
        select: { userId: true },
      });

      if (!membership) {
        socket.emit("room:error", toRoomError("Join the room first via the app."));
        return;
      }

      // Check if user was kicked since last connect
      const wasKicked = await checkAndEvictIfKicked(io, socket, parsed.data.roomId);
      if (wasKicked) return;

      socket.join(parsed.data.roomId);
      addJoinedRoom(socket, parsed.data.roomId);

      await redis.sadd(getRoomMembersKey(parsed.data.roomId), socket.data.userId);
      await syncKeyExpiry(socket.data.userId, parsed.data.roomId);
      await publishPresence(io, parsed.data.roomId);
    });

    // room:leave
    socket.on("room:leave", async (payload) => {
      const parsed = roomEventSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("room:error", toRoomError("Invalid room leave payload."));
        return;
      }

      socket.leave(parsed.data.roomId);
      removeJoinedRoom(socket, parsed.data.roomId);
      await maybeRemovePresenceMember(io, socket, parsed.data.roomId);
    });

    // room:video-state
    socket.on("room:video-state", async (payload) => {
      const parsed = roomVideoStateSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("room:error", toRoomError("Invalid room video state payload."));
        return;
      }
      if (!socket.data.joinedRoomIds.includes(parsed.data.roomId)) {
        socket.emit("room:error", toRoomError("Join room before updating video state."));
        return;
      }

      const key = getRoomVideoEnabledKey(parsed.data.roomId);
      if (parsed.data.enabled) {
        await redis.sadd(key, socket.data.userId);
      } else {
        await redis.srem(key, socket.data.userId);
      }
      await publishPresence(io, parsed.data.roomId);
    });

    // chat:send
    socket.on("chat:send", async (payload) => {
      const parsed = chatEventSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("room:error", toRoomError("Invalid chat payload."));
        return;
      }

      if (!socket.data.joinedRoomIds.includes(parsed.data.roomId)) {
        socket.emit("room:error", toRoomError("Join room before sending chat."));
        return;
      }

      if (!await socketAllow(socketLimiters.chatSend, `chat:send:${socket.data.userId}`)) {
        socket.emit("room:error", { message: "rate_limited" });
        return;
      }

      // Enforce any pending kick before allowing the message through
      const wasKicked = await checkAndEvictIfKicked(io, socket, parsed.data.roomId);
      if (wasKicked) return;

      const message = await prisma.message.create({
        data: {
          content: parsed.data.content,
          roomId: parsed.data.roomId,
          userId: socket.data.userId,
        },
      });

      io.to(parsed.data.roomId).emit("chat:message", {
        id: message.id,
        roomId: message.roomId,
        content: message.content,
        userId: message.userId,
        userName: socket.data.userName,
        createdAt: message.createdAt.toISOString(),
      });
    });

    // session:started — mark user as studying in Redis
    socket.on("session:started", async (payload) => {
      const parsed = sessionStartedSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("room:error", toRoomError("Invalid session:started payload."));
        return;
      }

      if (!await socketAllow(socketLimiters.sessionStarted, `session:started:${socket.data.userId}`)) {
        socket.emit("room:error", { message: "rate_limited" });
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
          socket.emit("room:error", toRoomError("Not a member of that room."));
          return;
        }
      }

      // Atomically grab any existing liveSession and finalize it first
      // (handles "tab1 stop emit lost, tab2 starts new session" race)
      const staleLive = await redis.getdel<LiveSession>(getLiveSessionKey(socket.data.userId));
      if (staleLive) {
        try {
          await finalizeSession(io, socket, staleLive);
        } catch (err) {
          logger.error("Failed to finalize stale session on session:started", {
            userId: socket.data.userId,
            error: err instanceof Error ? err.message : String(err),
          });
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
      const roomsToRefresh = new Set(socket.data.joinedRoomIds);
      if (roomId) roomsToRefresh.add(roomId);
      await Promise.all(Array.from(roomsToRefresh).map((id) => publishPresence(io, id)));
    });

    // session:stopped — atomic GETDEL ensures only one path (stopped vs disconnect) finalizes
    socket.on("session:stopped", async () => {
      const liveSession = await redis.getdel<LiveSession>(getLiveSessionKey(socket.data.userId));
      if (!liveSession) return; // Nothing to finalize (or disconnect already claimed it)
      await finalizeSession(io, socket, liveSession);
    });

    // ping:send
    socket.on("ping:send", async (payload) => {
      const parsed = pingEventSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("room:error", toRoomError("Invalid ping payload."));
        return;
      }

      if (!await socketAllow(socketLimiters.pingSend, `ping:send:${socket.data.userId}`)) {
        socket.emit("room:error", { message: "rate_limited" });
        return;
      }

      const ping = await prisma.ping.create({
        data: { fromUserId: socket.data.userId, toUserId: parsed.data.toUserId },
      });

      io.to(`user:${parsed.data.toUserId}`).emit("ping:received", {
        fromUserId: ping.fromUserId,
        createdAt: ping.createdAt.toISOString(),
      });
    });

    // disconnect — atomic GETDEL ensures only one of (stopped, disconnect) finalizes
    socket.on("disconnect", async () => {
      const liveSession = await redis.getdel<LiveSession>(getLiveSessionKey(socket.data.userId));
      if (liveSession) {
        // Finalize quietly — no `session:logged` emit since socket is gone
        try {
          const completedAt = new Date();
          const startedAt = new Date(liveSession.startedAt);
          const durationMin = Math.max(
            1,
            Math.floor((completedAt.getTime() - startedAt.getTime()) / 60_000),
          );
          const studyDayStart = getStudyDayStart(completedAt);
          const roomId = liveSession.roomId ?? null;

          await prisma.$transaction([
            prisma.focusSession.create({
              data: { userId: socket.data.userId, roomId, durationMin, completedAt },
            }),
            prisma.user.update({
              where: { id: socket.data.userId },
              data: { lifetimeFocusMinutes: { increment: durationMin } },
            }),
            prisma.dailyStats.upsert({
              where: { userId_date: { userId: socket.data.userId, date: studyDayStart } },
              update: { totalMinutes: { increment: durationMin } },
              create: { userId: socket.data.userId, date: studyDayStart, totalMinutes: durationMin },
            }),
          ]);

          await redis.incrby(getTodayMinutesKey(socket.data.userId), durationMin);
          await syncKeyExpiry(socket.data.userId);
          await bumpLeaderboards(socket.data.userId, durationMin, completedAt);
          await bumpStreak(socket.data.userId, completedAt);
        } catch {
          // Best-effort on disconnect - don't crash the server
        }
      }

      await Promise.all(
        socket.data.joinedRoomIds.map((roomId) =>
          maybeRemovePresenceMember(io, socket, roomId),
        ),
      );
    });
  });
}
