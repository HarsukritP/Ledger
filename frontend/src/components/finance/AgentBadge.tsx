import { cn } from "../../lib/utils";
import { type AgentName, AGENTS } from "../../types";

const FALLBACK_AGENT = {
  displayName: "Council",
  color: "#A78BFA",
  bgColor: "#A78BFA15",
};

interface AgentBadgeProps {
  agent: string;
  className?: string;
}

export function AgentBadge({ agent, className }: AgentBadgeProps) {
  const info = AGENTS[agent as AgentName] ?? FALLBACK_AGENT;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      style={{
        color: info.color,
        backgroundColor: info.bgColor,
        borderColor: `${info.color}30`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: info.color }}
      />
      {info.displayName}
    </span>
  );
}
