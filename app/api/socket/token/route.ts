import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { signSocketAuthToken } from "@/lib/socket-auth-token";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "missing_secret" }, { status: 500 });
  }

  const token = signSocketAuthToken(session.user.id, secret);
  return NextResponse.json({ token }, { headers: { "cache-control": "no-store" } });
}
