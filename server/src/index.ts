import "dotenv/config";

import { createServer } from "node:http";

import { parse as parseCookieHeader } from "cookie";
import { Server } from "socket.io";

import { prisma } from "./db.js";
import { registerSocketEvents, type SocketData } from "./events.js";

const port = Number(process.env.PORT ?? 4001);
const appOrigin = process.env.BETTER_AUTH_URL;

if (!appOrigin) {
  throw new Error("Missing BETTER_AUTH_URL for socket server CORS.");
}

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("ok");
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

const io = new Server<
  {
    "room:join": (payload: { roomId: string }) => void;
    "room:leave": (payload: { roomId: string }) => void;
    "chat:send": (payload: { roomId: string; content: string }) => void;
    "session:completed": (payload: {
      durationMin: number;
      roomId?: string | null;
      completedAt?: string;
    }) => void;
    "ping:send": (payload: { toUserId: string }) => void;
  },
  {
    presence: (payload: {
      roomId: string;
      memberIds: string[];
      todayMinutes: Record<string, number>;
    }) => void;
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
    "room:error": (payload: { message: string }) => void;
  },
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    origin: appOrigin,
    credentials: true,
  },
});

function extractSessionToken(rawCookieHeader: string | undefined) {
  if (!rawCookieHeader) {
    return null;
  }

  const cookies = parseCookieHeader(rawCookieHeader);

  return (
    cookies["better-auth.session_token"] ??
    cookies["__Secure-better-auth.session_token"] ??
    cookies["better-auth.session-token"] ??
    cookies["__Secure-better-auth.session-token"] ??
    null
  );
}

io.use(async (socket, next) => {
  try {
    const origin = socket.handshake.headers.origin;

    if (origin && origin !== appOrigin) {
      next(new Error("Socket origin not allowed."));
      return;
    }

    const authCookieHeader =
      typeof socket.handshake.auth.cookie === "string"
        ? socket.handshake.auth.cookie
        : socket.handshake.headers.cookie;

    const sessionToken = extractSessionToken(authCookieHeader);

    if (!sessionToken) {
      next(new Error("Missing Better Auth session cookie."));
      return;
    }

    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      next(new Error("Better Auth session invalid or expired."));
      return;
    }

    socket.data.userId = session.userId;
    socket.data.userName = session.user.name ?? session.user.email;
    socket.data.joinedRoomIds = [];
    socket.join(`user:${session.userId}`);

    next();
  } catch (error) {
    next(
      error instanceof Error
        ? error
        : new Error("Socket auth failed unexpectedly."),
    );
  }
});

registerSocketEvents(io);

httpServer.listen(port, () => {
  console.log(`StudyWithMe socket server listening on :${port}`);
});
