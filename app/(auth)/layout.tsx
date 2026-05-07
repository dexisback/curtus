import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (session) redirect('/dashboard');

  return (
    <main className="flex min-h-dvh flex-col overflow-x-hidden overflow-y-auto bg-[#f7f5f2]">
      {children}
    </main>
  );
}

// — Auth segment layout (minimal shell around login/signup).
