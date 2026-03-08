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
import { useTheme } from "../../lib/theme";
import { useAuth0 } from "../../lib/use-auth";
import { MoneyText } from "../../components/finance/MoneyText";
import { AgentBadge } from "../../components/finance/AgentBadge";
import { ActionCard } from "../../components/finance/ActionCard";
import { BriefingPlayer } from "../../components/finance/BriefingPlayer";
import { getGreeting } from "../../lib/utils";
import { api } from "../../lib/api";
import type { ActionItem, HealthMetrics, ForecastEvent } from "../../types";

export default function HomeScreen() {
  const { colors } = useTheme();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={{ fontSize: 14, color: colors.textMuted }}>
            Loading your dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 }}>
        <View className="flex-1 items-center justify-center">
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.danger + "33",
              backgroundColor: colors.danger + "0D",
              padding: 24,
              width: "100%",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, color: colors.danger, textAlign: "center", marginBottom: 12 }}>{error}</Text>
            <Pressable
              onPress={() => loadData()}
              style={{
                borderRadius: 9999,
                backgroundColor: colors.gold,
                paddingHorizontal: 20,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#000000" }}>Retry</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.gold}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View>
          <Text style={{ fontSize: 24, fontWeight: "700", letterSpacing: -0.5, color: colors.textPrimary }}>
            {getGreeting()}, {firstName}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>
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
              label="Spent This Month"
              value={-health.spentThisMonth}
              sub={`of $${health.budgetLimit.toLocaleString()} avg`}
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
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 16,
          }}
        >
          <View className="flex-row items-center gap-2 mb-3">
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary }}>
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
                    <Text style={{ width: 40, fontSize: 12, color: colors.textMuted }}>
                      {new Date(event.date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "short" }
                      )}
                    </Text>
                    <Text
                      style={{ fontSize: 14, color: colors.textPrimary, flex: 1 }}
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
                <View
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.warning + "33",
                    backgroundColor: colors.warning + "0D",
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.warning }}>
                    Balance could dip to ${Math.round(predictedLow).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={{ fontSize: 14, color: colors.textMuted }}>
              No upcoming events detected yet. Sync transactions to see forecasts.
            </Text>
          )}
        </View>

        {/* Action Queue */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 12 }}>
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
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                padding: 20,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, color: colors.textMuted }}>
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
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: 12,
      }}
    >
      <Text style={{ fontSize: 10, color: colors.textMuted }}>{label}</Text>
      <MoneyText value={value} animated className={`mt-1 text-base text-${color}`} />
      <Text style={{ marginTop: 2, fontSize: 10, color: colors.textSecondary }} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}
