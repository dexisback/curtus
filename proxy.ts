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

  // Reverse guard: signed-in users hitting login/signup go straight to dashboard
  if (AUTH_ROUTES.has(pathname)) {
    if (hasSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
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
    "/profile/:path*",
    "/leaderboard/:path*",
    "/settings/:path*",
    "/room/:path*",
  ],
};
