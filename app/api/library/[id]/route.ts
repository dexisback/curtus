import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireApiSession, withApi } from '@/lib/api-session';
import { limiters, enforce } from '@/lib/ratelimit';
import { isMissingLibraryTableError } from '@/lib/library-db';

type Params = { params: Promise<{ id: string }> };

const patchTitleSchema = z.object({
  title: z.string().max(200),
});

async function bumpOpened(id: string, userId: string) {
  return prisma.libraryItem.updateMany({
    where: { id, userId },
    data: { updatedAt: new Date() },
  });
}

export const PATCH = withApi(async (request: Request, { params }: Params) => {
  const session = await requireApiSession();
  const { id } = await params;

  const raw = await request.text();
  if (!raw.trim()) {
    await enforce(limiters.sessionsRead, session.user.id);
    const updated = await bumpOpened(id, session.user.id).catch((error) => {
      if (isMissingLibraryTableError(error)) return { count: 0 };
      throw error;
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = patchTitleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body.', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  await enforce(limiters.libraryWrite, session.user.id);

  const nextTitle = parsed.data.title.trim() || null;

  const row = await prisma.libraryItem
    .findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    })
    .catch((error) => {
      if (isMissingLibraryTableError(error)) return null;
      throw error;
    });

  if (!row) {
    return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
  }

  await prisma.libraryItem.update({
    where: { id },
    data: { title: nextTitle },
  });

  return NextResponse.json({ ok: true, title: nextTitle });
});

export const DELETE = withApi(async (_request: Request, { params }: Params) => {
  const session = await requireApiSession();
  await enforce(limiters.libraryWrite, session.user.id);
  const { id } = await params;

  const result = await prisma.libraryItem
    .deleteMany({
      where: { id, userId: session.user.id },
    })
    .catch((error) => {
      if (isMissingLibraryTableError(error)) return { count: 0 };
      throw error;
    });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});
