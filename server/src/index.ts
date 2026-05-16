import 'dotenv/config';

import { createServer } from 'node:http';

import { parse as parseCookieHeader } from 'cookie';
import { Server } from 'socket.io';

import { prisma } from './db.js';
import { redis } from './redis.js';
import { logger } from './logger.js';
import { verifySocketAuthToken } from './socket-auth-token.js';
import { initServerObservability, withSocketSpan } from './observability.js';
import {
  metricsContentType,
  renderMetrics,
  redisErrorsTotal,
  redisOpDurationMs,
  socketActiveConnections,
  socketConnectionsTotal,
  socketReconnectsTotal,
} from './metrics.js';
import {
  registerSocketEvents,
  type SocketData,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from './events.js';
import { getSocketCorsOrigins } from './auth-urls.js';

const port = Number(process.env.PORT ?? 4001);
const socketCorsOrigins = getSocketCorsOrigins();
const socketCorsOriginSet = new Set(socketCorsOrigins);
const recentConnectionByUser = new Map<string, number>();

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  if (socketCorsOriginSet.has(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    // Allow Vercel deployment hosts in production (preview + prod aliases).
    if (hostname === 'vercel.app' || hostname.endsWith('.vercel.app'))
      return true;
  } catch {
    return false;
  }
  return false;
}

const httpServer = createServer(async (request, response) => {
  const requestUrl = request.url ?? '/';
  const pathname = (() => {
    try {
      return new URL(requestUrl, 'http://localhost').pathname;
    } catch {
      return requestUrl;
    }
  })();
  const normalizedPath =
    pathname.endsWith('/') && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;
  const originHeader = request.headers.origin;
  const allowedOrigin =
    typeof originHeader === 'string' && isAllowedOrigin(originHeader)
      ? originHeader
      : null;

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      ...(allowedOrigin
        ? { 'access-control-allow-origin': allowedOrigin }
        : {}),
      'access-control-allow-methods': 'GET,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
      ...(allowedOrigin ? { 'access-control-allow-credentials': 'true' } : {}),
      vary: 'Origin',
    });
    response.end();
    return;
  }

  if (normalizedPath === '/health') {
    try {
      const [dbOk, redisOk] = await Promise.all([
        prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
        (async () => {
          const done = redisOpDurationMs.startTimer({ operation: 'ping' });
          try {
            const pong = await redis.ping();
            return pong === 'PONG';
          } catch {
            redisErrorsTotal.inc({ operation: 'ping' });
            return false;
          } finally {
            done();
          }
        })(),
      ]);

      const body = JSON.stringify({
        ok: dbOk && redisOk,
        db: dbOk,
        redis: redisOk,
        uptime: process.uptime(),
        version: process.env.npm_package_version ?? 'unknown',
      });

      response.writeHead(dbOk && redisOk ? 200 : 503, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(body),
        ...(allowedOrigin
          ? { 'access-control-allow-origin': allowedOrigin }
          : {}),
        ...(allowedOrigin
          ? { 'access-control-allow-credentials': 'true' }
          : {}),
        vary: 'Origin',
      });
      response.end(body);
    } catch {
      response.writeHead(503, {
        'content-type': 'text/plain',
        ...(allowedOrigin
          ? { 'access-control-allow-origin': allowedOrigin }
          : {}),
        ...(allowedOrigin
          ? { 'access-control-allow-credentials': 'true' }
          : {}),
        vary: 'Origin',
      });
      response.end('error');
    }
    return;
  }

  if (normalizedPath === '/metrics') {
    try {
      const body = await renderMetrics();
      response.writeHead(200, {
        'content-type': metricsContentType(),
        ...(allowedOrigin
          ? { 'access-control-allow-origin': allowedOrigin }
          : {}),
        ...(allowedOrigin
          ? { 'access-control-allow-credentials': 'true' }
          : {}),
        vary: 'Origin',
      });
      response.end(body);
    } catch (error) {
      logger.error('Failed to render metrics', {
        error_code: 'METRICS_RENDER_FAILED',
        error: error instanceof Error ? error.message : String(error),
      });
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('metrics_unavailable');
    }
    return;
  }

  if (normalizedPath === '/diag') {
    const body = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV ?? 'unknown',
        origins: socketCorsOrigins,
        originCount: socketCorsOrigins.length,
        rawCorsOrigins: process.env.CORS_ORIGINS ?? null,
      },
      null,
      2,
    );

    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(body),
      ...(allowedOrigin
        ? { 'access-control-allow-origin': allowedOrigin }
        : {}),
      ...(allowedOrigin ? { 'access-control-allow-credentials': 'true' } : {}),
      vary: 'Origin',
    });
    response.end(body);
    return;
  }

  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('Not found');
});

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    origin: (origin, cb) => {
      // Allow non-browser or same-origin server probes without Origin header.
      if (!origin) return cb(null, true);
      cb(null, isAllowedOrigin(origin));
    },
    credentials: true,
  },
  pingTimeout: 25_000,
  pingInterval: 20_000,
  connectTimeout: 10_000,
  maxHttpBufferSize: 32_000,
});

function extractSessionToken(rawCookieHeader: string | undefined) {
  if (!rawCookieHeader) return null;
  const cookies = parseCookieHeader(rawCookieHeader);
  return (
    cookies['better-auth.session_token'] ??
    cookies['__Secure-better-auth.session_token'] ??
    cookies['better-auth.session-token'] ??
    cookies['__Secure-better-auth.session-token'] ??
    null
  );
}

io.use(async (socket, next) => {
  const requestId =
    typeof socket.handshake.auth?.requestId === 'string' &&
    socket.handshake.auth.requestId.length > 0
      ? socket.handshake.auth.requestId
      : crypto.randomUUID();
  const reject = (reason: string) => {
    logger.warn('Socket auth rejected', {
      reason,
      error_code: 'SOCKET_AUTH_REJECTED',
      socket_id: socket.id,
      request_id: requestId,
      origin: socket.handshake.headers.origin ?? null,
      hasCookie: Boolean(socket.handshake.headers.cookie),
      hasSocketToken:
        typeof socket.handshake.auth?.socketToken === 'string' &&
        socket.handshake.auth.socketToken.length > 0,
    });
    next(new Error(reason));
  };
  try {
    await withSocketSpan(
      'socket.auth',
      {
        event_name: 'socket.auth',
        socket_id: socket.id,
        request_id: requestId,
      },
      async () => {
        const origin = socket.handshake.headers.origin;
        if (origin && !isAllowedOrigin(origin)) {
          reject('Socket origin not allowed.');
          return;
        }

        const authCookieHeader =
          typeof socket.handshake.auth.cookie === 'string'
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
            typeof socket.handshake.auth.socketToken === 'string'
              ? socket.handshake.auth.socketToken
              : null;
          const secret = process.env.BETTER_AUTH_SECRET;
          if (!socketToken || !secret) {
            reject('Missing socket authentication.');
            return;
          }

          const verifiedUserId = verifySocketAuthToken(socketToken, secret);
          if (!verifiedUserId) {
            reject('Invalid socket authentication token.');
            return;
          }

          const user = await prisma.user.findUnique({
            where: { id: verifiedUserId },
            select: { id: true, name: true, email: true },
          });
          if (!user) {
            reject('Socket auth user not found.');
            return;
          }

          userId = user.id;
          userName = user.name ?? user.email;
        }

        if (!userId) {
          reject('Socket auth user missing after verification.');
          return;
        }

        socket.data.userId = userId;
        socket.data.userName = userName ?? 'Unknown';
        socket.data.joinedRoomIds = [];
        socket.data.roomJoinReasons = {};
        socket.data.requestId = requestId;
        socket.join(`user:${userId}`);

        logger.info('Socket connected', {
          event_name: 'socket.connected',
          socket_id: socket.id,
          request_id: requestId,
          user_id_hash: userId,
        });
        socketConnectionsTotal.inc();
        socketActiveConnections.inc();
        const lastSeen = recentConnectionByUser.get(userId);
        const now = Date.now();
        if (lastSeen && now - lastSeen < 15_000) {
          socketReconnectsTotal.inc();
        }
        recentConnectionByUser.set(userId, now);
        next();
      },
    );
  } catch (error) {
    logger.error('Socket auth exception', {
      error_code: 'SOCKET_AUTH_EXCEPTION',
      socket_id: socket.id,
      request_id: requestId,
      origin: socket.handshake.headers.origin ?? null,
      error: error instanceof Error ? error.message : 'unknown',
    });
    next(
      error instanceof Error
        ? error
        : new Error('Socket auth failed unexpectedly.'),
    );
  }
});

registerSocketEvents(io);

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Shutdown signal received', { signal });

  httpServer.close();

  io.emit('room:error', { message: 'server_shutdown' });

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      resolve();
    }, 10_000);

    io.close(() => {
      clearTimeout(timeout);
      resolve();
    });
  });

  logger.info('Server shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', {
    error_code: 'UNHANDLED_REJECTION',
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error_code: 'UNCAUGHT_EXCEPTION',
    error: error.message,
  });
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    socketActiveConnections.dec();
  });
});

void initServerObservability()
  .then(() => {
    httpServer.listen(port, () => {
      logger.info('StudyWithMe socket server listening', { port });
    });
  })
  .catch((error) => {
    logger.error('Failed to initialize server observability', {
      error_code: 'OBS_INIT_FAILED',
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });

// — index.ts: Standalone Socket.IO + /health. Cookie or signed socket token → registerSocketEvents; graceful shutdown.
