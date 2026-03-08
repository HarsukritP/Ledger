import { View, Text, Pressable } from "react-native";
import { AgentBadge } from "./AgentBadge";
import { MoneyText } from "./MoneyText";
import { AGENTS, type AgentName, type ActionItem } from "../../types";
import { useTheme } from "../../lib/theme";

interface ActionCardProps {
  item: ActionItem;
  onAction?: (actionLabel: string) => void;
}

export function ActionCard({ item, onAction }: ActionCardProps) {
  const { colors } = useTheme();
  const agentColor = AGENTS[item.agent as AgentName]?.color ?? "#A78BFA";

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: 16,
        overflow: "hidden",
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 3,
      }}
    >
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: agentColor }} />
      <View className="mb-2 flex-row items-center gap-2" style={{ paddingLeft: 4 }}>
        <AgentBadge agent={item.agent} />
        {item.type === "warning" && (
          <Text style={{ fontSize: 12, fontWeight: "500", color: colors.warning }}>Warning</Text>
        )}
      </View>
      <View style={{ paddingLeft: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary }}>{item.title}</Text>
        <Text style={{ marginTop: 4, fontSize: 14, color: colors.textSecondary }}>{item.description}</Text>
        {item.amount != null && (
          <MoneyText value={item.amount} showSign className="mt-2 text-lg" />
        )}
        <View className="mt-3 flex-row gap-2 flex-wrap">
          {item.actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => onAction?.(action.label)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 6,
                backgroundColor: action.variant === "primary" ? colors.gold : "transparent",
                borderWidth: action.variant === "primary" ? 0 : 1,
                borderColor: action.variant === "danger" ? colors.danger + "30" : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: action.variant === "primary" ? "700" : "500",
                  color: action.variant === "primary" ? "#000" : action.variant === "danger" ? colors.danger : colors.textSecondary,
                }}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
