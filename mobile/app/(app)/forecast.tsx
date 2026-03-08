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
import { AgentBadge } from "../../components/finance/AgentBadge";
import { MoneyText } from "../../components/finance/MoneyText";
import { CashFlowChart } from "../../components/finance/CashFlowChart";
import { api } from "../../lib/api";
import type { ForecastEvent } from "../../types";

interface ForecastData {
  startBalance: number;
  dangerThreshold: number;
  predictedLow: number;
  predictedLowDate: string | null;
  events: ForecastEvent[];
}

export default function ForecastScreen() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const raw: any = await api.forecast.get();
      setData({
        startBalance: raw.current_balance ?? raw.start_balance,
        dangerThreshold: raw.danger_threshold,
        predictedLow: raw.predicted_low,
        predictedLowDate: raw.predicted_low_date,
        events: (raw.forecast_events || raw.events || []).map((e: any) => ({
          id: e.id,
          date: e.date,
          name: e.name,
          amount: e.amount,
          type: e.type,
          category: e.category,
        })),
      });
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-base items-center justify-center gap-3">
        <ActivityIndicator size="large" color="#D4A853" />
        <Text className="text-sm text-text-muted">Loading forecast...</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-base px-4 items-center justify-center">
        <View className="rounded-2xl border border-danger/20 bg-danger/5 p-6 w-full items-center">
          <Text className="text-sm text-danger text-center mb-3">
            {error || "Failed to load forecast"}
          </Text>
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

  const lowDateFormatted = data.predictedLowDate
    ? new Date(data.predictedLowDate + "T12:00:00").toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric" }
      )
    : null;

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
          <View className="flex-row items-center gap-3 mb-2">
            <Text className="text-2xl font-bold tracking-tight text-text-primary">
              Cash Flow
            </Text>
            <AgentBadge agent="pulse" />
          </View>
          <Text className="text-xs text-text-muted mb-1">Current Balance</Text>
          <View className="flex-row items-baseline gap-4 flex-wrap">
            <MoneyText
              value={data.startBalance}
              animated
              className="text-3xl text-gold"
            />
            {data.predictedLow < data.dangerThreshold && lowDateFormatted && (
              <Text className="text-sm text-warning">
                Predicted low: ${Math.round(data.predictedLow).toLocaleString()} on{" "}
                {lowDateFormatted}
              </Text>
            )}
          </View>
        </View>

        {data.events.length > 0 ? (
          <>
            {/* Chart */}
            <CashFlowChart
              events={data.events}
              startBalance={data.startBalance}
              dangerThreshold={data.dangerThreshold}
            />

            {/* Event list */}
            <View>
              <Text className="text-sm font-semibold text-text-primary mb-3">
                Upcoming Events
              </Text>
              <View className="gap-2">
                {data.events.map((event) => {
                  const isSavings = event.type === "savings";
                  const isIncome = event.type === "income";
                  return (
                    <View
                      key={event.id}
                      className="flex-row items-center justify-between rounded-xl border px-4 py-3"
                      style={{
                        borderColor: isSavings
                          ? "#3B82F620"
                          : "#27272A",
                        backgroundColor: isSavings
                          ? "#3B82F608"
                          : "#111114",
                      }}
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <Text className="w-14 text-xs text-text-muted">
                          {new Date(
                            event.date + "T12:00:00"
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                        <Text
                          className="text-sm flex-1"
                          style={{
                            color: isSavings ? "#93C5FD" : "#FAFAFA",
                          }}
                          numberOfLines={1}
                        >
                          {event.name}
                        </Text>
                        {event.category && (
                          <View
                            className="rounded-full px-2 py-0.5"
                            style={{
                              backgroundColor: isSavings
                                ? "#3B82F615"
                                : "#1A1A22",
                            }}
                          >
                            <Text
                              className="text-[10px]"
                              style={{
                                color: isSavings ? "#93C5FD" : "#71717A",
                              }}
                            >
                              {event.category}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        className="font-mono text-sm ml-2"
                        style={{
                          color: isSavings
                            ? "#60A5FA"
                            : isIncome
                              ? "#34D399"
                              : "#EF4444",
                        }}
                      >
                        {isIncome ? "+" : "-"}$
                        {Math.abs(event.amount).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Pulse recommendation */}
            {data.predictedLow < data.dangerThreshold && (
              <View className="rounded-2xl border border-border bg-surface p-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <AgentBadge agent="pulse" />
                  <Text className="text-sm font-medium text-text-primary">
                    Pulse Recommends
                  </Text>
                </View>
                <Text className="text-sm text-text-secondary leading-5">
                  Your balance is projected to dip below ${data.dangerThreshold}
                  {lowDateFormatted ? ` around ${lowDateFormatted}` : ""}
                  . Consider holding off on non-essential spending or
                  transferring funds before then.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View className="rounded-2xl border border-border bg-surface p-8 items-center">
            <Text className="text-sm text-text-muted text-center">
              No upcoming events detected yet. Sync your transactions to see
              your cash flow forecast.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
