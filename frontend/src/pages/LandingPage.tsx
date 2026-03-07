import { useAuth0 } from "@auth0/auth0-react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function LandingPage() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  if (isAuthenticated) {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-base px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,#D4A85308_0%,transparent_70%)]" />

      <motion.h1
        initial={{ opacity: 0, filter: "blur(10px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6 }}
        className="relative bg-linear-to-r from-gold to-amber-300 bg-clip-text text-6xl font-bold tracking-tight text-transparent"
      >
        Ledger
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative mt-4 text-lg text-text-secondary"
      >
        Your personal finance team
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative mt-2 max-w-md text-center text-sm text-text-muted"
      >
        Proactive agents that predict cash crunches, audit subscriptions,
        and keep your goals on track — getting smarter every week.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="relative mt-8 flex gap-3"
      >
        <button
          onClick={() => loginWithRedirect()}
          className="group inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 font-medium text-black transition-all hover:scale-105 hover:shadow-[0_0_30px_#D4A85340]"
        >
          Get Started
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </button>
        <button
          onClick={() => loginWithRedirect()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-3 font-medium text-text-secondary transition-colors hover:bg-surface"
        >
          Sign In
        </button>
      </motion.div>
    </div>
  );
}
