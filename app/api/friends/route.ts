import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession, withApi } from "@/lib/api-session";
import { parseRequestJson } from "@/lib/api";
import { limiters, enforce } from "@/lib/ratelimit";

const addFriendSchema = z.object({
  email: z.string().email().max(255),
});

export const GET = withApi(async () => {
  const session = await requireApiSession();
  await enforce(limiters.statsRead, session.user.id);
  const userId = session.user.id;

  const pings = await prisma.ping.findMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      createdAt: true,
      fromUserId: true,
      toUserId: true,
      fromUser: { select: { id: true, name: true, email: true, image: true } },
      toUser: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  const map = new Map<string, { id: string; name: string; email: string; image: string | null; connectedAt: string }>();
  for (const row of pings) {
    const other = row.fromUserId === userId ? row.toUser : row.fromUser;
    if (!other || map.has(other.id)) continue;
    map.set(other.id, {
      id: other.id,
      name: other.name ?? "Unknown",
      email: other.email,
      image: other.image ?? null,
      connectedAt: row.createdAt.toISOString(),
    });
  }

  return NextResponse.json({ friends: Array.from(map.values()) });
});

export const POST = withApi(async (request: Request) => {
  const session = await requireApiSession();
  await enforce(limiters.profileWrite, session.user.id);
  const userId = session.user.id;

  const body = await parseRequestJson(request, addFriendSchema);
  if (!body.success) return body.response;

  const email = body.data.email.trim().toLowerCase();
  const target = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, image: true },
  });
  if (!target) {
    return NextResponse.json({ error: "No user found with this email." }, { status: 404 });
  }
  if (target.id === userId) {
    return NextResponse.json({ error: "You cannot add yourself." }, { status: 400 });
  }

  const existing = await prisma.ping.findFirst({
    where: {
      OR: [
        { fromUserId: userId, toUserId: target.id },
        { fromUserId: target.id, toUserId: userId },
      ],
    },
    select: { id: true, createdAt: true },
  });

  let connectedAt = existing?.createdAt ?? null;
  if (!existing) {
    const created = await prisma.ping.create({
      data: { fromUserId: userId, toUserId: target.id },
      select: { createdAt: true },
    });
    connectedAt = created.createdAt;
  }

  return NextResponse.json({
    friend: {
      id: target.id,
      name: target.name ?? "Unknown",
      email: target.email,
      image: target.image ?? null,
      connectedAt: (connectedAt ?? new Date()).toISOString(),
    },
  });
});

// — GET: friend list; POST: request by email. Session required.
