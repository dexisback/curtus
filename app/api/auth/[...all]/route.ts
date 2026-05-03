import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);

// — Better Auth HTTP adapter for this app (sign-in, session, callbacks).
