import { useAuth0 } from "@auth0/auth0-react";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Receipt, Target, Shield } from "lucide-react";
import { useTheme } from "../lib/theme";
import { Sun, Moon } from "lucide-react";

const FEATURES = [
  { icon: TrendingUp, color: "#3B82F6", text: "Cash flow forecasting 30 days out" },
  { icon: Receipt, color: "#D4A853", text: "Subscription audit & waste detection" },
  { icon: Target, color: "#22C55E", text: "Savings goal tracking & feasibility" },
  { icon: Shield, color: "#F97316", text: "Anomaly detection for unusual charges" },
];

export function LandingPage() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const { resolved, toggle } = useTheme();

  if (isAuthenticated) {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="noise-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-base px-6">
      <button
        onClick={toggle}
        className="absolute right-6 top-6 z-10 rounded-xl border border-border bg-surface p-2.5 text-text-muted transition-colors hover:text-text-primary"
      >
        {resolved === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,#D4A85310_0%,transparent_60%)]" />

      <motion.img
        src="/logo.png"
        alt="Ledger"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
        className="relative z-10 h-32 w-32 object-contain"
      />

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-10 mt-6 text-5xl font-bold tracking-tight text-text-primary sm:text-6xl"
      >
        Ledger
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 mt-3 text-lg text-text-secondary"
      >
        Your personal finance team
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 mt-8 grid w-full max-w-md gap-3"
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.text}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex items-center gap-3 rounded-xl p-2.5"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${f.color}15` }}
            >
              <f.icon size={18} style={{ color: f.color }} />
            </div>
            <span className="text-sm text-text-secondary">{f.text}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="relative z-10 mt-10 flex gap-3"
      >
        <button
          onClick={() => loginWithRedirect()}
          className="group inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3.5 font-semibold text-black shadow-lg shadow-gold/20 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-gold/25"
        >
          Get Started
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </button>
        <button
          onClick={() => loginWithRedirect()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-3.5 font-medium text-text-secondary transition-colors hover:bg-surface"
        >
          Sign In
        </button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="relative z-10 mt-8 text-xs text-text-muted"
      >
        Secure bank linking via Plaid. Your data is encrypted and never sold.
      </motion.p>
    </div>
  );
}
