import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppLayout() {
  return (
    <div className="noise-bg min-h-screen bg-base">
      <Sidebar />
      <MobileNav />
      <main className="relative z-10 pb-24 pt-16 md:pb-8 md:pl-[72px] md:pt-0">
        <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
