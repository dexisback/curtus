import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { trace } from '@opentelemetry/api';
import { ZodError } from 'zod';
import { auth } from './auth';
import { logger } from './logger';
import {
  extractTraceContextFromRequest,
  withObservedSpan,
} from './observability';

export class ApiAuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'ApiAuthError';
  }
}

export class ApiRateLimitError extends Error {
  constructor(message = 'Too many requests') {
    super(message);
    this.name = 'ApiRateLimitError';
  }
}

export async function requireApiSession() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new ApiAuthError();
    return session;
  } catch (error) {
    if (error instanceof ApiAuthError) throw error;
    throw new ApiAuthError();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withApi<Ctx = any>(
  handler: (req: Request, ctx: Ctx) => Promise<NextResponse>,
): (req: Request, ctx: Ctx) => Promise<NextResponse> {
  return async (req, ctx) => {
    const requestId = crypto.randomUUID();
    const route = new URL(req.url).pathname;
    const parentContext = extractTraceContextFromRequest(req);
    const log = logger.child({ request_id: requestId, route });

    return withObservedSpan(
      'api.request',
      {
        'http.method': req.method,
        'http.route': route,
        'http.target': route,
        request_id: requestId,
      },
      async () => {
        try {
          const started = Date.now();
          const res = await handler(req, ctx);
          const spanContext = trace.getActiveSpan()?.spanContext();
          const durationMs = Date.now() - started;
          res.headers.set('x-request-id', requestId);
          if (spanContext) {
            res.headers.set('x-trace-id', spanContext.traceId);
          }
          log.info('API request complete', {
            event_name: 'api.request.complete',
            duration_ms: durationMs,
            status_code: res.status,
          });
          return res;
        } catch (err) {
          if (err instanceof ApiAuthError) {
            log.warn('Unauthenticated request', {
              event_name: 'api.request.auth_error',
              error_code: 'UNAUTHORIZED',
              message: err.message,
            });
            return NextResponse.json(
              { error: 'unauthorized', code: 'UNAUTHORIZED' },
              { status: 401, headers: { 'x-request-id': requestId } },
            );
          }
          if (err instanceof ApiRateLimitError) {
            log.warn('Rate limit hit', {
              event_name: 'api.request.rate_limited',
              error_code: 'RATE_LIMITED',
              message: err.message,
            });
            return NextResponse.json(
              { error: 'too_many_requests', code: 'RATE_LIMITED' },
              {
                status: 429,
                headers: { 'x-request-id': requestId, 'Retry-After': '60' },
              },
            );
          }
          if (err instanceof ZodError) {
            log.warn('Validation error', {
              event_name: 'api.request.validation_error',
              error_code: 'BAD_REQUEST',
              issues: err.issues,
            });
            return NextResponse.json(
              {
                error: 'validation_error',
                code: 'BAD_REQUEST',
                issues: err.issues,
              },
              { status: 400, headers: { 'x-request-id': requestId } },
            );
          }
          log.error('Unhandled API error', {
            event_name: 'api.request.exception',
            error_code: 'SERVER_ERROR',
            name: err instanceof Error ? err.name : 'unknown',
            message: err instanceof Error ? err.message : String(err),
          });
          return NextResponse.json(
            { error: 'internal_server_error', code: 'SERVER_ERROR' },
            { status: 500, headers: { 'x-request-id': requestId } },
          );
        }
      },
      parentContext,
    );
  };
}

// — api-session.ts: API auth (requireApiSession), error types, and withApi wrapper (request id, JSON errors).
