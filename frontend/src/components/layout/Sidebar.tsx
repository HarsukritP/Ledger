import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  TrendingUp,
  CreditCard,
  Target,
  MessageCircle,
  Settings,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/cashflow", icon: TrendingUp, label: "Cash Flow" },
  { to: "/expenses", icon: CreditCard, label: "Expenses" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-border bg-surface p-2 md:hidden"
      >
        <Menu size={20} className="text-text-secondary" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        animate={{ width: expanded ? 200 : 64 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-border bg-surface md:flex",
        )}
      >
        <div className="flex h-14 items-center justify-center px-4">
          <AnimatePresence mode="wait">
            {expanded ? (
              <motion.span
                key="full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg font-bold text-gold"
              >
                Ledger
              </motion.span>
            ) : (
              <motion.span
                key="icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg font-bold text-gold"
              >
                L
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-gold/10 text-gold"
                    : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                )
              }
            >
              <item.icon size={20} strokeWidth={1.5} className="shrink-0" />
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mb-4 flex items-center justify-center px-3 py-2 text-text-muted hover:text-text-secondary"
        >
          <ChevronLeft
            size={16}
            className={cn("transition-transform", !expanded && "rotate-180")}
          />
        </button>
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-border bg-surface md:hidden"
          >
            <div className="flex h-14 items-center justify-between px-4">
              <span className="text-lg font-bold text-gold">Ledger</span>
              <button onClick={() => setMobileOpen(false)}>
                <ChevronLeft size={20} className="text-text-secondary" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 px-2 py-4">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-gold/10 text-gold"
                        : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                    )
                  }
                >
                  <item.icon size={20} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
