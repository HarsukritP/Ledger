import { View, Text } from "react-native";
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
    <View
      className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${className ?? ""}`}
      style={{ backgroundColor: info.bgColor }}
    >
      <View
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: info.color }}
      />
      <Text className="text-xs font-medium" style={{ color: info.color }}>
        {info.displayName}
      </Text>
    </View>
  );
}
