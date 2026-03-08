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
import { useAuth0 } from "../../lib/use-auth";
import { MoneyText } from "../../components/finance/MoneyText";
import { AgentBadge } from "../../components/finance/AgentBadge";
import { ActionCard } from "../../components/finance/ActionCard";
import { BriefingPlayer } from "../../components/finance/BriefingPlayer";
import { getGreeting } from "../../lib/utils";
import { api } from "../../lib/api";
import type { ActionItem, HealthMetrics, ForecastEvent } from "../../types";

export default function HomeScreen() {
  const { user } = useAuth0();
  const firstName =
    (user?.given_name as string | undefined) ||
    (user?.name as string | undefined)?.split(" ")[0] ||
    "there";

  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [weekAhead, setWeekAhead] = useState<ForecastEvent[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data: any = await api.dashboard.briefing();
      if (data.health) {
        setHealth({
          balance: data.health.balance,
          spentThisMonth: data.health.spent_this_month,
          saved: data.health.saved,
          budgetLimit: data.health.budget_limit,
        });
      }
      setWeekAhead(
        (data.week_ahead || []).map((e: any) => ({
          id: e.id,
          date: e.date,
          name: e.name,
          amount: e.amount,
          type: e.type,
          category: e.category,
        }))
      );
      setActions(
        (data.actions || []).map((a: any) => ({
          id: a.id,
          agent: a.agent,
          type: a.type,
          title: a.title,
          description: a.description,
          amount: a.amount,
          actions: a.actions || [],
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

  const predictedLow = weekAhead.reduce(
    (bal, e) => (e.type === "income" ? bal + e.amount : bal - e.amount),
    health?.balance ?? 0
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-base">
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color="#D4A853" />
          <Text className="text-sm text-text-muted">
            Loading your dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-base px-4">
        <View className="flex-1 items-center justify-center">
          <View className="rounded-2xl border border-danger/20 bg-danger/5 p-6 w-full items-center">
            <Text className="text-sm text-danger text-center mb-3">{error}</Text>
            <Pressable
              onPress={() => loadData()}
              className="rounded-full bg-gold px-5 py-2"
            >
              <Text className="text-xs font-medium text-black">Retry</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 24 }}
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
        <View>
          <Text className="text-2xl font-bold tracking-tight text-text-primary">
            {getGreeting()}, {firstName}
          </Text>
          <Text className="text-sm text-text-muted mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>

        {/* Health Metrics */}
        {health && (
          <View className="flex-row gap-3">
            <MetricCard
              label="Balance"
              value={health.balance}
              sub="checking"
              color="gold"
            />
            <MetricCard
              label="Spent"
              value={-health.spentThisMonth}
              sub={`of $${Math.round(health.budgetLimit / 100) * 100}`}
              color="danger"
            />
            <MetricCard
              label="Saved"
              value={health.saved}
              sub="this month"
              color="income"
            />
          </View>
        )}

        {/* Week Ahead */}
        <View className="rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Text className="text-sm font-semibold text-text-primary">
              Your Week Ahead
            </Text>
            <AgentBadge agent="pulse" />
          </View>
          {weekAhead.length > 0 ? (
            <View className="gap-3">
              {weekAhead.map((event) => (
                <View
                  key={event.id}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <Text className="w-10 text-xs text-text-muted">
                      {new Date(event.date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "short" }
                      )}
                    </Text>
                    <Text
                      className="text-sm text-text-primary flex-1"
                      numberOfLines={1}
                    >
                      {event.name}
                    </Text>
                  </View>
                  <MoneyText
                    value={
                      event.type === "income" ? event.amount : -event.amount
                    }
                    showSign
                    className="text-sm"
                  />
                </View>
              ))}
              {predictedLow < 500 && (
                <View className="rounded-xl border border-warning/20 bg-warning/5 p-3">
                  <Text className="text-xs text-warning">
                    Balance could dip to ${Math.round(predictedLow).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text className="text-sm text-text-muted">
              No upcoming events detected yet. Sync transactions to see forecasts.
            </Text>
          )}
        </View>

        {/* Action Queue */}
        <View>
          <Text className="text-sm font-semibold text-text-primary mb-3">
            Action Queue
          </Text>
          {actions.length > 0 ? (
            <View className="gap-3">
              {actions.map((action) => (
                <ActionCard
                  key={action.id}
                  item={action}
                  onAction={(label) => {
                    api.dashboard
                      .action(action.id, label.toLowerCase())
                      .catch(console.error);
                    setActions((prev) =>
                      prev.filter((a) => a.id !== action.id)
                    );
                  }}
                />
              ))}
            </View>
          ) : (
            <View className="rounded-2xl border border-border bg-surface p-5 items-center">
              <Text className="text-sm text-text-muted">
                No pending actions. Your finances look good.
              </Text>
            </View>
          )}
        </View>

        {/* Briefing Player */}
        <BriefingPlayer
          previewText={
            weekAhead.length > 0
              ? `This week: ${weekAhead.filter((e) => e.type !== "income").length} bills, ${weekAhead.filter((e) => e.type === "income").length} income.${predictedLow < 500 ? ` Watch your balance — may dip to $${Math.round(predictedLow)}.` : ""}`
              : "Link your bank account and sync transactions to get your weekly briefing."
          }
          duration="0:42"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub: string;
  color: "gold" | "danger" | "income";
}) {
  return (
    <View className="flex-1 rounded-2xl border border-border bg-surface p-3">
      <Text className="text-[10px] text-text-muted">{label}</Text>
      <MoneyText value={value} animated className={`mt-1 text-base text-${color}`} />
      <Text className="mt-0.5 text-[10px] text-text-secondary" numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}
