import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = new Set(["/login", "/signup"]);

function buildLoginRedirect(request: NextRequest): URL {
  const url = new URL("/login", request.url);
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.searchParams.set("next", next);
  return url;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request.headers));

  // Keep auth routes always reachable.
  // A stale/invalid cookie can exist even when the server session is gone,
  // and forcing /login -> /dashboard here causes redirect loops.
  if (AUTH_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Forward guard: protected routes require a session cookie
  if (!hasSession) {
    return NextResponse.redirect(buildLoginRedirect(request));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/dashboard/:path*",
    "/rooms/:path*",
    "/profile/:path*",
    "/leaderboard/:path*",
    "/settings/:path*",
    "/room/:path*",
  ],
};
