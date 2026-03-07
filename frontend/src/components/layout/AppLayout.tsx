import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { DotGrid } from "../ui/DotGrid";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-base">
      <DotGrid />
      <Sidebar />
      <MobileNav />
      <main className="relative z-10 pb-20 pt-16 md:pb-8 md:pl-16 md:pt-0">
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
