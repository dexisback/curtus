import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

function buildSignInRedirect(request: NextRequest) {
  const redirectUrl = new URL("/", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  redirectUrl.searchParams.set("next", nextPath);

  return redirectUrl;
}

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const sessionToken = getSessionCookie(request.headers);

  if (sessionToken) {
    return NextResponse.next();
  }

  return NextResponse.redirect(buildSignInRedirect(request));
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/leaderboard/:path*",
    "/settings/:path*",
    "/room/:path*",
  ],
};
