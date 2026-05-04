import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession, withApi } from "@/lib/api-session";
import { parseRequestJson } from "@/lib/api";
import { limiters, enforce } from "@/lib/ratelimit";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  email: z.string().trim().email().max(320).optional(),
  bio: z.string().trim().max(280).optional(),
  image: z
    .string()
    .max(1_500_000)
    .refine((u) => u.startsWith("https://") || u.startsWith("data:image/"), {
      message: "Image must be an https URL or uploaded image data.",
    })
    .optional(),
});

export const PATCH = withApi(async (request: Request) => {
  const session = await requireApiSession();
  await enforce(limiters.profileWrite, session.user.id);

  const body = await parseRequestJson(request, patchSchema);
  if (!body.success) return body.response;

  const { name, email, bio, image } = body.data;

  if (name === undefined && email === undefined && bio === undefined && image === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(image !== undefined ? { image } : {}),
      },
      select: { id: true, name: true, bio: true, image: true, email: true },
    });

    if (image !== undefined) {
      revalidatePath("/leaderboard");
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    }
    throw error;
  }
});

// — GET/PATCH: current user profile (name, bio, image).
