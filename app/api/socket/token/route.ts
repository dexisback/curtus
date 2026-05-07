import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { signSocketAuthToken } from '@/lib/socket-auth-token';
import { logger } from '@/lib/logger';
import { withObservedSpan } from '@/lib/observability';

export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({
    request_id: requestId,
    route: '/api/socket/token',
  });
  return withObservedSpan(
    'api.socket.token',
    {
      'http.method': 'GET',
      'http.route': '/api/socket/token',
      request_id: requestId,
    },
    async () => {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        log.warn('Socket token denied: unauthenticated', {
          event_name: 'api.socket.token.denied',
          error_code: 'UNAUTHORIZED',
        });
        return NextResponse.json(
          { error: 'unauthorized' },
          { status: 401, headers: { 'x-request-id': requestId } },
        );
      }

      const secret = process.env.BETTER_AUTH_SECRET;
      if (!secret) {
        log.error('Socket token secret missing', {
          event_name: 'api.socket.token.secret_missing',
          error_code: 'MISSING_SECRET',
        });
        return NextResponse.json(
          { error: 'missing_secret' },
          { status: 500, headers: { 'x-request-id': requestId } },
        );
      }

      const token = signSocketAuthToken(session.user.id, secret);
      return NextResponse.json(
        { token },
        { headers: { 'cache-control': 'no-store', 'x-request-id': requestId } },
      );
    },
  );
}

// — GET: short-lived signed token for Socket.IO auth.
