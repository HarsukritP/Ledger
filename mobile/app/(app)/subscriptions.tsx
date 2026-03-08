import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AgentBadge } from "../../components/finance/AgentBadge";
import { MoneyText } from "../../components/finance/MoneyText";
import { api } from "../../lib/api";
import type { Subscription } from "../../types";

const FILTERS = ["All", "Needs Review", "Keep", "Flagged"] as const;

export default function SubscriptionsScreen() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data: any[] = await api.subscriptions.list();
      setSubs(
        data.map((s: any) => ({
          id: s.id,
          name: s.name,
          amount: s.amount,
          frequency: s.frequency,
          valueScore: s.value_score,
          status: s.status,
          lastChargeDate: s.last_charge_date,
          usageEstimate: s.usage_estimate,
        }))
      );
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDecision = (subId: string, decision: string) => {
    api.subscriptions.decide(subId, decision).catch(console.error);
    setSubs((prev) =>
      prev.map((s) =>
        s.id === subId
          ? { ...s, status: decision === "cancel" ? "flagged" : "active" }
          : s
      )
    );
    setExpandedId(null);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-base items-center justify-center gap-3">
        <ActivityIndicator size="large" color="#D4A853" />
        <Text className="text-sm text-text-muted">
          Scanning recurring charges...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-base px-4 items-center justify-center">
        <View className="rounded-2xl border border-danger/20 bg-danger/5 p-6 w-full items-center">
          <Text className="text-sm text-danger text-center mb-3">{error}</Text>
          <Pressable
            onPress={() => loadData()}
            className="rounded-full bg-gold px-5 py-2"
          >
            <Text className="text-xs font-medium text-black">Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const total = subs.reduce((s, sub) => s + sub.amount, 0);
  const potentialSavings = subs
    .filter((s) => s.status === "flagged" || s.valueScore <= 2)
    .reduce((s, sub) => s + sub.amount, 0);

  const filtered =
    filter === "All"
      ? subs
      : filter === "Needs Review"
        ? subs.filter((s) => s.valueScore <= 2)
        : filter === "Flagged"
          ? subs.filter((s) => s.status === "flagged")
          : subs.filter((s) => s.status === "active" && s.valueScore >= 3);

  return (
    <SafeAreaView className="flex-1 bg-base">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor="#D4A853"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Text className="text-2xl font-bold tracking-tight text-text-primary">
            Subscriptions
          </Text>
          <AgentBadge agent="audit" />
        </View>

        {/* Stats */}
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-border bg-surface p-3">
            <Text className="text-[10px] text-text-muted">Monthly Total</Text>
            <MoneyText value={total} animated className="mt-1 text-base text-gold" />
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-3">
            <Text className="text-[10px] text-text-muted">Active</Text>
            <Text className="mt-1 text-base font-mono text-text-primary">
              {subs.filter((s) => s.status === "active").length}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-3">
            <Text className="text-[10px] text-text-muted">Potential Savings</Text>
            <MoneyText
              value={potentialSavings}
              className="mt-1 text-base text-income"
            />
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              className="rounded-full px-4 py-1.5"
              style={{
                backgroundColor: filter === f ? "#D4A853" : "transparent",
                borderWidth: filter === f ? 0 : 1,
                borderColor: "#27272A",
              }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: filter === f ? "#000" : "#A1A1AA" }}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Subscription list */}
        {filtered.length === 0 ? (
          <View className="rounded-2xl border border-border bg-surface p-8 items-center">
            <Text className="text-sm text-text-muted text-center">
              {subs.length === 0
                ? "No recurring charges detected yet. Sync more transactions."
                : "No subscriptions match this filter."}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {filtered.map((sub) => (
              <View
                key={sub.id}
                className="rounded-2xl border bg-surface"
                style={{
                  borderColor:
                    sub.status === "flagged" ? "#F59E0B30" : "#27272A",
                }}
              >
                <Pressable
                  onPress={() =>
                    setExpandedId(expandedId === sub.id ? null : sub.id)
                  }
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="h-8 w-8 rounded-lg bg-surface-raised items-center justify-center">
                      <Text className="text-xs font-bold text-text-secondary">
                        {sub.name.charAt(0)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm font-medium text-text-primary"
                        numberOfLines={1}
                      >
                        {sub.name}
                      </Text>
                      {sub.usageEstimate && (
                        <Text className="text-xs text-text-muted" numberOfLines={1}>
                          {sub.usageEstimate}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <ValueDots score={sub.valueScore} />
                    <MoneyText value={-sub.amount} className="text-sm" />
                    <Feather
                      name="chevron-down"
                      size={16}
                      color="#71717A"
                      style={{
                        transform: [
                          {
                            rotate:
                              expandedId === sub.id ? "180deg" : "0deg",
                          },
                        ],
                      }}
                    />
                  </View>
                </Pressable>

                {expandedId === sub.id && (
                  <View className="border-t border-border-subtle px-4 pb-4 pt-3">
                    <View className="flex-row items-center gap-2 mb-2">
                      <AgentBadge agent="audit" />
                      <Text className="text-xs text-text-muted">
                        What Audit thinks
                      </Text>
                    </View>
                    <Text className="text-sm text-text-secondary leading-5 mb-3">
                      {sub.valueScore <= 2
                        ? `You're paying $${sub.amount}/mo for ${sub.name}. Consider cancelling to save $${(sub.amount * 12).toFixed(0)}/year.`
                        : `${sub.name} appears to be a regular charge at $${sub.amount}/mo. Seems worth keeping.`}
                    </Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => handleDecision(sub.id, "keep")}
                        className="rounded-full bg-gold px-4 py-1.5"
                      >
                        <Text className="text-xs font-medium text-black">
                          Keep
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDecision(sub.id, "cancel")}
                        className="rounded-full border border-danger/30 px-4 py-1.5"
                      >
                        <Text className="text-xs font-medium text-danger">
                          Flag for Cancel
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ValueDots({ score }: { score: number }) {
  return (
    <View className="flex-row gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor:
              i < score
                ? score >= 4
                  ? "#34D399"
                  : score >= 3
                    ? "#D4A853"
                    : "#EF4444"
                : "#27272A",
          }}
        />
      ))}
    </View>
  );
}
