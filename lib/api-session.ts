import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { auth } from "./auth";
import { logger } from "./logger";

// ─── Errors ──────────────────────────────────────────────────────────────────

export class ApiAuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "ApiAuthError";
  }
}

export class ApiRateLimitError extends Error {
  constructor(message = "Too many requests") {
    super(message);
    this.name = "ApiRateLimitError";
  }
}

// ─── Session helper ───────────────────────────────────────────────────────────

export async function requireApiSession() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new ApiAuthError();
    return session;
  } catch (error) {
    if (error instanceof ApiAuthError) throw error;
    // Better Auth can intermittently throw non-Error objects (e.g. ErrorEvent)
    // during provider/session resolution in dev/tunneled flows.
    // Treat this as unauthenticated for API guards instead of returning 500.
    throw new ApiAuthError();
  }
}

// ─── Consistent JSON envelope ─────────────────────────────────────────────────

// Generic ctx so withApi works for routes with and without dynamic params.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withApi<Ctx = any>(
  handler: (req: Request, ctx: Ctx) => Promise<NextResponse>,
): (req: Request, ctx: Ctx) => Promise<NextResponse> {
  return async (req, ctx) => {
    const requestId = crypto.randomUUID();
    const log = logger.child({ requestId, route: new URL(req.url).pathname });

    try {
      const res = await handler(req, ctx);
      res.headers.set("x-request-id", requestId);
      return res;
    } catch (err) {
      if (err instanceof ApiAuthError) {
        log.warn("Unauthenticated request", { message: err.message });
        return NextResponse.json(
          { error: "unauthorized", code: "UNAUTHORIZED" },
          { status: 401, headers: { "x-request-id": requestId } },
        );
      }
      if (err instanceof ApiRateLimitError) {
        log.warn("Rate limit hit", { message: err.message });
        return NextResponse.json(
          { error: "too_many_requests", code: "RATE_LIMITED" },
          { status: 429, headers: { "x-request-id": requestId, "Retry-After": "60" } },
        );
      }
      if (err instanceof ZodError) {
        log.warn("Validation error", { issues: err.issues });
        return NextResponse.json(
          { error: "validation_error", code: "BAD_REQUEST", issues: err.issues },
          { status: 400, headers: { "x-request-id": requestId } },
        );
      }
      log.error("Unhandled API error", {
        name: err instanceof Error ? err.name : "unknown",
        message: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        { error: "internal_server_error", code: "SERVER_ERROR" },
        { status: 500, headers: { "x-request-id": requestId } },
      );
    }
  };
}
