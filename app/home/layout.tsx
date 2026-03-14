import Sidebar from "@/app/components/sideBar";
import ProfileDropdown from "@/app/components/profileDropdown";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-end shrink-0 px-6 pt-5 pb-2">
          <ProfileDropdown />
        </header>
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
