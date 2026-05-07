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
    <main className="flex min-h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overflow-x-hidden bg-[#f7f5f2]">
      {children}
    </main>
  );
}

// — Auth segment layout (minimal shell around login/signup).
