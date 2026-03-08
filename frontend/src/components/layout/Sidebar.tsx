import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  TrendingUp,
  Receipt,
  Target,
  MessageCircle,
  Settings,
  ChevronLeft,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useTheme } from "../../lib/theme";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/cashflow", icon: TrendingUp, label: "Cashflow" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolved, toggle } = useTheme();

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-border bg-surface p-2.5 shadow-sm md:hidden"
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
            className="fixed inset-0 z-40 bg-overlay md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        animate={{ width: expanded ? 220 : 72 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="glass fixed left-0 top-0 z-50 hidden h-screen flex-col md:flex"
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 overflow-hidden px-4">
          <img
            src="/icon_notext.png"
            alt="Ledger"
            className="h-10 w-10 shrink-0 rounded-lg object-contain"
          />
          <AnimatePresence>
            {expanded && (
              <motion.span
                key="brand"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap text-lg font-bold tracking-tight text-text-primary"
              >
                Ledger
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-gold/10 text-gold"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gold"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
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
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="border-t border-border px-3 py-3">
          <button
            onClick={toggle}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            {resolved === "dark" ? (
              <Sun size={20} strokeWidth={1.5} className="shrink-0" />
            ) : (
              <Moon size={20} strokeWidth={1.5} className="shrink-0" />
            )}
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {resolved === "dark" ? "Light Mode" : "Dark Mode"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-border bg-surface md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <img src="/icon_notext.png" alt="Ledger" className="h-10 w-10 rounded-lg object-contain" />
                <span className="text-lg font-bold tracking-tight text-text-primary">Ledger</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-text-muted hover:text-text-secondary">
                <ChevronLeft size={20} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gold/10 text-gold"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    )
                  }
                >
                  <item.icon size={20} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-border px-3 py-3">
              <button
                onClick={toggle}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                {resolved === "dark" ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
                <span>{resolved === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
