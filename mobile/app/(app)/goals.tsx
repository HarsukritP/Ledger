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
import type { Goal } from "../../types";

const FEASIBILITY_STYLES = {
  on_track: { label: "On Track", color: "#34D399", bg: "#34D39915" },
  at_risk: { label: "At Risk", color: "#F59E0B", bg: "#F59E0B15" },
  behind: { label: "Behind", color: "#EF4444", bg: "#EF444415" },
} as const;

export default function GoalsScreen() {
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
      <SafeAreaView className="flex-1 bg-base items-center justify-center gap-3">
        <ActivityIndicator size="large" color="#D4A853" />
        <Text className="text-sm text-text-muted">Loading your goals...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-base px-4 items-center justify-center">
        <View className="rounded-2xl border border-danger/20 bg-danger/5 p-6 w-full items-center">
          <Text className="text-sm text-danger text-center mb-3">{error}</Text>
          <Pressable
            onPress={() => loadGoals()}
            className="rounded-full bg-gold px-5 py-2"
          >
            <Text className="text-xs font-medium text-black">Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadGoals(true)}
            tintColor="#D4A853"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Text className="text-2xl font-bold tracking-tight text-text-primary">
              Goals
            </Text>
            <AgentBadge agent="north-star" />
          </View>
          <Pressable
            onPress={() => setShowCreate(true)}
            className="flex-row items-center gap-1.5 rounded-full bg-gold px-4 py-2"
          >
            <Feather name="plus" size={14} color="#000" />
            <Text className="text-xs font-medium text-black">Add Goal</Text>
          </Pressable>
        </View>

        {goals.length === 0 ? (
          <View className="rounded-2xl border border-border bg-surface p-8 items-center">
            <Text className="text-sm text-text-muted text-center mb-4">
              No goals yet. Create your first savings goal to get started.
            </Text>
            <Pressable
              onPress={() => setShowCreate(true)}
              className="rounded-full bg-gold px-6 py-2"
            >
              <Text className="text-xs font-medium text-black">
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
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <View className="flex-row items-center gap-4">
                    <GoalRing progress={progress} size={80} strokeWidth={5}>
                      <Text className="font-mono text-sm font-medium text-gold">
                        {Math.round(progress * 100)}%
                      </Text>
                    </GoalRing>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text
                          className="text-base font-semibold text-text-primary"
                          numberOfLines={1}
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
                          className="text-lg text-gold"
                        />
                        <Text className="text-sm text-text-muted">
                          / ${goal.targetAmount.toLocaleString()}
                        </Text>
                      </View>
                      <Text className="text-xs text-text-secondary mt-1">
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
            className="flex-1 items-center justify-center bg-black/60 px-4"
            onPress={() => setShowCreate(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="w-full rounded-2xl border border-border bg-surface p-6"
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-text-primary">
                  New Goal
                </Text>
                <Pressable onPress={() => setShowCreate(false)}>
                  <Feather name="x" size={20} color="#71717A" />
                </Pressable>
              </View>
              <View className="gap-3">
                <TextInput
                  placeholder="Goal name (e.g. Japan Trip)"
                  value={newName}
                  onChangeText={setNewName}
                  placeholderTextColor="#71717A"
                  className="w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary"
                />
                <TextInput
                  placeholder="Target amount ($)"
                  value={newTarget}
                  onChangeText={setNewTarget}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#71717A"
                  className="w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary"
                />
                <TextInput
                  placeholder="Target date (YYYY-MM-DD)"
                  value={newDate}
                  onChangeText={setNewDate}
                  placeholderTextColor="#71717A"
                  className="w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-text-primary"
                />
                <Pressable
                  onPress={handleCreate}
                  disabled={creating || !newName || !newTarget}
                  className="w-full rounded-full bg-gold py-2.5 items-center"
                  style={{ opacity: creating || !newName || !newTarget ? 0.5 : 1 }}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text className="text-sm font-medium text-black">
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
          className="flex-1 items-center justify-center bg-black/60 px-4"
          onPress={() => setSelectedGoal(null)}
        >
          {selectedGoal && (
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="w-full rounded-2xl border border-border bg-surface p-6"
            >
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-text-primary flex-1 mr-4" numberOfLines={1}>
                  {selectedGoal.name}
                </Text>
                <Pressable onPress={() => setSelectedGoal(null)}>
                  <Feather name="x" size={20} color="#71717A" />
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
                    <Text className="font-mono text-2xl font-medium text-gold">
                      {Math.round(
                        selectedGoal.targetAmount > 0
                          ? (selectedGoal.currentAmount /
                              selectedGoal.targetAmount) *
                              100
                          : 0
                      )}
                      %
                    </Text>
                    <Text className="text-xs text-text-muted">complete</Text>
                  </View>
                </GoalRing>
              </View>

              <View className="gap-3 mb-4">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-text-secondary">Progress</Text>
                  <Text className="text-sm text-text-primary">
                    ${selectedGoal.currentAmount.toLocaleString()} / $
                    {selectedGoal.targetAmount.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-text-secondary">
                    Monthly Needed
                  </Text>
                  <Text className="font-mono text-sm text-text-primary">
                    ${Math.round(selectedGoal.monthlyContribution)}/mo
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-text-secondary">
                    Target Date
                  </Text>
                  <Text className="text-sm text-text-primary">
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

              <View className="rounded-xl border border-border bg-base p-4 mb-4">
                <AgentBadge agent="north-star" />
                <Text className="mt-2 text-sm text-text-secondary leading-5">
                  {selectedGoal.feasibility === "at_risk"
                    ? "This goal needs attention. Consider increasing monthly contributions or extending the deadline."
                    : selectedGoal.feasibility === "behind"
                      ? "You're falling behind on this goal. Review your spending to find areas to cut back."
                      : "You're on pace. Keep up the current contribution rate and you'll hit this goal on time."}
                </Text>
              </View>

              <Pressable
                onPress={() => handleDelete(selectedGoal.id)}
                className="w-full rounded-full border border-danger/30 py-2 items-center"
              >
                <Text className="text-xs font-medium text-danger">
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
