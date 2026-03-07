import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-base">
      <Sidebar />
      <MobileNav />
      <main className="pb-20 pt-16 md:pb-8 md:pl-16 md:pt-0">
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
