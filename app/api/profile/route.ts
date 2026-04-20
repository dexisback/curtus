import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession, withApi } from "@/lib/api-session";
import { parseRequestJson } from "@/lib/api";
import { limiters, enforce } from "@/lib/ratelimit";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(280).optional(),
  image: z
    .string()
    .url()
    .max(500)
    .refine((u) => u.startsWith("https://"), { message: "Image URL must be https." })
    .optional(),
});

export const PATCH = withApi(async (request: Request) => {
  const session = await requireApiSession();
  await enforce(limiters.profileWrite, session.user.id);

  const body = await parseRequestJson(request, patchSchema);
  if (!body.success) return body.response;

  const { name, bio, image } = body.data;

  if (name === undefined && bio === undefined && image === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(image !== undefined ? { image } : {}),
    },
    select: { id: true, name: true, bio: true, image: true, email: true },
  });

  return NextResponse.json(updated);
});
