import Sidebar from "@/components/sideBar";
import DashboardNavbar from "@/components/dashboard-navbar";
import FloatingDock from "@/components/floatingDock";
import { getServerSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const dbUser = session
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, image: true, email: true },
      })
    : null;
  const user = dbUser ?? session?.user ?? { name: null, image: null, email: null };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar userName={user.name} />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardNavbar user={user} />

        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

        {/* Hit zone: bottom strip reveals dock on hover (pointer-events re-enabled on zone). */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center">
          <div className="group/dock-peek pointer-events-auto flex h-28 w-full max-w-3xl items-end justify-center px-3 pb-3 sm:px-4 sm:pb-4">
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
