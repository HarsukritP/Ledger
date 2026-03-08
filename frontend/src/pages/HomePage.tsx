import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, TrendingUp, Receipt, Target, Shield } from "lucide-react";
import { MoneyText } from "../components/finance/MoneyText";
import { AgentBadge } from "../components/finance/AgentBadge";
import { ActionCard } from "../components/finance/ActionCard";
import { getGreeting } from "../lib/utils";
import { api } from "../lib/api";
import { AGENTS } from "../types";
import type { ActionItem, HealthMetrics, ForecastEvent } from "../types";

export function HomePage() {
  const { user } = useAuth0();
  const firstName = user?.given_name || user?.name?.split(" ")[0] || "there";

  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [weekAhead, setWeekAhead] = useState<ForecastEvent[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [categories, setCategories] = useState<{ category: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  useEffect(() => {
    api.dashboard.categories(30).then((data: any[]) => setCategories(data || [])).catch(() => {});

    api.dashboard
      .briefing()
      .then((data: any) => {
        if (data.health) {
          setHealth({
            balance: data.health.balance,
            spentThisMonth: data.health.spent_this_month,
            saved: data.health.saved,
            budgetLimit: data.health.budget_limit,
          });
        }
        setWeekAhead(
          (data.week_ahead || []).map((e: any) => ({
            id: e.id, date: e.date, name: e.name,
            amount: e.amount, type: e.type, category: e.category,
          }))
        );
        setActions(
          (data.actions || []).map((a: any) => ({
            id: a.id, agent: a.agent, type: a.type, title: a.title,
            description: a.description, amount: a.amount, actions: a.actions || [],
          }))
        );
      })
      .catch((err) => {
        console.error("[HOME] Failed to load briefing:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 size={24} className="animate-spin" />
        <span className="ml-2 text-sm">Loading your dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded-full bg-gold px-5 py-2 text-xs font-semibold text-black"
        >
          Retry
        </button>
      </div>
    );
  }

  const predictedLow = weekAhead.reduce(
    (bal, e) => (e.type === "income" ? bal + e.amount : bal - e.amount),
    health?.balance ?? 0
  );
  const lowEvent = weekAhead.find((e) => e.type !== "income");

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-sm text-text-muted">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric", year: "numeric",
          })}
        </p>
      </motion.div>

      <AgentTeamSection />

      {health && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <MetricCard label="Balance" value={health.balance} sub="checking" color="gold" />
          <MetricCard label="Spent This Month" value={-health.spentThisMonth} sub={`of $${health.budgetLimit.toLocaleString()} avg`} color="danger" />
          <MetricCard label="Saved" value={health.saved} sub="this month" color="income" />
        </motion.div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">Your Week Ahead</h2>
            <AgentBadge agent="pulse" />
          </div>
          {weekAhead.length > 0 ? (
            <div className="space-y-3">
              {weekAhead.map((event) => (
                <div key={event.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-xs text-text-muted">
                      {new Date(event.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="text-sm text-text-primary">{event.name}</span>
                  </div>
                  <MoneyText value={event.type === "income" ? event.amount : -event.amount} showSign className="text-sm" />
                </div>
              ))}
              {predictedLow < 500 && lowEvent && (
                <div className="rounded-xl border border-warning/20 bg-warning/5 p-3">
                  <p className="text-xs text-warning">
                    Balance could dip to ${Math.round(predictedLow).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No upcoming events detected yet. Sync more transactions to see forecasts.</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-text-primary">Action Queue</h2>
          {actions.length > 0 ? (
            actions.map((action) => (
              <ActionCard
                key={action.id}
                item={action}
                onAction={(label) => {
                  api.dashboard.action(action.id, label.toLowerCase()).catch(console.error);
                }}
              />
            ))
          ) : (
            <div className="card p-5 text-center">
              <p className="text-sm text-text-muted">No pending actions. Your finances look good.</p>
            </div>
          )}
        </motion.div>
      </div>

      {categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-5"
        >
          <h2 className="mb-3 text-sm font-semibold text-text-primary">This Month's Spending</h2>
          <div className="space-y-2">
            {categories.slice(0, 5).map((cat) => {
              const totalSpent = categories.reduce((s, c) => s + c.amount, 0);
              const pct = totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0;
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="w-32 truncate text-xs text-text-secondary">
                    {cat.category.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </span>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-border">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                  <span className="w-16 text-right font-mono text-xs text-text-muted">
                    ${cat.amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-gold" />
            <span className="text-sm font-semibold text-text-primary">Weekly Briefing</span>
            <AgentBadge agent="pulse" />
          </div>
          {!briefingText && (
            <button
              onClick={async () => {
                setBriefingLoading(true);
                try {
                  const result = await api.briefing.generate();
                  if (result?.content) setBriefingText(result.content);
                } catch (err) {
                  console.error("[BRIEFING] Failed:", err);
                } finally {
                  setBriefingLoading(false);
                }
              }}
              disabled={briefingLoading}
              className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-black transition-all hover:brightness-110 disabled:opacity-50"
            >
              {briefingLoading ? <><Loader2 size={12} className="animate-spin" /> Generating...</> : "Generate"}
            </button>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {briefingText
            ? briefingText
            : briefingLoading
              ? "Your AI team is analyzing your finances..."
              : weekAhead.length > 0
                ? `This week: ${weekAhead.filter((e) => e.type !== "income").length} bills, ${weekAhead.filter((e) => e.type === "income").length} income deposits.${predictedLow < 500 ? ` Watch your balance — it may dip to $${Math.round(predictedLow)}.` : ""} Tap Generate for a full AI briefing.`
                : "Link your bank account and sync transactions to get your weekly briefing."}
        </p>
      </motion.div>
    </div>
  );
}

const AGENT_CARDS = [
  {
    key: "pulse" as const,
    icon: TrendingUp,
    to: "/cashflow",
    tagline: "Cash-flow forecasting",
  },
  {
    key: "audit" as const,
    icon: Receipt,
    to: "/expenses",
    tagline: "Subscription & expense tracking",
  },
  {
    key: "north-star" as const,
    icon: Target,
    to: "/goals",
    tagline: "Goal planning & feasibility",
  },
  {
    key: "sentinel" as const,
    icon: Shield,
    to: "/chat",
    tagline: "Anomaly detection & alerts",
  },
] as const;

function AgentTeamSection() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <h2 className="mb-3 text-sm font-semibold text-text-primary">Your Finance Team</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {AGENT_CARDS.map((card, i) => {
          const agent = AGENTS[card.key];
          return (
            <motion.button
              key={card.key}
              onClick={() => navigate(card.to)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.05 }}
              className="card card-hover group relative overflow-hidden p-4 text-left"
            >
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `linear-gradient(135deg, ${agent.color}08, ${agent.color}15)` }}
              />
              <div className="relative">
                <div
                  className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: agent.bgColor }}
                >
                  <card.icon size={18} style={{ color: agent.color }} />
                </div>
                <p className="text-sm font-semibold text-text-primary">{agent.displayName}</p>
                <p className="mt-0.5 text-[11px] font-medium" style={{ color: agent.color }}>
                  {card.tagline}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  {agent.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

const COLOR_CLASSES = {
  gold: "mt-1 text-xl text-gold",
  danger: "mt-1 text-xl text-danger",
  income: "mt-1 text-xl text-income",
} as const;

function MetricCard({
  label, value, sub, color,
}: {
  label: string; value: number; sub: string; color: "gold" | "danger" | "income";
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <MoneyText value={value} animated className={COLOR_CLASSES[color]} />
      <p className="mt-1 text-xs text-text-secondary">{sub}</p>
    </div>
  );
}
