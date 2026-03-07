import { cn } from "../../lib/utils";
import { type AgentName, AGENTS } from "../../types";

interface AgentBadgeProps {
  agent: AgentName;
  className?: string;
}

export function AgentBadge({ agent, className }: AgentBadgeProps) {
  const info = AGENTS[agent];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      style={{ color: info.color, backgroundColor: info.bgColor }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: info.color }}
      />
      {info.displayName}
    </span>
  );
}
