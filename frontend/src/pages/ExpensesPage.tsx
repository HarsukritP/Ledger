import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2, Mail, Search, Plus, X } from "lucide-react";
import { AgentBadge } from "../components/finance/AgentBadge";
import { MoneyText } from "../components/finance/MoneyText";
import { cn } from "../lib/utils";
import { api } from "../lib/api";
import type { Expense } from "../types";

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
  const [subs, setSubs] = useState<(Expense & { category?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [linkingEmail, setLinkingEmail] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("GENERAL_SERVICES");
  const [newFreq, setNewFreq] = useState("monthly");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.expenses
      .list()
      .then((data: any[]) => {
        setSubs(
          data.map((s: any) => ({
            id: s.id, name: s.name, amount: s.amount, frequency: s.frequency,
            valueScore: s.value_score, status: s.status, lastChargeDate: s.last_charge_date,
            usageEstimate: s.usage_estimate, category: s.category,
          }))
        );
      })
      .catch((err) => {
        console.error("[EXPENSES] Failed to load:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));

    api.email.accounts().then((d: any) => setEmailAccounts(d.accounts || [])).catch(() => {});
  }, []);

  const handleLinkEmail = async () => {
    setLinkingEmail(true);
    try {
      const data = await api.email.authUrl();
      window.location.href = data.auth_url;
    } catch (err: any) {
      console.error("[EMAIL] Failed to get auth URL:", err);
      setLinkingEmail(false);
    }
  };

  const handleScanEmails = async () => {
    setScanning(true);
    try {
      const result = await api.email.scan();
      if (result.detected_charges > 0) {
        const data = await api.expenses.list();
        setSubs(
          data.map((s: any) => ({
            id: s.id, name: s.name, amount: s.amount, frequency: s.frequency,
            valueScore: s.value_score, status: s.status, lastChargeDate: s.last_charge_date,
            usageEstimate: s.usage_estimate, category: s.category,
          }))
        );
      }
    } catch (err) {
      console.error("[EMAIL] Scan failed:", err);
    } finally {
      setScanning(false);
    }
  };

  const handleCreate = async () => {
    if (!newName || !newAmount) return;
    setCreating(true);
    try {
      const result = await api.expenses.create({
        name: newName, amount: parseFloat(newAmount),
        frequency: newFreq, category: newCategory,
      });
      setSubs((prev) => [...prev, {
        id: result.id, name: result.name, amount: result.amount,
        frequency: result.frequency || "monthly", valueScore: 3,
        status: "active", lastChargeDate: "", category: result.category,
      }]);
      setShowAdd(false);
      setNewName(""); setNewAmount(""); setNewCategory("GENERAL_SERVICES"); setNewFreq("monthly");
    } catch (err) {
      console.error("[EXPENSES] Create failed:", err);
    } finally {
      setCreating(false);
    }
  };

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
      <div className="card p-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-3 rounded-full bg-gold px-5 py-2 text-xs font-semibold text-black">Retry</button>
      </div>
    );
  }

  const total = subs.reduce((s, sub) => s + sub.amount, 0);
  const potentialSavings = subs
    .filter((s) => s.status === "flagged" || s.valueScore <= 2)
    .reduce((s, sub) => s + sub.amount, 0);

  const filtered =
    filter === "All" ? subs
      : filter === "Needs Review" ? subs.filter((s) => s.valueScore <= 2)
        : filter === "Flagged" ? subs.filter((s) => s.status === "flagged")
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
      prev.map((s) => s.id === subId ? { ...s, status: decision === "cancel" ? "flagged" : "active" } : s)
    );
    setExpandedId(null);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Expenses</h1>
            <AgentBadge agent="audit" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-black transition-all hover:brightness-110">
              <Plus size={12} /> Add
            </button>
            {emailAccounts.length > 0 ? (
              <button onClick={handleScanEmails} disabled={scanning} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50">
                {scanning ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Scan Emails
              </button>
            ) : (
              <button onClick={handleLinkEmail} disabled={linkingEmail} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50">
                {linkingEmail ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Link Email
              </button>
            )}
          </div>
        </div>
        {emailAccounts.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
            <Mail size={12} className="text-pulse" />
            {emailAccounts.map((a: any) => a.email_address).join(", ")} linked
            <button onClick={handleLinkEmail} disabled={linkingEmail} className="ml-1 text-gold hover:underline">+ Add another</button>
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-text-muted">Monthly Total</p>
          <MoneyText value={total} animated className="mt-1 text-xl text-gold" />
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">Active</p>
          <p className="mt-1 font-mono text-xl text-text-primary">{subs.filter((s) => s.status === "active").length}</p>
        </div>
        <div className="card p-4">
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
              filter === f ? "bg-gold text-black" : "border border-border text-text-secondary hover:bg-surface-hover"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-text-muted">
            {subs.length === 0 ? "No recurring charges detected yet. Sync more transactions to see expenses." : "No expenses match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map(([category, items]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{getCategoryLabel(category)}</h3>
                <span className="font-mono text-xs text-text-muted">
                  ${items.reduce((s, x) => s + x.amount, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {items.map((sub) => (
                <motion.div
                  key={sub.id} layout
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("card transition-colors", sub.status === "flagged" && "border-warning/30")}
                >
                  <button onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)} className="flex w-full items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-xs font-bold text-text-secondary">
                        {sub.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-text-primary">{sub.name}</p>
                        {sub.usageEstimate && <p className="text-xs text-text-muted">{sub.usageEstimate}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ValueDots score={sub.valueScore} />
                      <MoneyText value={-sub.amount} className="text-sm" />
                      <ChevronDown size={16} className={cn("text-text-muted transition-transform", expandedId === sub.id && "rotate-180")} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedId === sub.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"
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
                            <button onClick={() => handleDecision(sub.id, "keep")} className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-black">Keep</button>
                            <button onClick={() => handleDecision(sub.id, "cancel")} className="rounded-full border border-danger/30 px-4 py-1.5 text-xs font-medium text-danger">Flag for Cancel</button>
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

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="card w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">Add Expense</h2>
                <button onClick={() => setShowAdd(false)}><X size={20} className="text-text-muted" /></button>
              </div>
              <div className="mt-4 space-y-3">
                <input type="text" placeholder="Name (e.g. Netflix, Gym, Phone Bill)" value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none" />
                <input type="number" placeholder="Amount per month ($)" value={newAmount} onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none" />
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary focus:border-gold/50 focus:outline-none">
                  <option value="ENTERTAINMENT">Entertainment</option>
                  <option value="GENERAL_SERVICES">Services</option>
                  <option value="RENT_AND_UTILITIES">Rent & Utilities</option>
                  <option value="PERSONAL_CARE">Personal Care</option>
                  <option value="FOOD_AND_DRINK">Food & Drink</option>
                  <option value="TRANSPORTATION">Transportation</option>
                </select>
                <select value={newFreq} onChange={(e) => setNewFreq(e.target.value)}
                  className="w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary focus:border-gold/50 focus:outline-none">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="annual">Annual</option>
                </select>
                <button onClick={handleCreate} disabled={creating || !newName || !newAmount}
                  className="w-full rounded-full bg-gold py-2.5 text-sm font-semibold text-black disabled:opacity-50">
                  {creating ? "Adding..." : "Add Expense"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
            i < score ? (score >= 4 ? "bg-income" : score >= 3 ? "bg-gold" : "bg-danger") : "bg-border"
          )}
        />
      ))}
    </div>
  );
}
