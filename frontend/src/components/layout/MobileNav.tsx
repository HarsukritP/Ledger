import { NavLink } from "react-router-dom";
import {
  Home,
  TrendingUp,
  Receipt,
  Target,
  MessageCircle,
  Settings,
} from "lucide-react";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/cashflow", icon: TrendingUp, label: "Cashflow" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px]",
                isActive ? "text-gold" : "text-text-muted"
              )
            }
          >
            <item.icon size={20} strokeWidth={1.5} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
