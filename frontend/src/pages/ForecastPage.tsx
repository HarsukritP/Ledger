import { motion } from "framer-motion";
import { AgentBadge } from "../components/finance/AgentBadge";
import { MoneyText } from "../components/finance/MoneyText";
import { CashFlowChart } from "../components/finance/CashFlowChart";
import type { ForecastEvent } from "../types";

const MOCK_EVENTS: ForecastEvent[] = [
  { id: "1", date: "2026-03-09", name: "Phone bill", amount: 65, type: "bill", category: "Bills" },
  { id: "2", date: "2026-03-11", name: "Paycheck", amount: 1600, type: "income", category: "Income" },
  { id: "3", date: "2026-03-12", name: "Gym", amount: 50, type: "bill", category: "Fitness" },
  { id: "4", date: "2026-03-15", name: "Rent", amount: 1200, type: "bill", category: "Housing" },
  { id: "5", date: "2026-03-18", name: "Netflix", amount: 17.99, type: "bill", category: "Entertainment" },
  { id: "6", date: "2026-03-25", name: "Paycheck", amount: 1600, type: "income", category: "Income" },
  { id: "7", date: "2026-03-28", name: "Internet", amount: 60, type: "bill", category: "Bills" },
];

export function ForecastPage() {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Next 30 Days
          </h1>
          <AgentBadge agent="pulse" />
        </div>
        <div className="mt-2 flex items-baseline gap-4">
          <MoneyText value={2847.32} animated className="text-3xl text-gold" />
          <span className="text-sm text-warning">
            Predicted low: $380 on Mar 12
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <CashFlowChart
          events={MOCK_EVENTS}
          startBalance={2847.32}
          dangerThreshold={500}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <h2 className="text-sm font-semibold text-text-primary">Upcoming Events</h2>
        {MOCK_EVENTS.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted w-16">
                {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <span className="text-sm text-text-primary">{event.name}</span>
              {event.category && (
                <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-text-muted">
                  {event.category}
                </span>
              )}
            </div>
            <MoneyText
              value={event.type === "income" ? event.amount : -event.amount}
              showSign
              className="text-sm"
            />
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-border bg-surface p-5"
      >
        <div className="mb-2 flex items-center gap-2">
          <AgentBadge agent="pulse" />
          <span className="text-sm font-medium text-text-primary">Pulse Recommends</span>
        </div>
        <p className="text-sm text-text-secondary">
          Transfer $250 from savings before Tuesday to avoid the low point. Your paycheck on the 11th will bring you back above $2,000.
        </p>
        <button className="mt-3 rounded-full bg-gold px-5 py-2 text-xs font-medium text-black hover:bg-gold/90">
          Approve Transfer
        </button>
      </motion.div>
    </div>
  );
}
