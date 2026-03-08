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
import { AgentBadge } from "../../components/finance/AgentBadge";
import { MoneyText } from "../../components/finance/MoneyText";
import { CashFlowChart } from "../../components/finance/CashFlowChart";
import { api } from "../../lib/api";
import type { ForecastEvent } from "../../types";

interface CashflowData {
  currentBalance: number;
  dangerThreshold: number;
  predictedLow: number;
  predictedLowDate: string | null;
  historyEvents: (ForecastEvent & { is_history?: boolean })[];
  forecastEvents: ForecastEvent[];
}

const RANGES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
] as const;

export default function CashFlowScreen() {
  const { colors } = useTheme();
  const [data, setData] = useState<CashflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState(30);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const raw: any = await api.cashflow.get(range);
      setData({
        currentBalance: raw.current_balance,
        dangerThreshold: raw.danger_threshold,
        predictedLow: raw.predicted_low,
        predictedLowDate: raw.predicted_low_date,
        historyEvents: (raw.history_events || []).map((e: any) => ({
          id: e.id,
          date: e.date,
          name: e.name,
          amount: e.amount,
          type: e.type,
          category: e.category,
          is_history: true,
        })),
        forecastEvents: (raw.forecast_events || []).map((e: any) => ({
          id: e.id,
          date: e.date,
          name: e.name,
          amount: e.amount,
          type: e.type,
          category: e.category,
        })),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} className="items-center justify-center gap-3">
        <ActivityIndicator size="large" color={colors.gold} />
        <Text className="text-sm text-text-muted">Loading cashflow...</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} className="px-4 items-center justify-center">
        <View className="rounded-2xl border border-danger/20 bg-danger/5 p-6 w-full items-center">
          <Text className="text-sm text-danger text-center mb-3">
            {error || "Failed to load cashflow"}
          </Text>
          <Pressable onPress={() => loadData()} className="rounded-full bg-gold px-5 py-2">
            <Text className="text-xs font-medium text-black">Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const lowDateFormatted = data.predictedLowDate
    ? new Date(data.predictedLowDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.gold} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View>
          <View className="flex-row items-center gap-3 mb-2">
            <Text className="text-2xl font-bold tracking-tight text-text-primary">Cash Flow</Text>
            <AgentBadge agent="pulse" />
          </View>
          <Text className="text-xs text-text-muted mb-1">Current Balance</Text>
          <View className="flex-row items-baseline gap-4 flex-wrap">
            <MoneyText value={data.currentBalance} animated className="text-3xl text-gold" />
            {data.predictedLow < data.dangerThreshold && lowDateFormatted && (
              <Text className="text-sm text-warning">
                Predicted low: ${Math.round(data.predictedLow).toLocaleString()} on {lowDateFormatted}
              </Text>
            )}
          </View>
        </View>

        {/* Time range selector */}
        <View className="flex-row gap-2">
          {RANGES.map((r) => (
            <Pressable
              key={r.label}
              onPress={() => setRange(r.days)}
              className="rounded-full px-4 py-1.5"
              style={{
                backgroundColor: range === r.days ? colors.gold : "transparent",
                borderWidth: range === r.days ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: range === r.days ? "#000" : colors.textSecondary }}
              >
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Chart */}
        {(data.historyEvents.length > 0 || data.forecastEvents.length > 0) ? (
          <>
            <CashFlowChart
              historyEvents={data.historyEvents}
              forecastEvents={data.forecastEvents}
              startBalance={data.currentBalance}
              dangerThreshold={data.dangerThreshold}
            />

            {/* Upcoming forecast events */}
            {data.forecastEvents.length > 0 && (
              <View>
                <Text className="text-sm font-semibold text-text-primary mb-3">Upcoming</Text>
                <View className="gap-2">
                  {data.forecastEvents.map((event) => {
                    const isSavings = event.type === "savings";
                    const isIncome = event.type === "income";
                    return (
                      <View
                        key={event.id}
                        className="flex-row items-center justify-between rounded-xl border px-4 py-3"
                        style={{
                          borderColor: isSavings ? "#3B82F620" : colors.border,
                          backgroundColor: isSavings ? "#3B82F608" : colors.surface,
                        }}
                      >
                        <View className="flex-row items-center gap-3 flex-1">
                          <Text className="w-14 text-xs text-text-muted">
                            {new Date(event.date + "T12:00:00").toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </Text>
                          <Text
                            className="text-sm flex-1"
                            style={{ color: isSavings ? "#93C5FD" : colors.textPrimary }}
                            numberOfLines={1}
                          >
                            {event.name}
                          </Text>
                          {event.category && (
                            <View
                              className="rounded-full px-2 py-0.5"
                              style={{ backgroundColor: isSavings ? "#3B82F615" : colors.surfaceRaised }}
                            >
                              <Text
                                className="text-[10px]"
                                style={{ color: isSavings ? "#93C5FD" : colors.textMuted }}
                              >
                                {event.category}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          className="font-mono text-sm ml-2"
                          style={{
                            color: isSavings ? colors.pulse : isIncome ? colors.income : colors.danger,
                          }}
                        >
                          {isIncome ? "+" : "-"}$
                          {Math.abs(event.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Recent history events */}
            {data.historyEvents.length > 0 && (
              <View>
                <Text className="text-sm font-semibold text-text-secondary mb-3">
                  Recent Transactions
                </Text>
                <View className="gap-2">
                  {data.historyEvents
                    .slice(-15)
                    .reverse()
                    .map((event) => {
                      const isIncome = event.type === "income";
                      return (
                        <View
                          key={event.id}
                          className="flex-row items-center justify-between rounded-xl border px-4 py-2.5"
                          style={{ borderColor: colors.border, backgroundColor: colors.surface, opacity: 0.7 }}
                        >
                          <View className="flex-row items-center gap-3 flex-1">
                            <Text className="w-14 text-xs text-text-muted">
                              {new Date(event.date + "T12:00:00").toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </Text>
                            <Text className="text-sm text-text-secondary flex-1" numberOfLines={1}>
                              {event.name}
                            </Text>
                          </View>
                          <Text
                            className="font-mono text-sm ml-2"
                            style={{ color: isIncome ? `${colors.income}99` : `${colors.danger}99` }}
                          >
                            {isIncome ? "+" : "-"}$
                            {Math.abs(event.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              </View>
            )}

            {/* Pulse recommendation */}
            {data.predictedLow < data.dangerThreshold && (
              <View className="rounded-2xl border p-4" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <AgentBadge agent="pulse" />
                  <Text className="text-sm font-medium text-text-primary">Pulse Recommends</Text>
                </View>
                <Text className="text-sm text-text-secondary leading-5">
                  Your balance is projected to dip below ${data.dangerThreshold}
                  {lowDateFormatted ? ` around ${lowDateFormatted}` : ""}. Consider holding off on
                  non-essential spending or transferring funds before then.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View className="rounded-2xl border p-8 items-center" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
            <Text className="text-sm text-text-muted text-center">
              No cashflow data yet. Sync your transactions to see your cash flow history and forecast.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
