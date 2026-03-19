import Sidebar from "@/app/components/sideBar";
import ProfileDropdown from "@/app/components/profileDropdown";
import FloatingDock from "@/app/components/floatingDock";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-end px-5 pb-1 pt-4">
          <ProfileDropdown />
        </header>

        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>

        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <FloatingDock />
        </div>
      </main>
    </div>
  );
}
