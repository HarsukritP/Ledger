import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AgentBadge } from "../../components/finance/AgentBadge";
import { MoneyText } from "../../components/finance/MoneyText";
import { GoalRing } from "../../components/finance/GoalRing";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import type { Goal } from "../../types";

const FEASIBILITY_STYLES = {
  on_track: { label: "On Track", color: "#22C55E", bg: "#22C55E15" },
  at_risk: { label: "At Risk", color: "#F97316", bg: "#F9731615" },
  behind: { label: "Behind", color: "#EF4444", bg: "#EF444415" },
} as const;

export default function GoalsScreen() {
  const { colors } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDate, setNewDate] = useState("");
  const [creating, setCreating] = useState(false);

  const loadGoals = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data: any[] = await api.goals.list();
      setGoals(
        data.map((g: any) => ({
          id: g.id,
          name: g.name,
          targetAmount: g.target_amount,
          currentAmount: g.current_amount,
          targetDate: g.target_date,
          monthlyContribution: g.monthly_contribution,
          feasibility: g.feasibility || "on_track",
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
    loadGoals();
  }, []);

  const handleCreate = async () => {
    if (!newName || !newTarget) return;
    setCreating(true);
    try {
      await api.goals.create({
        name: newName,
        target_amount: parseFloat(newTarget),
        target_date:
          newDate ||
          new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
      });
      setShowCreate(false);
      setNewName("");
      setNewTarget("");
      setNewDate("");
      loadGoals();
    } catch (err: any) {
      console.error("[GOALS] Create failed:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await api.goals.delete(goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      setSelectedGoal(null);
    } catch (err: any) {
      console.error("[GOALS] Delete failed:", err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} className="items-center justify-center gap-3">
        <ActivityIndicator size="large" color={colors.gold} />
        <Text className="text-sm" style={{ color: colors.textMuted }}>Loading your goals...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} className="px-4 items-center justify-center">
        <View className="rounded-2xl border p-6 w-full items-center" style={{ borderColor: colors.danger + "33", backgroundColor: colors.danger + "0D" }}>
          <Text className="text-sm text-center mb-3" style={{ color: colors.danger }}>{error}</Text>
          <Pressable
            onPress={() => loadGoals()}
            className="rounded-full px-5 py-2"
            style={{ backgroundColor: colors.gold }}
          >
            <Text className="text-xs font-medium" style={{ color: "#000" }}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadGoals(true)}
            tintColor={colors.gold}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Text className="text-2xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
              Goals
            </Text>
            <AgentBadge agent="north-star" />
          </View>
          <Pressable
            onPress={() => setShowCreate(true)}
            className="flex-row items-center gap-1.5 rounded-full px-4 py-2"
            style={{ backgroundColor: colors.gold }}
          >
            <Feather name="plus" size={14} color="#000" />
            <Text className="text-xs font-medium" style={{ color: "#000" }}>Add Goal</Text>
          </Pressable>
        </View>

        {goals.length === 0 ? (
          <View className="rounded-2xl border p-8 items-center" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
            <Text className="text-sm text-center mb-4" style={{ color: colors.textMuted }}>
              No goals yet. Create your first savings goal to get started.
            </Text>
            <Pressable
              onPress={() => setShowCreate(true)}
              className="rounded-full px-6 py-2"
              style={{ backgroundColor: colors.gold }}
            >
              <Text className="text-xs font-medium" style={{ color: "#000" }}>
                Create Goal
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-3">
            {goals.map((goal) => {
              const progress =
                goal.targetAmount > 0
                  ? goal.currentAmount / goal.targetAmount
                  : 0;
              const fStyle =
                FEASIBILITY_STYLES[
                  goal.feasibility as keyof typeof FEASIBILITY_STYLES
                ] || FEASIBILITY_STYLES.on_track;

              return (
                <Pressable
                  key={goal.id}
                  onPress={() => setSelectedGoal(goal)}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                >
                  <View className="flex-row items-center gap-4">
                    <GoalRing progress={progress} size={80} strokeWidth={5}>
                      <Text className="font-mono text-sm font-medium" style={{ color: colors.northStar }}>
                        {Math.round(progress * 100)}%
                      </Text>
                    </GoalRing>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text
                          className="text-base font-semibold"
                          numberOfLines={1}
                          style={{ color: colors.textPrimary }}
                        >
                          {goal.name}
                        </Text>
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: fStyle.bg }}
                        >
                          <Text
                            className="text-[10px] font-medium"
                            style={{ color: fStyle.color }}
                          >
                            {fStyle.label}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-baseline gap-1 mt-1">
                        <MoneyText
                          value={goal.currentAmount}
                          className="text-lg"
                          style={{ color: colors.northStar }}
                        />
                        <Text className="text-sm" style={{ color: colors.textMuted }}>
                          / ${goal.targetAmount.toLocaleString()}
                        </Text>
                      </View>
                      <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                        ${Math.round(goal.monthlyContribution)}/mo ·{" "}
                        {goal.targetDate
                          ? new Date(
                              goal.targetDate + "T12:00:00"
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            })
                          : "No deadline"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal
        visible={showCreate}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <Pressable
            className="flex-1 items-center justify-center px-4"
            style={{ backgroundColor: colors.overlay }}
            onPress={() => setShowCreate(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="w-full rounded-2xl border p-6"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                  New Goal
                </Text>
                <Pressable onPress={() => setShowCreate(false)}>
                  <Feather name="x" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <View className="gap-3">
                <TextInput
                  placeholder="Goal name (e.g. Japan Trip)"
                  value={newName}
                  onChangeText={setNewName}
                  placeholderTextColor={colors.textMuted}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm"
                  style={{ borderColor: colors.border, backgroundColor: colors.bg, color: colors.textPrimary }}
                />
                <TextInput
                  placeholder="Target amount ($)"
                  value={newTarget}
                  onChangeText={setNewTarget}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textMuted}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm"
                  style={{ borderColor: colors.border, backgroundColor: colors.bg, color: colors.textPrimary }}
                />
                <TextInput
                  placeholder="Target date (YYYY-MM-DD)"
                  value={newDate}
                  onChangeText={setNewDate}
                  placeholderTextColor={colors.textMuted}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm"
                  style={{ borderColor: colors.border, backgroundColor: colors.bg, color: colors.textPrimary }}
                />
                <Pressable
                  onPress={handleCreate}
                  disabled={creating || !newName || !newTarget}
                  className="w-full rounded-full py-2.5 items-center"
                  style={{ backgroundColor: colors.gold, opacity: creating || !newName || !newTarget ? 0.5 : 1 }}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text className="text-sm font-medium" style={{ color: "#000" }}>
                      Create Goal
                    </Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Goal Detail Modal */}
      <Modal
        visible={!!selectedGoal}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedGoal(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center px-4"
          style={{ backgroundColor: colors.overlay }}
          onPress={() => setSelectedGoal(null)}
        >
          {selectedGoal && (
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="w-full rounded-2xl border p-6"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold flex-1 mr-4" numberOfLines={1} style={{ color: colors.textPrimary }}>
                  {selectedGoal.name}
                </Text>
                <Pressable onPress={() => setSelectedGoal(null)}>
                  <Feather name="x" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <View className="items-center mb-6">
                <GoalRing
                  progress={
                    selectedGoal.targetAmount > 0
                      ? selectedGoal.currentAmount / selectedGoal.targetAmount
                      : 0
                  }
                  size={160}
                  strokeWidth={8}
                >
                  <View className="items-center">
                    <Text className="font-mono text-2xl font-medium" style={{ color: colors.northStar }}>
                      {Math.round(
                        selectedGoal.targetAmount > 0
                          ? (selectedGoal.currentAmount /
                              selectedGoal.targetAmount) *
                              100
                          : 0
                      )}
                      %
                    </Text>
                    <Text className="text-xs" style={{ color: colors.textMuted }}>complete</Text>
                  </View>
                </GoalRing>
              </View>

              <View className="gap-3 mb-4">
                <View className="flex-row justify-between">
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>Progress</Text>
                  <Text className="text-sm" style={{ color: colors.textPrimary }}>
                    ${selectedGoal.currentAmount.toLocaleString()} / $
                    {selectedGoal.targetAmount.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    Monthly Needed
                  </Text>
                  <Text className="font-mono text-sm" style={{ color: colors.textPrimary }}>
                    ${Math.round(selectedGoal.monthlyContribution)}/mo
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    Target Date
                  </Text>
                  <Text className="text-sm" style={{ color: colors.textPrimary }}>
                    {selectedGoal.targetDate
                      ? new Date(
                          selectedGoal.targetDate + "T12:00:00"
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })
                      : "Not set"}
                  </Text>
                </View>
              </View>

              <View className="rounded-xl border p-4 mb-4" style={{ borderColor: colors.border, backgroundColor: colors.bg }}>
                <AgentBadge agent="north-star" />
                <Text className="mt-2 text-sm leading-5" style={{ color: colors.textSecondary }}>
                  {selectedGoal.feasibility === "at_risk"
                    ? "This goal needs attention. Consider increasing monthly contributions or extending the deadline."
                    : selectedGoal.feasibility === "behind"
                      ? "You're falling behind on this goal. Review your spending to find areas to cut back."
                      : "You're on pace. Keep up the current contribution rate and you'll hit this goal on time."}
                </Text>
              </View>

              <Pressable
                onPress={() => handleDelete(selectedGoal.id)}
                className="w-full rounded-full border py-2 items-center"
                style={{ borderColor: colors.danger + "4D" }}
              >
                <Text className="text-xs font-medium" style={{ color: colors.danger }}>
                  Delete Goal
                </Text>
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
