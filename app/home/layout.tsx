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
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute top-4 right-5 z-50">
          <ProfileDropdown />
        </div>
        {children}
      </main>
    </div>
  );
}
