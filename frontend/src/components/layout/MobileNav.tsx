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
  { to: "/cashflow", icon: TrendingUp, label: "Cash" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function MobileNav() {
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border md:hidden">
      <div className="flex items-center justify-around pb-[env(safe-area-inset-bottom)] pt-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition-colors",
                isActive ? "text-gold" : "text-text-muted"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} strokeWidth={1.5} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute -bottom-0.5 h-0.5 w-4 rounded-full bg-gold" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
