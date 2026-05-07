import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { withObservedSpan } from '@/lib/observability';

const handlers = toNextJsHandler(auth);

export async function GET(request: Request) {
  return withObservedSpan(
    'api.auth.handler.get',
    { 'http.method': 'GET', 'http.route': '/api/auth/[...all]' },
    () => handlers.GET(request),
  );
}

export async function POST(request: Request) {
  return withObservedSpan(
    'api.auth.handler.post',
    { 'http.method': 'POST', 'http.route': '/api/auth/[...all]' },
    () => handlers.POST(request),
  );
}

// — Better Auth HTTP adapter for this app (sign-in, session, callbacks).
