import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (session) redirect("/dashboard");

  return <main className="min-h-screen">{children}</main>;
}

// — Auth segment layout (minimal shell around login/signup).
