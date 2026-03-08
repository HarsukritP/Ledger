import { motion } from "framer-motion";
import { AgentBadge } from "./AgentBadge";
import { MoneyText } from "./MoneyText";
import { AGENTS, type AgentName, type ActionItem } from "../../types";

interface ActionCardProps {
  item: ActionItem;
  onAction?: (actionLabel: string) => void;
}

export function ActionCard({ item, onAction }: ActionCardProps) {
  const agentColor = AGENTS[item.agent as AgentName]?.color ?? "#A78BFA";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="card card-hover relative overflow-hidden p-4"
    >
      <div
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ backgroundColor: agentColor }}
      />
      <div className="mb-2 flex items-center gap-2 pl-2">
        <AgentBadge agent={item.agent} />
        {item.type === "warning" && (
          <span className="text-xs font-medium text-warning">Warning</span>
        )}
      </div>
      <div className="pl-2">
        <h4 className="text-sm font-semibold text-text-primary">{item.title}</h4>
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
                  ? "rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-black transition-all hover:brightness-110"
                  : action.variant === "danger"
                    ? "rounded-full border border-danger/30 px-4 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                    : "rounded-full border border-border px-4 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover"
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
