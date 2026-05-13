import Sidebar from '@/components/sideBar';
import DashboardNavbar from '@/components/dashboard-navbar';
import FloatingDock from '@/components/floatingDock';
import { MobileNavProvider } from '@/components/mobile-nav-context';
import { getCachedDashboardShellUser } from '@/lib/rsc-cache';
import { getServerSession } from '@/lib/session';

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session: Awaited<ReturnType<typeof getServerSession>> = null;
  try {
    session = await getServerSession();
  } catch (err) {
    console.warn(
      '[dashboard-layout] getServerSession failed; continuing with fallback user',
      err,
    );
  }

  let dbUser = null;
  if (session) {
    try {
      dbUser = await getCachedDashboardShellUser(session.user.id);
    } catch (err) {
      console.warn(
        '[dashboard-layout] getCachedDashboardShellUser failed; using session user',
        err,
      );
      dbUser = null;
    }
  }
  const user = dbUser ??
    session?.user ?? { name: null, image: null, email: null };

  return (
    <MobileNavProvider>
      <div className="flex min-h-dvh w-full max-w-[100vw] overflow-x-hidden bg-background">
        <Sidebar userName={user.name} />
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_78%_54%_at_50%_34%,color-mix(in_oklch,var(--color-card)_45%,transparent)_0%,transparent_62%)]
            dark:bg-[radial-gradient(ellipse_78%_54%_at_50%_34%,rgb(255_255_255/0.035)_0%,transparent_62%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_118%_118%_at_50%_48%,transparent_58%,color-mix(in_oklch,var(--foreground)_3%,transparent)_100%)]
            dark:bg-[radial-gradient(ellipse_118%_118%_at_50%_48%,transparent_55%,rgb(0_0_0/0.24)_100%)]"
            aria-hidden
          />
          <DashboardNavbar user={user} />

          <div className="relative z-10 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+6.75rem)] sm:pb-[calc(env(safe-area-inset-bottom,0px)+7.25rem)]">
            {children}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex max-w-[100vw] justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-4">
            <div className="pointer-events-auto">
              <FloatingDock />
            </div>
          </div>
        </main>
      </div>
    </MobileNavProvider>
  );
}

// — Dashboard shell: sidebar, navbar, providers.
