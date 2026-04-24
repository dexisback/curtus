import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function getServerSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    // Better Auth can intermittently throw APIError during provider/session fetch.
    // Treat it as unauthenticated instead of crashing the whole route tree.
    return null;
  }
}

export async function requireSession() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return session;
}
