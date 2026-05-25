import { AppSidebar, MobileBottomNav } from "@/components/layout/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center h-12 px-4 border-b bg-card/95 backdrop-blur-sm">
        <span className="font-semibold text-sm tracking-tight">Property Tracker</span>
      </header>

      <main className="flex-1 overflow-y-auto pt-12 pb-20 md:pt-0 md:pb-0">
        {children}
      </main>

      <MobileBottomNav />
    </div>
  );
}
