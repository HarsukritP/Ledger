import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { AgentBadge } from "../components/finance/AgentBadge";
import { MoneyText } from "../components/finance/MoneyText";
import { GoalRing } from "../components/finance/GoalRing";
import { cn } from "../lib/utils";
import type { Goal } from "../types";

const MOCK_GOALS: Goal[] = [
  {
    id: "1",
    name: "Japan Trip",
    targetAmount: 5000,
    currentAmount: 1200,
    targetDate: "2026-12-01",
    monthlyContribution: 422,
    feasibility: "at_risk",
  },
  {
    id: "2",
    name: "Emergency Fund",
    targetAmount: 2000,
    currentAmount: 1450,
    targetDate: "2026-06-01",
    monthlyContribution: 183,
    feasibility: "on_track",
  },
  {
    id: "3",
    name: "New Laptop",
    targetAmount: 1800,
    currentAmount: 300,
    targetDate: "2026-09-01",
    monthlyContribution: 250,
    feasibility: "behind",
  },
];

const FEASIBILITY_STYLES = {
  on_track: { label: "On Track", className: "bg-income/15 text-income" },
  at_risk: { label: "At Risk", className: "bg-warning/15 text-warning" },
  behind: { label: "Behind", className: "bg-danger/15 text-danger" },
} as const;

export function GoalsPage() {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Goals
          </h1>
          <AgentBadge agent="north-star" />
        </div>
        <button className="flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-medium text-black hover:bg-gold/90">
          <Plus size={14} />
          Add Goal
        </button>
      </motion.div>

      <div className="space-y-4">
        {MOCK_GOALS.map((goal, i) => {
          const progress = goal.currentAmount / goal.targetAmount;
          const fStyle = FEASIBILITY_STYLES[goal.feasibility];

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelectedGoal(goal)}
              className="cursor-pointer rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-border/80"
            >
              <div className="flex items-center gap-5">
                <GoalRing progress={progress} size={80} strokeWidth={5}>
                  <span className="font-mono text-sm font-medium text-gold">
                    {Math.round(progress * 100)}%
                  </span>
                </GoalRing>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-text-primary">
                      {goal.name}
                    </h3>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", fStyle.className)}>
                      {fStyle.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <MoneyText value={goal.currentAmount} className="text-lg text-gold" />
                    <span className="text-sm text-text-muted">
                      / ${goal.targetAmount.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    ${goal.monthlyContribution}/mo needed &middot;{" "}
                    {new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                </div>
                <AgentBadge agent="north-star" className="hidden sm:inline-flex" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Goal Detail Modal */}
      <AnimatePresence>
        {selectedGoal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setSelectedGoal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-primary">
                  {selectedGoal.name}
                </h2>
                <button onClick={() => setSelectedGoal(null)}>
                  <X size={20} className="text-text-muted" />
                </button>
              </div>
              <div className="mt-6 flex justify-center">
                <GoalRing
                  progress={selectedGoal.currentAmount / selectedGoal.targetAmount}
                  size={160}
                  strokeWidth={8}
                >
                  <div className="text-center">
                    <span className="font-mono text-2xl font-medium text-gold">
                      {Math.round((selectedGoal.currentAmount / selectedGoal.targetAmount) * 100)}%
                    </span>
                    <p className="text-xs text-text-muted">complete</p>
                  </div>
                </GoalRing>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Progress</span>
                  <span className="text-text-primary">
                    ${selectedGoal.currentAmount.toLocaleString()} / ${selectedGoal.targetAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Monthly Needed</span>
                  <span className="font-mono text-text-primary">${selectedGoal.monthlyContribution}/mo</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Target Date</span>
                  <span className="text-text-primary">
                    {new Date(selectedGoal.targetDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>
              <div className="mt-6 rounded-xl border border-border bg-base p-4">
                <AgentBadge agent="north-star" />
                <p className="mt-2 text-sm text-text-secondary">
                  {selectedGoal.feasibility === "at_risk"
                    ? "Cancel 2 flagged subscriptions to add $63/mo toward this goal. That would put you back on track."
                    : selectedGoal.feasibility === "behind"
                      ? "At the current pace, you'll miss this goal by ~2 months. Consider reducing dining spend by $50/mo."
                      : "You're on pace. Keep up the current contribution rate and you'll hit this goal on time."}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
