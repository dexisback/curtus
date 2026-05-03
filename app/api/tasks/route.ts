import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession, withApi } from "@/lib/api-session";
import { parseRequestJson } from "@/lib/api";
import { limiters, enforce } from "@/lib/ratelimit";

const listQuerySchema = z.object({
  type: z.enum(["DAILY", "YEARLY", "DEADLINE"]).optional(),
  completed: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  deadline: z.string().datetime().optional(),
  type: z.enum(["DAILY", "YEARLY", "DEADLINE"]).default("DAILY"),
});

export const GET = withApi(async (request: Request) => {
  const session = await requireApiSession();
  await enforce(limiters.statsRead, session.user.id);
  const url = new URL(request.url);

  const parsed = listQuerySchema.safeParse({
    type: url.searchParams.get("type") ?? undefined,
    completed: url.searchParams.get("completed") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { type, completed, cursor, limit } = parsed.data;

  const items = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      ...(type ? { type } : {}),
      ...(completed !== undefined ? { isCompleted: completed } : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: {
      id: true, title: true, description: true,
      isCompleted: true, deadline: true, type: true, createdAt: true, updatedAt: true,
    },
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? page[page.length - 1]?.id : null;

  return NextResponse.json({ items: page, nextCursor });
});

export const POST = withApi(async (request: Request) => {
  const session = await requireApiSession();
  await enforce(limiters.tasksWrite, session.user.id);

  const body = await parseRequestJson(request, createSchema);
  if (!body.success) return body.response;

  const { title, description, deadline, type } = body.data;

  const task = await prisma.task.create({
    data: {
      title,
      description,
      deadline: deadline ? new Date(deadline) : null,
      type,
      userId: session.user.id,
    },
    select: {
      id: true, title: true, description: true,
      isCompleted: true, deadline: true, type: true, createdAt: true, updatedAt: true,
    },
  });

  return NextResponse.json(task, { status: 201 });
});

// — GET: todos; POST: create todo.
