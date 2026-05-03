import "dotenv/config";

import { createServer } from "node:http";

import { parse as parseCookieHeader } from "cookie";
import { Server } from "socket.io";

import { prisma } from "./db.js";
import { redis } from "./redis.js";
import { logger } from "./logger.js";
import { verifySocketAuthToken } from "./socket-auth-token.js";
import {
  registerSocketEvents,
  type SocketData,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "./events.js";

const port = Number(process.env.PORT ?? 4001);
const appOrigin = process.env.BETTER_AUTH_URL;

if (!appOrigin) {
  throw new Error("Missing BETTER_AUTH_URL for socket server CORS.");
}

// ─── HTTP server ─────────────────────────────────────────────────────────────

const httpServer = createServer(async (request, response) => {
  if (request.url === "/health") {
    try {
      const [dbOk, redisOk] = await Promise.all([
        prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
        redis.ping().then((r) => r === "PONG").catch(() => false),
      ]);

      const body = JSON.stringify({
        ok: dbOk && redisOk,
        db: dbOk,
        redis: redisOk,
        uptime: process.uptime(),
        version: process.env.npm_package_version ?? "unknown",
      });

      response.writeHead(dbOk && redisOk ? 200 : 503, {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(body),
      });
      response.end(body);
    } catch {
      response.writeHead(503, { "content-type": "text/plain" });
      response.end("error");
    }
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

// ─── Socket.IO server ─────────────────────────────────────────────────────────

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    origin: appOrigin,
    credentials: true,
  },
  // Engine.IO tuning
  pingTimeout: 25_000,
  pingInterval: 20_000,
  connectTimeout: 10_000,
  maxHttpBufferSize: 32_000,
});

// ─── Auth middleware ──────────────────────────────────────────────────────────

function extractSessionToken(rawCookieHeader: string | undefined) {
  if (!rawCookieHeader) return null;
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
    let userId: string | null = null;
    let userName: string | null = null;

    if (sessionToken) {
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true },
      });
      if (session && session.expiresAt > new Date()) {
        userId = session.userId;
        userName = session.user.name ?? session.user.email;
      }
    }

    if (!userId) {
      const socketToken =
        typeof socket.handshake.auth.socketToken === "string"
          ? socket.handshake.auth.socketToken
          : null;
      const secret = process.env.BETTER_AUTH_SECRET;
      if (!socketToken || !secret) {
        next(new Error("Missing socket authentication."));
        return;
      }

      const verifiedUserId = verifySocketAuthToken(socketToken, secret);
      if (!verifiedUserId) {
        next(new Error("Invalid socket authentication token."));
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: verifiedUserId },
        select: { id: true, name: true, email: true },
      });
      if (!user) {
        next(new Error("Socket auth user not found."));
        return;
      }

      userId = user.id;
      userName = user.name ?? user.email;
    }

    socket.data.userId = userId;
    socket.data.userName = userName ?? "Unknown";
    socket.data.joinedRoomIds = [];
    socket.join(`user:${userId}`);

    logger.info("Socket connected", { socketId: socket.id, userId });
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error("Socket auth failed unexpectedly."));
  }
});

registerSocketEvents(io);

// ─── Graceful shutdown ────────────────────────────────────────────────────────

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Shutdown signal received", { signal });

  // Stop accepting new connections
  httpServer.close();

  // Notify connected clients
  io.emit("room:error", { message: "server_shutdown" });

  // Give in-flight handlers 10s to complete
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      logger.warn("Forced shutdown after timeout");
      resolve();
    }, 10_000);

    io.close(() => {
      clearTimeout(timeout);
      resolve();
    });
  });

  logger.info("Server shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ─── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(port, () => {
  logger.info("StudyWithMe socket server listening", { port });
});
