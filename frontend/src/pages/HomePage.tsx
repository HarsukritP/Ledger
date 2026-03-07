import { motion } from "framer-motion";
import { MoneyText } from "../components/finance/MoneyText";
import { AgentBadge } from "../components/finance/AgentBadge";
import { ActionCard } from "../components/finance/ActionCard";
import { BriefingPlayer } from "../components/finance/BriefingPlayer";
import { getGreeting } from "../lib/utils";
import type { ActionItem, HealthMetrics, ForecastEvent } from "../types";

const MOCK_HEALTH: HealthMetrics = {
  balance: 2847.32,
  spentThisMonth: 1204.56,
  saved: 560.0,
  budgetLimit: 2400,
};

const MOCK_WEEK_AHEAD: ForecastEvent[] = [
  { id: "1", date: "2026-03-09", name: "Phone bill", amount: 65, type: "bill" },
  { id: "2", date: "2026-03-11", name: "Paycheck", amount: 1600, type: "income" },
  { id: "3", date: "2026-03-12", name: "Gym membership", amount: 50, type: "bill" },
];

const MOCK_ACTIONS: ActionItem[] = [
  {
    id: "1",
    agent: "audit",
    type: "suggestion",
    title: "News+ subscription underused",
    description: "$12.99/mo — you read 2 articles this month",
    amount: -12.99,
    actions: [
      { label: "Keep", variant: "ghost" },
      { label: "Cancel", variant: "primary" },
      { label: "Remind Later", variant: "ghost" },
    ],
  },
  {
    id: "2",
    agent: "pulse",
    type: "warning",
    title: "Low balance risk Tuesday",
    description: "Balance may dip to $380. Transfer $250 from savings?",
    amount: -250,
    actions: [
      { label: "Approve Transfer", variant: "primary" },
      { label: "Dismiss", variant: "ghost" },
    ],
  },
];

export function HomePage() {
  return (
    <div className="space-y-8">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {getGreeting()}, Harsukrit
        </h1>
        <p className="text-sm text-text-muted">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </motion.div>

      {/* Health Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        <MetricCard
          label="Balance"
          value={MOCK_HEALTH.balance}
          sub="checking"
          color="gold"
        />
        <MetricCard
          label="Spent This Month"
          value={-MOCK_HEALTH.spentThisMonth}
          sub={`of $${MOCK_HEALTH.budgetLimit.toLocaleString()} budget`}
          color="danger"
        />
        <MetricCard
          label="Saved"
          value={MOCK_HEALTH.saved}
          sub="on pace"
          color="income"
        />
      </motion.div>

      {/* Week Ahead + Action Queue */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Week Ahead */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Your Week Ahead
            </h2>
            <AgentBadge agent="pulse" />
          </div>
          <div className="space-y-3">
            {MOCK_WEEK_AHEAD.map((event) => (
              <div key={event.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-12">
                    {new Date(event.date).toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="text-sm text-text-primary">{event.name}</span>
                </div>
                <MoneyText
                  value={event.type === "income" ? event.amount : -event.amount}
                  showSign
                  className="text-sm"
                />
              </div>
            ))}
            <div className="rounded-xl border border-warning/20 bg-warning/5 p-3">
              <p className="text-xs text-warning">
                Balance dips to $380 on Tuesday
              </p>
            </div>
          </div>
        </motion.div>

        {/* Action Queue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-text-primary">
            Action Queue
          </h2>
          {MOCK_ACTIONS.map((action) => (
            <ActionCard
              key={action.id}
              item={action}
              onAction={(label) =>
                console.log(`Action: ${label} on ${action.id}`)
              }
            />
          ))}
        </motion.div>
      </div>

      {/* Weekly Briefing */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <BriefingPlayer
          previewText="This week: 2 bills, 1 paycheck. Balance dips Tuesday — hold off on dining out until Wednesday..."
          duration="0:42"
        />
      </motion.div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub: string;
  color: "gold" | "danger" | "income";
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <MoneyText value={value} animated className={`mt-1 text-xl text-${color}`} />
      <p className="mt-1 text-xs text-text-secondary">{sub}</p>
    </div>
  );
}
