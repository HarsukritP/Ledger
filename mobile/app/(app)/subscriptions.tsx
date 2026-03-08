import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AgentBadge } from "../../components/finance/AgentBadge";
import { MoneyText } from "../../components/finance/MoneyText";
import { api } from "../../lib/api";

interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  valueScore: number;
  status: string;
  lastChargeDate?: string;
  usageEstimate?: string;
  category?: string;
}

const FILTERS = ["All", "Needs Review", "Keep", "Flagged"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  RENT_AND_UTILITIES: "Rent & Utilities",
  ENTERTAINMENT: "Entertainment",
  GENERAL_SERVICES: "Services",
  PERSONAL_CARE: "Personal Care",
  FOOD_AND_DRINK: "Food & Drink",
  TRANSPORTATION: "Transportation",
  INCOME: "Income",
};

function getCategoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ValueDots({ score }: { score: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor:
              i < score
                ? score >= 4 ? "#34D399" : score >= 3 ? "#D4A853" : "#EF4444"
                : "#27272A",
          }}
        />
      ))}
    </View>
  );
}

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [linkingEmail, setLinkingEmail] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.expenses.list();
      setExpenses(
        data.map((s: any) => ({
          id: s.id,
          name: s.name,
          amount: s.amount,
          frequency: s.frequency,
          valueScore: s.value_score,
          status: s.status,
          lastChargeDate: s.last_charge_date,
          usageEstimate: s.usage_estimate,
          category: s.category,
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    api.email.accounts().then((d: any) => setEmailAccounts(d.accounts || [])).catch(() => {});
  }, []);

  const handleDecision = (id: string, decision: string) => {
    api.expenses.decide(id, decision).catch(console.error);
    setExpenses((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: decision === "cancel" ? "flagged" : "active" } : s
      )
    );
    setExpandedId(null);
  };

  const handleScanEmails = async () => {
    setScanning(true);
    try {
      const result = await api.email.scan();
      if (result.detected_charges > 0) {
        await loadData(true);
      }
    } catch (err) {
      console.error("[EMAIL] Scan failed:", err);
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-base items-center justify-center gap-3">
        <ActivityIndicator size="large" color="#D4A853" />
        <Text className="text-sm text-text-muted">Scanning recurring charges...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-base px-4 items-center justify-center">
        <View className="rounded-2xl border border-danger/20 bg-danger/5 p-6 w-full items-center">
          <Text className="text-sm text-danger text-center mb-3">{error}</Text>
          <Pressable onPress={() => loadData()} className="rounded-full bg-gold px-5 py-2">
            <Text className="text-xs font-medium text-black">Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const activeCount = expenses.filter((e) => e.status === "active").length;
  const potentialSavings = expenses
    .filter((e) => e.status === "flagged" || e.valueScore <= 2)
    .reduce((s, e) => s + e.amount, 0);

  const filtered =
    filter === "All"
      ? expenses
      : filter === "Needs Review"
      ? expenses.filter((e) => e.valueScore <= 2)
      : filter === "Flagged"
      ? expenses.filter((e) => e.status === "flagged")
      : expenses.filter((e) => e.status === "active" && e.valueScore >= 3);

  const grouped: Record<string, typeof filtered> = {};
  for (const exp of filtered) {
    const cat = exp.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(exp);
  }
  const sortedCategories = Object.entries(grouped).sort(
    ([, a], [, b]) => b.reduce((s, x) => s + x.amount, 0) - a.reduce((s, x) => s + x.amount, 0)
  );

  return (
    <SafeAreaView className="flex-1 bg-base">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#D4A853" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View>
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-3">
              <Text className="text-2xl font-bold tracking-tight text-text-primary">Expenses</Text>
              <AgentBadge agent="audit" />
            </View>
            {emailAccounts.length > 0 ? (
              <TouchableOpacity
                onPress={handleScanEmails}
                disabled={scanning}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "#27272A",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  opacity: scanning ? 0.5 : 1,
                }}
              >
                {scanning ? (
                  <ActivityIndicator size={12} color="#A1A1AA" />
                ) : (
                  <Feather name="search" size={12} color="#A1A1AA" />
                )}
                <Text style={{ fontSize: 12, color: "#A1A1AA", fontWeight: "500" }}>Scan Emails</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {}}
                disabled={linkingEmail}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  backgroundColor: "#D4A853",
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  opacity: linkingEmail ? 0.5 : 1,
                }}
              >
                <Feather name="mail" size={12} color="#000" />
                <Text style={{ fontSize: 12, color: "#000", fontWeight: "600" }}>Link Email</Text>
              </TouchableOpacity>
            )}
          </View>

          {emailAccounts.length > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Feather name="mail" size={12} color="#60A5FA" />
              <Text style={{ fontSize: 11, color: "#71717A" }}>
                {emailAccounts.map((a: any) => a.email_address).join(", ")} linked
              </Text>
            </View>
          )}
        </View>

        {/* Metrics */}
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-xs text-text-muted mb-1">Monthly Total</Text>
            <MoneyText value={total} animated className="text-xl text-gold" />
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-xs text-text-muted mb-1">Active</Text>
            <Text className="text-xl font-mono text-text-primary">{activeCount}</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-xs text-text-muted mb-1">Savings</Text>
            <MoneyText value={potentialSavings} className="text-xl text-income" />
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View className="flex-row gap-2">
            {FILTERS.map((f) => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  backgroundColor: filter === f ? "#D4A853" : "transparent",
                  borderWidth: filter === f ? 0 : 1,
                  borderColor: "#27272A",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: filter === f ? "#000" : "#A1A1AA",
                  }}
                >
                  {f}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Grouped list */}
        {filtered.length === 0 ? (
          <View className="rounded-2xl border border-border bg-surface p-8 items-center">
            <Text className="text-sm text-text-muted text-center">
              {expenses.length === 0
                ? "No recurring charges detected yet. Sync more transactions to see expenses."
                : "No expenses match this filter."}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 24 }}>
            {sortedCategories.map(([category, items]) => (
              <View key={category} style={{ gap: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      color: "#71717A",
                    }}
                  >
                    {getCategoryLabel(category)}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "monospace", color: "#71717A" }}>
                    ${items
                      .reduce((s, x) => s + x.amount, 0)
                      .toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                {items.map((exp) => (
                  <View
                    key={exp.id}
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: exp.status === "flagged" ? "#D4A85330" : "#27272A",
                      backgroundColor: "#111114",
                      overflow: "hidden",
                    }}
                  >
                    <Pressable
                      onPress={() =>
                        setExpandedId(expandedId === exp.id ? null : exp.id)
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 16,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: "#1A1A22",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#A1A1AA" }}>
                            {exp.name.charAt(0)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ fontSize: 14, fontWeight: "500", color: "#FAFAFA" }}
                            numberOfLines={1}
                          >
                            {exp.name}
                          </Text>
                          {exp.usageEstimate && (
                            <Text style={{ fontSize: 12, color: "#71717A" }} numberOfLines={1}>
                              {exp.usageEstimate}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <ValueDots score={exp.valueScore} />
                        <MoneyText value={-exp.amount} className="text-sm" />
                        <Feather
                          name={expandedId === exp.id ? "chevron-up" : "chevron-down"}
                          size={16}
                          color="#71717A"
                        />
                      </View>
                    </Pressable>

                    {expandedId === exp.id && (
                      <View
                        style={{
                          borderTopWidth: 1,
                          borderTopColor: "#1F1F2B",
                          padding: 16,
                          paddingTop: 12,
                          gap: 12,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <AgentBadge agent="audit" />
                          <Text style={{ fontSize: 12, color: "#71717A" }}>What Audit thinks</Text>
                        </View>
                        <Text style={{ fontSize: 14, color: "#A1A1AA", lineHeight: 20 }}>
                          {exp.valueScore <= 2
                            ? `You're paying $${exp.amount}/mo for ${exp.name}. Consider cancelling to save $${(exp.amount * 12).toFixed(0)}/year.`
                            : `${exp.name} appears to be a regular charge at $${exp.amount}/mo. Seems worth keeping based on frequency.`}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable
                            onPress={() => handleDecision(exp.id, "keep")}
                            style={{
                              borderRadius: 999,
                              backgroundColor: "#D4A853",
                              paddingHorizontal: 16,
                              paddingVertical: 6,
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#000" }}>
                              Keep
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleDecision(exp.id, "cancel")}
                            style={{
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: "#EF444430",
                              paddingHorizontal: 16,
                              paddingVertical: 6,
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: "500", color: "#EF4444" }}>
                              Flag for Cancel
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
