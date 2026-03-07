import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { AgentBadge } from "../components/finance/AgentBadge";
import { MoneyText } from "../components/finance/MoneyText";
import { cn } from "../lib/utils";
import type { Subscription } from "../types";

const FILTERS = ["All", "Needs Review", "Keep", "Flagged"] as const;

const MOCK_SUBS: Subscription[] = [
  { id: "1", name: "Netflix", amount: 17.99, frequency: "monthly", valueScore: 4, status: "active", lastChargeDate: "2026-03-01", usageEstimate: "~12 hours/mo" },
  { id: "2", name: "Spotify", amount: 11.99, frequency: "monthly", valueScore: 5, status: "active", lastChargeDate: "2026-03-03", usageEstimate: "Daily use" },
  { id: "3", name: "Apple News+", amount: 12.99, frequency: "monthly", valueScore: 1, status: "flagged", lastChargeDate: "2026-03-02", usageEstimate: "2 articles/mo" },
  { id: "4", name: "Gym Membership", amount: 50.0, frequency: "monthly", valueScore: 2, status: "flagged", lastChargeDate: "2026-03-01", usageEstimate: "Last visited 6 weeks ago" },
  { id: "5", name: "iCloud+", amount: 2.99, frequency: "monthly", valueScore: 4, status: "active", lastChargeDate: "2026-02-28" },
  { id: "6", name: "Adobe CC", amount: 54.99, frequency: "monthly", valueScore: 3, status: "active", lastChargeDate: "2026-03-05", usageEstimate: "~8 hours/mo" },
  { id: "7", name: "YouTube Premium", amount: 13.99, frequency: "monthly", valueScore: 4, status: "active", lastChargeDate: "2026-03-01", usageEstimate: "~20 hours/mo" },
];

export function SubscriptionsPage() {
  const [filter, setFilter] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const total = MOCK_SUBS.reduce((s, sub) => s + sub.amount, 0);
  const potentialSavings = MOCK_SUBS
    .filter((s) => s.status === "flagged")
    .reduce((s, sub) => s + sub.amount, 0);

  const filtered =
    filter === "All"
      ? MOCK_SUBS
      : filter === "Needs Review"
        ? MOCK_SUBS.filter((s) => s.valueScore <= 2)
        : filter === "Flagged"
          ? MOCK_SUBS.filter((s) => s.status === "flagged")
          : MOCK_SUBS.filter((s) => s.status === "active" && s.valueScore >= 3);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Subscriptions
          </h1>
          <AgentBadge agent="audit" />
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted">Monthly Total</p>
          <MoneyText value={total} animated className="mt-1 text-xl text-gold" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted">Since 3mo Ago</p>
          <MoneyText value={34} showSign className="mt-1 text-xl text-warning" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted">Potential Savings</p>
          <MoneyText value={potentialSavings} className="mt-1 text-xl text-income" />
        </div>
      </motion.div>

      {/* Filter */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              filter === f
                ? "bg-gold text-black"
                : "border border-border text-text-secondary hover:bg-surface-raised"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Subscription List */}
      <div className="space-y-2">
        {filtered.map((sub) => (
          <motion.div
            key={sub.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-2xl border bg-surface transition-colors",
              sub.status === "flagged" ? "border-warning/30" : "border-border"
            )}
          >
            <button
              onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
              className="flex w-full items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-xs font-bold text-text-secondary">
                  {sub.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-text-primary">{sub.name}</p>
                  {sub.usageEstimate && (
                    <p className="text-xs text-text-muted">{sub.usageEstimate}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ValueDots score={sub.valueScore} />
                <MoneyText value={-sub.amount} className="text-sm" />
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-text-muted transition-transform",
                    expandedId === sub.id && "rotate-180"
                  )}
                />
              </div>
            </button>

            <AnimatePresence>
              {expandedId === sub.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border-subtle px-4 pb-4 pt-3">
                    <div className="mb-3 flex items-center gap-2">
                      <AgentBadge agent="audit" />
                      <span className="text-xs text-text-muted">What Audit thinks</span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {sub.valueScore <= 2
                        ? `You're paying $${sub.amount}/mo but barely using ${sub.name}. Consider cancelling to save $${(sub.amount * 12).toFixed(0)}/year.`
                        : `${sub.name} shows good usage relative to cost. Worth keeping for now.`}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-black">
                        Keep
                      </button>
                      <button className="rounded-full border border-danger/30 px-4 py-1.5 text-xs font-medium text-danger">
                        Flag for Cancel
                      </button>
                      <button className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-text-secondary">
                        Remind Me Later
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ValueDots({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i < score
              ? score >= 4 ? "bg-income" : score >= 3 ? "bg-gold" : "bg-danger"
              : "bg-border"
          )}
        />
      ))}
    </div>
  );
}
