import Sidebar from "@/components/sideBar";
import ProfileDropdown from "@/components/profileDropdown";
import FloatingDock from "@/components/floatingDock";
import { getServerSession } from "@/lib/session";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const user = session?.user ?? { name: null, image: null, email: null };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-end px-5 pb-1 pt-4">
          <ProfileDropdown user={user} />
        </header>

        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>

        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <FloatingDock />
        </div>
      </main>
    </div>
  );
}
