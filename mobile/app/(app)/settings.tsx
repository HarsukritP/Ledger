import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth0 } from "../../lib/use-auth";
import { Feather } from "@expo/vector-icons";
import { clearToken } from "../../hooks/useAuthToken";
import { api } from "../../lib/api";

const TABS = [
  { id: "accounts", label: "Linked Accounts", icon: "link" as const },
  { id: "preferences", label: "Preferences", icon: "sliders" as const },
  { id: "sandbox", label: "Sandbox Tools", icon: "database" as const },
  { id: "privacy", label: "Privacy & Data", icon: "shield" as const },
  { id: "about", label: "About", icon: "info" as const },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function SettingsScreen() {
  const { clearSession, user } = useAuth0();
  const [tab, setTab] = useState<Tab>("accounts");

  const handleSignOut = async () => {
    try {
      clearToken();
      await clearSession();
    } catch (err) {
      console.error("[AUTH] Sign-out failed:", err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-base">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold tracking-tight text-text-primary">
          Settings
        </Text>
      </View>

      {/* Tab chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
      >
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            className="flex-row items-center gap-2 rounded-full px-4 py-2 shrink-0"
            style={{
              backgroundColor: tab === t.id ? "#D4A853" : "transparent",
              borderWidth: tab === t.id ? 0 : 1,
              borderColor: "#27272A",
            }}
          >
            <Feather
              name={t.icon}
              size={14}
              color={tab === t.id ? "#000" : "#A1A1AA"}
            />
            <Text
              className="text-xs font-medium"
              style={{ color: tab === t.id ? "#000" : "#A1A1AA" }}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-2xl border border-border bg-surface p-5">
          {tab === "accounts" && <AccountsTab />}
          {tab === "preferences" && <PreferencesTab />}
          {tab === "sandbox" && <SandboxTab />}
          {tab === "privacy" && <PrivacyTab />}
          {tab === "about" && (
            <AboutTab user={user} onSignOut={handleSignOut} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountsTab() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useState(() => {
    api.plaid
      .accounts()
      .then((data: any) => setAccounts(data.accounts || []))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data: any = await api.plaid.accounts();
      setAccounts(data.accounts || []);
    } catch {
      /* keep stale data */
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-row items-center justify-center gap-2 py-8">
        <ActivityIndicator size="small" color="#71717A" />
        <Text className="text-sm text-text-muted">Loading accounts...</Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {accounts.length > 0 ? (
        <>
          {accounts.map((acct, i) => (
            <View
              key={i}
              className="rounded-xl border border-border bg-base p-4"
            >
              <Text className="text-sm font-medium text-text-primary">
                {acct.institution_name || "Bank"} — {acct.name}
              </Text>
              <Text className="text-xs text-text-muted mt-0.5">
                {acct.type} · $
                {acct.balance_current?.toLocaleString() ?? "—"}
                {acct.stale ? " (cached)" : ""}
              </Text>
            </View>
          ))}
          <Pressable
            onPress={handleRefresh}
            disabled={refreshing}
            className="flex-row items-center gap-2 rounded-full border border-border px-4 py-2 self-start"
            style={{ opacity: refreshing ? 0.5 : 1 }}
          >
            {refreshing ? (
              <ActivityIndicator size={12} color="#71717A" />
            ) : (
              <Feather name="refresh-cw" size={12} color="#71717A" />
            )}
            <Text className="text-xs font-medium text-text-secondary">
              Refresh Accounts
            </Text>
          </Pressable>
        </>
      ) : (
        <Text className="py-4 text-center text-sm text-text-muted">
          No linked accounts. Go through onboarding to link a bank.
        </Text>
      )}
    </View>
  );
}

function PreferencesTab() {
  return (
    <View className="gap-5">
      <PreferenceRow
        label="Briefing Frequency"
        options={["Daily", "Weekly"]}
        defaultValue="Weekly"
      />
      <PreferenceRow
        label="Communication Style"
        options={["Brief", "Detailed"]}
        defaultValue="Brief"
      />
      <PreferenceRow
        label="Agent Strictness"
        options={["Gentle", "Balanced", "Strict"]}
        defaultValue="Balanced"
      />
    </View>
  );
}

function SandboxTab() {
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await api.plaid.seed(8);
      setSeedResult(result);
    } catch (err: any) {
      setSeedResult({ error: err.message });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <View className="gap-4">
      <Text className="text-sm font-semibold text-text-primary">
        Seed Demo Transactions
      </Text>
      <Text className="text-xs text-text-muted leading-5">
        Generate 8 weeks of realistic transaction data: biweekly paychecks,
        rent, subscriptions, dining, shopping, and more. This replaces any
        existing transactions.
      </Text>
      <Pressable
        onPress={handleSeed}
        disabled={seeding}
        className="flex-row items-center gap-2 rounded-full bg-gold px-5 py-2 self-start"
        style={{ opacity: seeding ? 0.5 : 1 }}
      >
        {seeding ? (
          <>
            <ActivityIndicator size={14} color="#000" />
            <Text className="text-xs font-medium text-black">Seeding...</Text>
          </>
        ) : (
          <>
            <Feather name="database" size={14} color="#000" />
            <Text className="text-xs font-medium text-black">
              Seed 8 Weeks of Data
            </Text>
          </>
        )}
      </Pressable>
      {seedResult && (
        <View className="rounded-xl border border-border bg-base p-3">
          {seedResult.error ? (
            <Text className="text-xs text-danger">{seedResult.error}</Text>
          ) : (
            <View className="flex-row items-center gap-2">
              <Feather name="check-circle" size={14} color="#34D399" />
              <Text className="text-xs text-text-secondary flex-1">
                Created {seedResult.transactions_created} transactions and{" "}
                {seedResult.recurring_charges_created} recurring charges
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function PrivacyTab() {
  const MEMORIES = [
    "You get paid biweekly on the 15th and 30th",
    "Rent is $1,200, due on the 1st",
    "You kept gym membership in February",
    "You tend to overspend on dining early in the month",
  ];

  return (
    <View className="gap-4">
      <Text className="text-sm font-semibold text-text-primary">
        What Ledger Remembers
      </Text>
      {MEMORIES.map((memory, i) => (
        <View
          key={i}
          className="flex-row items-center justify-between rounded-xl border border-border bg-base p-3"
        >
          <Text className="text-sm text-text-secondary flex-1 mr-3">
            {memory}
          </Text>
          <Pressable className="rounded-full border border-danger/30 px-3 py-1 shrink-0">
            <Text className="text-xs text-danger">Forget</Text>
          </Pressable>
        </View>
      ))}
      <View className="flex-row gap-3 pt-2 flex-wrap">
        <Pressable className="rounded-full border border-border px-4 py-2">
          <Text className="text-xs text-text-secondary">Export My Data</Text>
        </Pressable>
        <Pressable className="rounded-full border border-danger/30 px-4 py-2">
          <Text className="text-xs text-danger">Delete My Account</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AboutTab({
  user,
  onSignOut,
}: {
  user: any;
  onSignOut: () => void;
}) {
  return (
    <View className="gap-4">
      {user && (
        <View className="flex-row items-center gap-3 rounded-xl border border-border bg-base p-3">
          {user.picture ? (
            <Image
              source={{ uri: user.picture }}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <View className="h-10 w-10 rounded-full bg-surface-raised items-center justify-center">
              <Feather name="user" size={20} color="#71717A" />
            </View>
          )}
          <View>
            <Text className="text-sm font-medium text-text-primary">
              {user.name}
            </Text>
            <Text className="text-xs text-text-muted">{user.email}</Text>
          </View>
        </View>
      )}
      <Text className="text-sm text-text-secondary">
        <Text className="text-text-primary font-medium">Ledger</Text> v1.0.0
      </Text>
      <Text className="text-xs text-text-muted leading-5">
        Ledger provides educational financial guidance, not regulated financial
        advice. Ledger does not execute trades, call banks, or impersonate
        financial advisors. All recommendations require user confirmation.
      </Text>
      <Text className="text-xs text-text-muted">Built for Hack Canada 2026.</Text>
      <Pressable
        onPress={onSignOut}
        className="flex-row items-center gap-2 rounded-full border border-danger/30 px-4 py-2 self-start"
      >
        <Feather name="log-out" size={14} color="#EF4444" />
        <Text className="text-xs font-medium text-danger">Sign Out</Text>
      </Pressable>
    </View>
  );
}

function PreferenceRow({
  label,
  options,
  defaultValue,
}: {
  label: string;
  options: string[];
  defaultValue: string;
}) {
  const [selected, setSelected] = useState(defaultValue);

  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-text-secondary">{label}</Text>
      <View className="flex-row gap-1 rounded-full border border-border p-0.5">
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => setSelected(opt)}
            className="rounded-full px-3 py-1"
            style={{
              backgroundColor: selected === opt ? "#D4A853" : "transparent",
            }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: selected === opt ? "#000" : "#71717A" }}
            >
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
