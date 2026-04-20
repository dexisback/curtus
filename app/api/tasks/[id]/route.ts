import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession, withApi } from "@/lib/api-session";
import { parseRequestJson } from "@/lib/api";
import { limiters, enforce } from "@/lib/ratelimit";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  isCompleted: z.boolean().optional(),
  type: z.enum(["DAILY", "YEARLY", "DEADLINE"]).optional(),
});

async function resolveTask(id: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!task || task.userId !== userId) return null;
  return task;
}

export const PATCH = withApi(async (request: Request, { params }: Params) => {
  const session = await requireApiSession();
  await enforce(limiters.tasksWrite, session.user.id);
  const { id } = await params;

  const task = await resolveTask(id, session.user.id);
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const body = await parseRequestJson(request, patchSchema);
  if (!body.success) return body.response;

  const { title, description, deadline, isCompleted, type } = body.data;

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
      ...(isCompleted !== undefined ? { isCompleted } : {}),
      ...(type !== undefined ? { type } : {}),
    },
    select: {
      id: true, title: true, description: true,
      isCompleted: true, deadline: true, type: true, createdAt: true, updatedAt: true,
    },
  });

  return NextResponse.json(updated);
});

export const DELETE = withApi(async (_request: Request, { params }: Params) => {
  const session = await requireApiSession();
  await enforce(limiters.tasksWrite, session.user.id);
  const { id } = await params;

  const task = await resolveTask(id, session.user.id);
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
});
