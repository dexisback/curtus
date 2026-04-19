import { NextResponse } from "next/server";
import { z, type ZodTypeAny } from "zod";

function badRequest(message: string, issues?: unknown) {
  return NextResponse.json(
    {
      error: message,
      issues,
    },
    { status: 400 },
  );
}

export async function parseRequestJson<TSchema extends ZodTypeAny>(
  request: Request,
  schema: TSchema,
) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return {
      success: false as const,
      response: badRequest("Invalid JSON body."),
    };
  }

  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return {
      success: false as const,
      response: badRequest("Invalid request body.", parsed.error.flatten()),
    };
  }

  return {
    success: true as const,
    data: parsed.data,
  };
}

export function zodErrorResponse(error: z.ZodError) {
  return badRequest("Invalid request body.", error.flatten());
}
