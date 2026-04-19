import type { Server, Socket } from "socket.io";
import { z } from "zod";

import { prisma } from "./db.js";
import { redis } from "./redis.js";

const DAY_RESET_HOUR_UTC = 5;

const roomEventSchema = z.object({
  roomId: z.string().min(1),
});

const chatEventSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().trim().min(1).max(1_000),
});

const sessionCompletedSchema = z.object({
  durationMin: z.number().int().positive().max(24 * 60),
  roomId: z.string().min(1).nullable().optional(),
  completedAt: z.string().optional(),
});

const pingEventSchema = z.object({
  toUserId: z.string().min(1),
});

export type PresencePayload = {
  roomId: string;
  memberIds: string[];
  todayMinutes: Record<string, number>;
};

export type SocketData = {
  userId: string;
  userName: string;
  joinedRoomIds: string[];
};

type ClientToServerEvents = {
  "room:join": (payload: z.infer<typeof roomEventSchema>) => void;
  "room:leave": (payload: z.infer<typeof roomEventSchema>) => void;
  "chat:send": (payload: z.infer<typeof chatEventSchema>) => void;
  "session:completed": (payload: z.infer<typeof sessionCompletedSchema>) => void;
  "ping:send": (payload: z.infer<typeof pingEventSchema>) => void;
};

type ServerToClientEvents = {
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

function getRoomMembersKey(roomId: string) {
  return `room:${roomId}:members`;
}

function getTodayMinutesKey(userId: string) {
  return `user:${userId}:todayMinutes`;
}

function getSecondsUntilNextFiveAm(now = new Date()) {
  const nextReset = new Date(now);
  nextReset.setUTCHours(DAY_RESET_HOUR_UTC, 0, 0, 0);

  if (now >= nextReset) {
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  }

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

function toRoomError(message: string) {
  return {
    message,
  };
}

function addJoinedRoom(socket: StudySocket, roomId: string) {
  if (!socket.data.joinedRoomIds.includes(roomId)) {
    socket.data.joinedRoomIds.push(roomId);
  }
}

function removeJoinedRoom(socket: StudySocket, roomId: string) {
  socket.data.joinedRoomIds = socket.data.joinedRoomIds.filter(
    (joinedRoomId) => joinedRoomId !== roomId,
  );
}

async function syncKeyExpiry(userId: string, roomId?: string) {
  const ttl = getSecondsUntilNextFiveAm();

  await Promise.all([
    redis.expire(getTodayMinutesKey(userId), ttl),
    roomId ? redis.expire(getRoomMembersKey(roomId), ttl) : Promise.resolve(1),
  ]);
}

async function publishPresence(io: StudyServer, roomId: string) {
  const memberIds = await redis.smembers<string[]>(getRoomMembersKey(roomId));
  const uniqueMemberIds = Array.from(new Set(memberIds)).sort();
  const minutePairs = await Promise.all(
    uniqueMemberIds.map(async (memberId) => [
      memberId,
      (await redis.get<number>(getTodayMinutesKey(memberId))) ?? 0,
    ]),
  );

  io.to(roomId).emit("presence", {
    roomId,
    memberIds: uniqueMemberIds,
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
    (roomSocket) => roomSocket.data.userId === socket.data.userId,
  );

  if (!userStillPresent) {
    await redis.srem(getRoomMembersKey(roomId), socket.data.userId);
  }

  await publishPresence(io, roomId);
}

export function registerSocketEvents(io: StudyServer) {
  io.on("connection", (socket) => {
    socket.on("room:join", async (payload) => {
      const parsed = roomEventSchema.safeParse(payload);

      if (!parsed.success) {
        socket.emit("room:error", toRoomError("Invalid room join payload."));
        return;
      }

      const room = await prisma.room.findUnique({
        where: { id: parsed.data.roomId },
        select: { id: true },
      });

      if (!room) {
        socket.emit("room:error", toRoomError("Room not found."));
        return;
      }

      socket.join(parsed.data.roomId);
      addJoinedRoom(socket, parsed.data.roomId);

      await redis.sadd(getRoomMembersKey(parsed.data.roomId), socket.data.userId);
      await syncKeyExpiry(socket.data.userId, parsed.data.roomId);
      await publishPresence(io, parsed.data.roomId);
    });

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

    socket.on("session:completed", async (payload) => {
      const parsed = sessionCompletedSchema.safeParse(payload);

      if (!parsed.success) {
        socket.emit("room:error", toRoomError("Invalid session payload."));
        return;
      }

      const completedAt = parsed.data.completedAt
        ? new Date(parsed.data.completedAt)
        : new Date();

      if (Number.isNaN(completedAt.getTime())) {
        socket.emit("room:error", toRoomError("Invalid completion timestamp."));
        return;
      }

      const studyDayStart = getStudyDayStart(completedAt);

      const [, updatedUser] = await prisma.$transaction([
        prisma.focusSession.create({
          data: {
            userId: socket.data.userId,
            roomId: parsed.data.roomId ?? null,
            durationMin: parsed.data.durationMin,
            completedAt,
          },
        }),
        prisma.user.update({
          where: { id: socket.data.userId },
          data: {
            lifetimeFocusMinutes: {
              increment: parsed.data.durationMin,
            },
          },
        }),
        prisma.dailyStats.upsert({
          where: {
            userId_date: {
              userId: socket.data.userId,
              date: studyDayStart,
            },
          },
          update: {
            totalMinutes: {
              increment: parsed.data.durationMin,
            },
          },
          create: {
            userId: socket.data.userId,
            date: studyDayStart,
            totalMinutes: parsed.data.durationMin,
          },
        }),
      ]);

      await redis.incrby(
        getTodayMinutesKey(socket.data.userId),
        parsed.data.durationMin,
      );
      await syncKeyExpiry(socket.data.userId);

      const roomsToRefresh = new Set(socket.data.joinedRoomIds);

      if (parsed.data.roomId) {
        roomsToRefresh.add(parsed.data.roomId);
      }

      await Promise.all(
        Array.from(roomsToRefresh).map((roomId) => publishPresence(io, roomId)),
      );

      socket.emit("session:logged", {
        durationMin: parsed.data.durationMin,
        lifetimeFocusMinutes: updatedUser.lifetimeFocusMinutes,
        roomId: parsed.data.roomId ?? null,
      });
    });

    socket.on("ping:send", async (payload) => {
      const parsed = pingEventSchema.safeParse(payload);

      if (!parsed.success) {
        socket.emit("room:error", toRoomError("Invalid ping payload."));
        return;
      }

      const ping = await prisma.ping.create({
        data: {
          fromUserId: socket.data.userId,
          toUserId: parsed.data.toUserId,
        },
      });

      io.to(`user:${parsed.data.toUserId}`).emit("ping:received", {
        fromUserId: ping.fromUserId,
        createdAt: ping.createdAt.toISOString(),
      });
    });

    socket.on("disconnect", async () => {
      await Promise.all(
        socket.data.joinedRoomIds.map((roomId) =>
          maybeRemovePresenceMember(io, socket, roomId),
        ),
      );
    });
  });
}
