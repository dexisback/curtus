import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession, withApi } from "@/lib/api-session";
import { parseRequestJson } from "@/lib/api";
import { limiters, enforce } from "@/lib/ratelimit";
import { parseYouTubeInput } from "@/lib/youtube";
import { isMissingLibraryTableError } from "@/lib/library-db";

const createLibrarySchema = z.object({
  url: z.string().trim().min(1).max(500),
});

export const GET = withApi(async () => {
  const session = await requireApiSession();
  await enforce(limiters.sessionsRead, session.user.id);

  const items = await prisma.libraryItem
    .findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        url: true,
        mediaKind: true,
        videoId: true,
        playlistId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    .catch((error) => {
      if (isMissingLibraryTableError(error)) return [];
      throw error;
    });

  return NextResponse.json({
    items: items.map((item) => {
      const parsed = parseYouTubeInput(item.url);
      return {
        ...item,
        embedUrl: parsed?.embedUrl ?? null,
      };
    }),
  });
});

export const POST = withApi(async (request: Request) => {
  const session = await requireApiSession();
  await enforce(limiters.profileWrite, session.user.id);

  const parsed = await parseRequestJson(request, createLibrarySchema);
  if (!parsed.success) return parsed.response;

  const yt = parseYouTubeInput(parsed.data.url);
  if (!yt) {
    return NextResponse.json({ error: "Please enter a valid YouTube video or playlist URL." }, { status: 400 });
  }

  const created = await prisma.libraryItem
    .create({
      data: {
        userId: session.user.id,
        url: yt.normalizedUrl,
        mediaKind: yt.kind,
        videoId: yt.videoId,
        playlistId: yt.playlistId,
      },
      select: {
        id: true,
        url: true,
        mediaKind: true,
        videoId: true,
        playlistId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    .catch((error) => {
      if (!isMissingLibraryTableError(error)) throw error;
      return null;
    });

  if (!created) {
    return NextResponse.json(
      { error: "Library is not ready yet. Please run database migrations and retry." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      item: {
        ...created,
        embedUrl: yt.embedUrl,
      },
    },
    { status: 201 },
  );
});

// — Library API: list and add YouTube video/playlist URLs for current user.
