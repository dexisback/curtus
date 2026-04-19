import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return session;
}
