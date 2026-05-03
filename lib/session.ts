import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export const getServerSession = cache(async () => {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
});

export async function requireSession() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return session;
}

// — getServerSession is React.cache’d (deduped per RSC request). requireSession redirects to /login.
