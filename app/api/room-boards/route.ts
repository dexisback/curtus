import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession, withApi } from "@/lib/api-session";
import { limiters, enforce } from "@/lib/ratelimit";
import { getRoomTimerBoards, type RoomBoardsMode } from "@/lib/room-timer-boards";

const querySchema = z.object({
  mode: z.enum(["dashboard", "rooms"]).default("dashboard"),
});

export const GET = withApi(async (request: Request) => {
  const session = await requireApiSession();
  await enforce(limiters.sessionsRead, session.user.id);

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    mode: url.searchParams.get("mode") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.flatten() }, { status: 400 });
  }

  const mode = parsed.data.mode as RoomBoardsMode;
  const boards = await getRoomTimerBoards(session.user.id, mode);
  return NextResponse.json({ boards });
});

// — GET: room timer boards for dashboard or /rooms (Prisma + Redis live sessions).
