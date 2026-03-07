import { motion } from "framer-motion";
import { AgentBadge } from "./AgentBadge";
import { MoneyText } from "./MoneyText";
import type { ActionItem } from "../../types";

interface ActionCardProps {
  item: ActionItem;
  onAction?: (actionLabel: string) => void;
}

export function ActionCard({ item, onAction }: ActionCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border bg-surface p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <AgentBadge agent={item.agent} />
        {item.type === "warning" && (
          <span className="text-xs text-warning">Warning</span>
        )}
      </div>
      <h4 className="text-sm font-medium text-text-primary">{item.title}</h4>
      <p className="mt-1 text-sm text-text-secondary">{item.description}</p>
      {item.amount != null && (
        <MoneyText
          value={item.amount}
          showSign
          className="mt-2 text-lg"
        />
      )}
      <div className="mt-3 flex gap-2">
        {item.actions.map((action) => (
          <button
            key={action.label}
            onClick={() => onAction?.(action.label)}
            className={
              action.variant === "primary"
                ? "rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-black transition-colors hover:bg-gold/90"
                : action.variant === "danger"
                  ? "rounded-full border border-danger/30 px-4 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                  : "rounded-full border border-border px-4 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised"
            }
          >
            {action.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
