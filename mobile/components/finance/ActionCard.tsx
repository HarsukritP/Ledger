import { View, Text, Pressable } from "react-native";
import { AgentBadge } from "./AgentBadge";
import { MoneyText } from "./MoneyText";
import type { ActionItem } from "../../types";

interface ActionCardProps {
  item: ActionItem;
  onAction?: (actionLabel: string) => void;
}

export function ActionCard({ item, onAction }: ActionCardProps) {
  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <AgentBadge agent={item.agent} />
        {item.type === "warning" && (
          <Text className="text-xs text-warning">Warning</Text>
        )}
      </View>
      <Text className="text-sm font-medium text-text-primary">{item.title}</Text>
      <Text className="mt-1 text-sm text-text-secondary">{item.description}</Text>
      {item.amount != null && (
        <MoneyText value={item.amount} showSign className="mt-2 text-lg" />
      )}
      <View className="mt-3 flex-row gap-2 flex-wrap">
        {item.actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => onAction?.(action.label)}
            className={
              action.variant === "primary"
                ? "rounded-full bg-gold px-4 py-1.5"
                : action.variant === "danger"
                  ? "rounded-full border border-danger/30 px-4 py-1.5"
                  : "rounded-full border border-border px-4 py-1.5"
            }
          >
            <Text
              className={
                action.variant === "primary"
                  ? "text-xs font-medium text-black"
                  : action.variant === "danger"
                    ? "text-xs font-medium text-danger"
                    : "text-xs font-medium text-text-secondary"
              }
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
