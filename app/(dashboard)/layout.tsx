import Sidebar from "@/components/sideBar";
import DashboardNavbar from "@/components/dashboard-navbar";
import FloatingDock from "@/components/floatingDock";
import { getCachedDashboardShellUser } from "@/lib/rsc-cache";
import { getServerSession } from "@/lib/session";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session: Awaited<ReturnType<typeof getServerSession>> = null;
  try {
    session = await getServerSession();
  } catch (err) {
    console.warn("[dashboard-layout] getServerSession failed; continuing with fallback user", err);
  }

  let dbUser = null;
  if (session) {
    try {
      dbUser = await getCachedDashboardShellUser(session.user.id);
    } catch (err) {
      console.warn("[dashboard-layout] getCachedDashboardShellUser failed; using session user", err);
      dbUser = null;
    }
  }
  const user = dbUser ?? session?.user ?? { name: null, image: null, email: null };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar userName={user.name} />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardNavbar user={user} />

        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

        {/* Keep dock discoverable without blocking the todo timeline interactions. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-3 sm:pb-4">
          <div className="group/dock-peek relative flex flex-col items-center">
            <div className="pointer-events-auto h-3 w-40" aria-hidden="true" />
            <div
              className="origin-bottom pointer-events-none translate-y-3 opacity-0
                transition-[transform,opacity] duration-200 [transition-timing-function:cubic-bezier(0.2,0,0,0.1)]
                group-hover/dock-peek:pointer-events-auto group-hover/dock-peek:translate-y-0
                group-hover/dock-peek:opacity-100
                motion-reduce:pointer-events-auto motion-reduce:translate-y-0 motion-reduce:opacity-100"
            >
              <FloatingDock />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// — Dashboard shell: sidebar, navbar, providers.
