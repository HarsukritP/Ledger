import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { AgentBadge } from "../components/finance/AgentBadge";
import { MoneyText } from "../components/finance/MoneyText";
import { CashFlowChart } from "../components/finance/CashFlowChart";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import type { ForecastEvent } from "../types";

interface CashflowData {
  currentBalance: number;
  dangerThreshold: number;
  predictedLow: number;
  predictedLowDate: string | null;
  historyEvents: (ForecastEvent & { is_history?: boolean })[];
  forecastEvents: ForecastEvent[];
}

const RANGES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
] as const;

export function CashflowPage() {
  const [data, setData] = useState<CashflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState(30);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.cashflow
      .get(range)
      .then((raw: any) => {
        setData({
          currentBalance: raw.current_balance,
          dangerThreshold: raw.danger_threshold,
          predictedLow: raw.predicted_low,
          predictedLowDate: raw.predicted_low_date,
          historyEvents: (raw.history_events || []).map((e: any) => ({
            id: e.id, date: e.date, name: e.name, amount: e.amount,
            type: e.type, category: e.category, is_history: true,
          })),
          forecastEvents: (raw.forecast_events || []).map((e: any) => ({
            id: e.id, date: e.date, name: e.name, amount: e.amount,
            type: e.type, category: e.category,
          })),
        });
      })
      .catch((err) => {
        console.error("[CASHFLOW] Failed to load:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 size={24} className="animate-spin" />
        <span className="ml-2 text-sm">Loading cashflow...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-danger">{error || "Failed to load cashflow"}</p>
        <button onClick={() => window.location.reload()} className="mt-3 rounded-full bg-gold px-5 py-2 text-xs font-semibold text-black">
          Retry
        </button>
      </div>
    );
  }

  const lowDateFormatted = data.predictedLowDate
    ? new Date(data.predictedLowDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  const allEvents = [...data.historyEvents, ...data.forecastEvents];

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Cashflow</h1>
          <AgentBadge agent="pulse" />
        </div>
        <p className="mt-2 text-xs text-text-muted">Current Balance</p>
        <div className="flex items-baseline gap-4">
          <MoneyText value={data.currentBalance} animated className="text-3xl text-pulse" />
          {data.predictedLow < data.dangerThreshold && lowDateFormatted && (
            <span className="text-sm text-warning">
              Predicted low: ${Math.round(data.predictedLow).toLocaleString()} on {lowDateFormatted}
            </span>
          )}
        </div>
      </motion.div>

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRange(r.days)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              range === r.days
                ? "bg-pulse text-white"
                : "border border-border text-text-secondary hover:bg-surface-hover"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {allEvents.length > 0 ? (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <CashFlowChart
              historyEvents={data.historyEvents}
              forecastEvents={data.forecastEvents}
              startBalance={data.currentBalance}
              dangerThreshold={data.dangerThreshold}
            />
          </motion.div>

          {data.forecastEvents.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
              <h2 className="text-sm font-semibold text-text-primary">Upcoming</h2>
              {data.forecastEvents.map((event) => {
                const isSavings = event.type === "savings";
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "card flex items-center justify-between px-4 py-3",
                      isSavings && "border-pulse/30 bg-pulse/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-16 text-xs text-text-muted">
                        {new Date(event.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <span className={cn("text-sm", isSavings ? "text-pulse" : "text-text-primary")}>{event.name}</span>
                      {event.category && (
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px]", isSavings ? "bg-pulse/15 text-pulse" : "bg-surface-raised text-text-muted")}>
                          {event.category}
                        </span>
                      )}
                    </div>
                    <span className={cn("font-mono text-sm", isSavings ? "text-pulse" : event.type === "income" ? "text-income" : "text-danger")}>
                      {event.type === "income" ? "+" : "-"}${Math.abs(event.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}

          {data.historyEvents.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
              <h2 className="text-sm font-semibold text-text-secondary">Recent Transactions</h2>
              {data.historyEvents.slice(-15).reverse().map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-surface/50 px-4 py-2.5 opacity-70">
                  <div className="flex items-center gap-3">
                    <span className="w-16 text-xs text-text-muted">
                      {new Date(event.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-sm text-text-secondary">{event.name}</span>
                  </div>
                  <span className={cn("font-mono text-sm", event.type === "income" ? "text-income/60" : "text-danger/60")}>
                    {event.type === "income" ? "+" : "-"}${Math.abs(event.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-sm text-text-muted">No cashflow data yet. Sync your transactions to see your cash flow history and forecast.</p>
        </div>
      )}

      {data.predictedLow < data.dangerThreshold && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-5">
          <div className="mb-2 flex items-center gap-2">
            <AgentBadge agent="pulse" />
            <span className="text-sm font-semibold text-text-primary">Pulse Recommends</span>
          </div>
          <p className="text-sm text-text-secondary">
            Your balance is projected to dip below ${data.dangerThreshold}
            {lowDateFormatted ? ` around ${lowDateFormatted}` : ""}. Consider holding off on non-essential spending or transferring funds before then.
          </p>
        </motion.div>
      )}
    </div>
  );
}
