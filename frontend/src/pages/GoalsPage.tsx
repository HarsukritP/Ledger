import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2, Pencil } from "lucide-react";
import { AgentBadge } from "../components/finance/AgentBadge";
import { MoneyText } from "../components/finance/MoneyText";
import { GoalRing } from "../components/finance/GoalRing";
import { cn } from "../lib/utils";
import { api } from "../lib/api";
import type { Goal } from "../types";

const FEASIBILITY_STYLES = {
  on_track: { label: "On Track", className: "bg-income/15 text-income" },
  at_risk: { label: "At Risk", className: "bg-warning/15 text-warning" },
  behind: { label: "Behind", className: "bg-danger/15 text-danger" },
} as const;

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDate, setNewDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTarget, setEditTarget] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCurrent, setEditCurrent] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    if (!selectedGoal) return;
    setEditTarget(String(selectedGoal.targetAmount));
    setEditDate(selectedGoal.targetDate || "");
    setEditCurrent(String(selectedGoal.currentAmount));
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedGoal) return;
    setSaving(true);
    try {
      await api.goals.update(selectedGoal.id, {
        target_amount: parseFloat(editTarget) || selectedGoal.targetAmount,
        target_date: editDate || undefined,
        current_amount: parseFloat(editCurrent) || selectedGoal.currentAmount,
      });
      setEditing(false);
      setSelectedGoal(null);
      loadGoals();
    } catch (err) {
      console.error("[GOALS] Edit failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const loadGoals = () => {
    api.goals
      .list()
      .then((data: any[]) => {
        setGoals(
          data.map((g: any) => ({
            id: g.id,
            name: g.name,
            targetAmount: g.target_amount,
            currentAmount: g.current_amount,
            targetDate: g.target_date,
            monthlyContribution: g.monthly_contribution,
            feasibility: g.feasibility || "on_track",
          }))
        );
      })
      .catch((err) => {
        console.error("[GOALS] Failed to load:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadGoals, []);

  const handleCreate = async () => {
    if (!newName || !newTarget) return;
    setCreating(true);
    try {
      await api.goals.create({
        name: newName,
        target_amount: parseFloat(newTarget),
        target_date: newDate || new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
      });
      setShowCreate(false);
      setNewName("");
      setNewTarget("");
      setNewDate("");
      loadGoals();
    } catch (err: any) {
      console.error("[GOALS] Create failed:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await api.goals.delete(goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      setSelectedGoal(null);
    } catch (err: any) {
      console.error("[GOALS] Delete failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 size={24} className="animate-spin" />
        <span className="ml-2 text-sm">Loading your goals...</span>
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

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Goals</h1>
          <AgentBadge agent="north-star" />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-medium text-black hover:bg-gold/90"
        >
          <Plus size={14} />
          Add Goal
        </button>
      </motion.div>

      {goals.length === 0 && !showCreate ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">
            No goals yet. Create your first savings goal to get started.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 rounded-full bg-gold px-6 py-2 text-xs font-medium text-black"
          >
            Create Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal, i) => {
            const progress = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
            const fStyle = FEASIBILITY_STYLES[goal.feasibility as keyof typeof FEASIBILITY_STYLES] || FEASIBILITY_STYLES.on_track;

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
                      <h3 className="text-base font-semibold text-text-primary">{goal.name}</h3>
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
                      ${Math.round(goal.monthlyContribution)}/mo needed &middot;{" "}
                      {goal.targetDate
                        ? new Date(goal.targetDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })
                        : "No deadline"}
                    </p>
                  </div>
                  <AgentBadge agent="north-star" className="hidden sm:inline-flex" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border bg-surface p-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">New Goal</h2>
                <button onClick={() => setShowCreate(false)}>
                  <X size={20} className="text-text-muted" />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Goal name (e.g. Japan Trip)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Target amount ($)"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
                />
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                />
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName || !newTarget}
                  className="w-full rounded-full bg-gold py-2.5 text-sm font-medium text-black disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Goal"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <h2 className="text-xl font-bold text-text-primary">{selectedGoal.name}</h2>
                <button onClick={() => setSelectedGoal(null)}>
                  <X size={20} className="text-text-muted" />
                </button>
              </div>
              <div className="mt-6 flex justify-center">
                <GoalRing
                  progress={selectedGoal.targetAmount > 0 ? selectedGoal.currentAmount / selectedGoal.targetAmount : 0}
                  size={160}
                  strokeWidth={8}
                >
                  <div className="text-center">
                    <span className="font-mono text-2xl font-medium text-gold">
                      {Math.round(
                        selectedGoal.targetAmount > 0
                          ? (selectedGoal.currentAmount / selectedGoal.targetAmount) * 100
                          : 0
                      )}%
                    </span>
                    <p className="text-xs text-text-muted">complete</p>
                  </div>
                </GoalRing>
              </div>
              {editing ? (
                <div className="mt-6 space-y-3">
                  <div>
                    <label className="text-xs text-text-muted">Target Amount ($)</label>
                    <input type="number" value={editTarget} onChange={(e) => setEditTarget(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary focus:border-gold/50 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted">Current Amount ($)</label>
                    <input type="number" value={editCurrent} onChange={(e) => setEditCurrent(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary focus:border-gold/50 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted">Target Date</label>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary focus:border-gold/50 focus:outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} disabled={saving}
                      className="flex-1 rounded-full bg-gold py-2 text-xs font-medium text-black disabled:opacity-50">
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button onClick={() => setEditing(false)}
                      className="rounded-full border border-border px-4 py-2 text-xs text-text-muted">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Progress</span>
                      <span className="text-text-primary">
                        ${selectedGoal.currentAmount.toLocaleString()} / ${selectedGoal.targetAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Monthly Needed</span>
                      <span className="font-mono text-text-primary">${Math.round(selectedGoal.monthlyContribution)}/mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Target Date</span>
                      <span className="text-text-primary">
                        {selectedGoal.targetDate
                          ? new Date(selectedGoal.targetDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
                          : "Not set"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 rounded-xl border border-border bg-base p-4">
                    <AgentBadge agent="north-star" />
                    <p className="mt-2 text-sm text-text-secondary">
                      {selectedGoal.feasibility === "at_risk"
                        ? "This goal needs attention. Consider increasing monthly contributions or extending the deadline."
                        : selectedGoal.feasibility === "behind"
                          ? "You're falling behind on this goal. Review your spending to find areas to cut back."
                          : "You're on pace. Keep up the current contribution rate and you'll hit this goal on time."}
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={startEdit}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border py-2 text-xs font-medium text-text-secondary hover:bg-surface-raised">
                      <Pencil size={12} /> Edit Goal
                    </button>
                    <button onClick={() => handleDelete(selectedGoal.id)}
                      className="flex-1 rounded-full border border-danger/30 py-2 text-xs font-medium text-danger hover:bg-danger/5">
                      Delete Goal
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
