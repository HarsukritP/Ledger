import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";
import { AgentBadge } from "../components/finance/AgentBadge";
import { MoneyText } from "../components/finance/MoneyText";
import { cn } from "../lib/utils";
import { api } from "../lib/api";
import type { Subscription } from "../types";

const FILTERS = ["All", "Needs Review", "Keep", "Flagged"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  RENT_AND_UTILITIES: "Rent & Utilities",
  ENTERTAINMENT: "Entertainment",
  GENERAL_SERVICES: "Services",
  PERSONAL_CARE: "Personal Care",
  FOOD_AND_DRINK: "Food & Drink",
  TRANSPORTATION: "Transportation",
  INCOME: "Income",
};

function getCategoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ExpensesPage() {
  const [subs, setSubs] = useState<(Subscription & { category?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api.expenses
      .list()
      .then((data: any[]) => {
        setSubs(
          data.map((s: any) => ({
            id: s.id,
            name: s.name,
            amount: s.amount,
            frequency: s.frequency,
            valueScore: s.value_score,
            status: s.status,
            lastChargeDate: s.last_charge_date,
            usageEstimate: s.usage_estimate,
            category: s.category,
          }))
        );
      })
      .catch((err) => {
        console.error("[EXPENSES] Failed to load:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 size={24} className="animate-spin" />
        <span className="ml-2 text-sm">Scanning your recurring charges...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/20 bg-danger/5 p-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded-full bg-gold px-5 py-2 text-xs font-medium text-black"
        >
          Retry
        </button>
      </div>
    );
  }

  const total = subs.reduce((s, sub) => s + sub.amount, 0);
  const potentialSavings = subs
    .filter((s) => s.status === "flagged" || s.valueScore <= 2)
    .reduce((s, sub) => s + sub.amount, 0);

  const filtered =
    filter === "All"
      ? subs
      : filter === "Needs Review"
        ? subs.filter((s) => s.valueScore <= 2)
        : filter === "Flagged"
          ? subs.filter((s) => s.status === "flagged")
          : subs.filter((s) => s.status === "active" && s.valueScore >= 3);

  const grouped: Record<string, typeof filtered> = {};
  for (const sub of filtered) {
    const cat = sub.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(sub);
  }
  const sortedCategories = Object.entries(grouped).sort(
    ([, a], [, b]) => b.reduce((s, x) => s + x.amount, 0) - a.reduce((s, x) => s + x.amount, 0)
  );

  const handleDecision = (subId: string, decision: string) => {
    api.expenses.decide(subId, decision).catch(console.error);
    setSubs((prev) =>
      prev.map((s) =>
        s.id === subId
          ? { ...s, status: decision === "cancel" ? "flagged" : "active" }
          : s
      )
    );
    setExpandedId(null);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Expenses</h1>
          <AgentBadge agent="audit" />
        </div>
      </motion.div>

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
          <p className="text-xs text-text-muted">Active</p>
          <p className="mt-1 text-xl font-mono text-text-primary">{subs.filter((s) => s.status === "active").length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted">Potential Savings</p>
          <MoneyText value={potentialSavings} className="mt-1 text-xl text-income" />
        </div>
      </motion.div>

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

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">
            {subs.length === 0
              ? "No recurring charges detected yet. Sync more transactions to see expenses."
              : "No expenses match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map(([category, items]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {getCategoryLabel(category)}
                </h3>
                <span className="font-mono text-xs text-text-muted">
                  ${items.reduce((s, x) => s + x.amount, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {items.map((sub) => (
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
                              ? `You're paying $${sub.amount}/mo for ${sub.name}. Consider cancelling to save $${(sub.amount * 12).toFixed(0)}/year.`
                              : `${sub.name} appears to be a regular charge at $${sub.amount}/mo. Seems worth keeping based on frequency.`}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleDecision(sub.id, "keep")}
                              className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-black"
                            >
                              Keep
                            </button>
                            <button
                              onClick={() => handleDecision(sub.id, "cancel")}
                              className="rounded-full border border-danger/30 px-4 py-1.5 text-xs font-medium text-danger"
                            >
                              Flag for Cancel
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      )}
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
