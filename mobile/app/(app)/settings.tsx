import { useState, useEffect } from "react";
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
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linkingEmail, setLinkingEmail] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    Promise.all([
      api.plaid.accounts().then((data: any) => setBankAccounts(data.accounts || [])).catch(() => {}),
      api.email.accounts().then((data: any) => setEmailAccounts(data.accounts || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data: any = await api.plaid.accounts();
      setBankAccounts(data.accounts || []);
    } catch { /* keep stale */ }
    finally { setRefreshing(false); }
  };

  const handleLinkEmail = async () => {
    setLinkingEmail(true);
    try {
      const data = await api.email.authUrl();
      if (typeof window !== "undefined") {
        window.location.href = data.auth_url;
      }
    } catch (err) {
      console.error("[EMAIL] Auth URL failed:", err);
      setLinkingEmail(false);
    }
  };

  const handleScanEmails = async () => {
    setScanning(true);
    try {
      await api.email.scan();
    } catch (err) {
      console.error("[EMAIL] Scan failed:", err);
    } finally {
      setScanning(false);
    }
  };

  const handleUnlinkEmail = async (id: string) => {
    try {
      await api.email.unlink(id);
      setEmailAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("[EMAIL] Unlink failed:", err);
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
    <View className="gap-5">
      {/* Bank Accounts */}
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Feather name="briefcase" size={14} color="#71717A" />
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Bank Accounts
          </Text>
        </View>
        {bankAccounts.length > 0 ? (
          <>
            {bankAccounts.map((acct, i) => (
              <View key={i} className="flex-row items-center gap-3 rounded-xl border border-border bg-base p-4">
                <Feather name="credit-card" size={16} color="#D4A853" />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-text-primary">
                    {acct.institution_name || "Bank"} — {acct.name}
                  </Text>
                  <Text className="text-xs text-text-muted mt-0.5">
                    {acct.type} · ${acct.balance_current?.toLocaleString() ?? "—"}
                    {acct.stale ? " (cached)" : ""}
                  </Text>
                </View>
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
          <Text className="text-sm text-text-muted">
            No bank accounts linked. Go through onboarding to link a bank.
          </Text>
        )}
      </View>

      {/* Email Accounts */}
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Feather name="mail" size={14} color="#71717A" />
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Email Accounts
          </Text>
        </View>
        {emailAccounts.length > 0 ? (
          <>
            {emailAccounts.map((acct) => (
              <View key={acct.id} className="flex-row items-center justify-between rounded-xl border border-border bg-base p-4">
                <View className="flex-row items-center gap-3 flex-1">
                  <Feather name="mail" size={16} color="#60A5FA" />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>
                      {acct.email_address}
                    </Text>
                    <Text className="text-xs text-text-muted mt-0.5">
                      {acct.provider} · {acct.last_scanned_at
                        ? `Scanned ${new Date(acct.last_scanned_at).toLocaleDateString()}`
                        : "Not scanned yet"}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleUnlinkEmail(acct.id)}
                  className="rounded-full border border-danger/30 px-3 py-1 ml-3"
                >
                  <Text className="text-xs text-danger">Unlink</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={handleScanEmails}
              disabled={scanning}
              className="flex-row items-center gap-2 rounded-full border border-border px-4 py-2 self-start"
              style={{ opacity: scanning ? 0.5 : 1 }}
            >
              {scanning ? (
                <ActivityIndicator size={12} color="#71717A" />
              ) : (
                <Feather name="search" size={12} color="#71717A" />
              )}
              <Text className="text-xs font-medium text-text-secondary">
                Scan for Receipts
              </Text>
            </Pressable>
          </>
        ) : (
          <View className="gap-2">
            <Text className="text-sm text-text-muted leading-5">
              Link your email to automatically detect subscriptions from billing receipts.
            </Text>
            <Pressable
              onPress={handleLinkEmail}
              disabled={linkingEmail}
              className="flex-row items-center gap-2 rounded-full bg-gold px-5 py-2 self-start"
              style={{ opacity: linkingEmail ? 0.5 : 1 }}
            >
              {linkingEmail ? (
                <ActivityIndicator size={14} color="#000" />
              ) : (
                <Feather name="mail" size={14} color="#000" />
              )}
              <Text className="text-xs font-medium text-black">
                Link Gmail Account
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function PreferencesTab() {
  const [prefs, setPrefs] = useState({
    briefing_frequency: "weekly",
    communication_style: "brief",
    agent_strictness: "balanced",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings
      .get()
      .then((data: any) => {
        setPrefs({
          briefing_frequency: data.briefing_frequency || "weekly",
          communication_style: data.communication_style || "brief",
          agent_strictness: data.agent_strictness || "balanced",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updatePref = (key: string, value: string) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaving(true);
    api.settings.update(updated).catch(console.error).finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <View className="flex-row items-center justify-center gap-2 py-8">
        <ActivityIndicator size="small" color="#71717A" />
        <Text className="text-sm text-text-muted">Loading preferences...</Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      {saving && (
        <Text className="text-[10px] text-gold">Saving...</Text>
      )}
      <PreferenceRow
        label="Briefing Frequency"
        options={["daily", "weekly"]}
        value={prefs.briefing_frequency}
        onChange={(v) => updatePref("briefing_frequency", v)}
      />
      <PreferenceRow
        label="Communication Style"
        options={["brief", "detailed"]}
        value={prefs.communication_style}
        onChange={(v) => updatePref("communication_style", v)}
      />
      <PreferenceRow
        label="Agent Strictness"
        options={["gentle", "balanced", "strict"]}
        value={prefs.agent_strictness}
        onChange={(v) => updatePref("agent_strictness", v)}
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
        existing transactions and populates the dashboard, forecasts, and
        subscription views.
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
  const { clearSession } = useAuth0();
  const [memories, setMemories] = useState<any[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api.settings
      .memories()
      .then((data: any) => setMemories(data.memories || []))
      .catch(() => {})
      .finally(() => setMemoriesLoading(false));
  }, []);

  const handleForgetMemory = async (id: string) => {
    try {
      await api.settings.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("[SETTINGS] Delete memory failed:", err);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.settings.export();
      const json = JSON.stringify(data, null, 2);
      if (typeof window !== "undefined") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ledger-export.json";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("[SETTINGS] Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.settings.deleteAccount();
      clearToken();
      await clearSession();
    } catch (err) {
      console.error("[SETTINGS] Delete failed:", err);
      setDeleting(false);
    }
  };

  return (
    <View className="gap-5">
      {/* What Ledger Remembers */}
      <View className="gap-3">
        <Text className="text-sm font-semibold text-text-primary">
          What Ledger Remembers
        </Text>
        {memoriesLoading ? (
          <ActivityIndicator size="small" color="#71717A" />
        ) : memories.length > 0 ? (
          memories.map((memory) => (
            <View
              key={memory.id}
              className="flex-row items-center justify-between rounded-xl border border-border bg-base p-3"
            >
              <Text className="text-sm text-text-secondary flex-1 mr-3" numberOfLines={3}>
                {memory.content || memory.text || String(memory)}
              </Text>
              <Pressable
                onPress={() => handleForgetMemory(memory.id)}
                className="rounded-full border border-danger/30 px-3 py-1 shrink-0"
              >
                <Text className="text-xs text-danger">Forget</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text className="text-sm text-text-muted">
            No memories stored yet. Ledger will learn from your activity over time.
          </Text>
        )}
      </View>

      {/* Your Data */}
      <View className="gap-3">
        <Text className="text-sm font-semibold text-text-primary">Your Data</Text>
        <Text className="text-xs text-text-muted leading-5">
          Ledger stores your transaction data, goals, and preferences. You can export or permanently delete all of it below.
        </Text>
      <View className="flex-row gap-3 pt-1 flex-wrap">
        <Pressable
          onPress={handleExport}
          disabled={exporting}
          className="flex-row items-center gap-2 rounded-full border border-border px-4 py-2"
          style={{ opacity: exporting ? 0.5 : 1 }}
        >
          {exporting ? (
            <ActivityIndicator size={12} color="#71717A" />
          ) : (
            <Feather name="download" size={12} color="#71717A" />
          )}
          <Text className="text-xs text-text-secondary">Export My Data</Text>
        </Pressable>
        {!confirmDelete ? (
          <Pressable
            onPress={() => setConfirmDelete(true)}
            className="flex-row items-center gap-2 rounded-full border border-danger/30 px-4 py-2"
          >
            <Feather name="trash-2" size={12} color="#EF4444" />
            <Text className="text-xs text-danger">Delete My Account</Text>
          </Pressable>
        ) : (
          <View className="gap-2">
            <Text className="text-xs text-danger">Are you sure? This cannot be undone.</Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                className="rounded-full bg-danger px-4 py-2"
                style={{ opacity: deleting ? 0.5 : 1 }}
              >
                <Text className="text-xs font-medium text-white">
                  {deleting ? "Deleting..." : "Yes, Delete Everything"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setConfirmDelete(false)}
                className="rounded-full border border-border px-3 py-2"
              >
                <Text className="text-xs text-text-muted">Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
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
        <Text className="text-text-primary font-medium">Ledger</Text> v0.1.0
      </Text>
      <Text className="text-xs text-text-muted leading-5">
        Ledger provides educational financial guidance, not regulated financial
        advice. Ledger does not execute trades, call banks, or impersonate
        financial advisors. All recommendations are preference-based and require
        user confirmation.
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
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-text-secondary">{label}</Text>
      <View className="flex-row gap-1 rounded-full border border-border p-0.5">
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            className="rounded-full px-3 py-1"
            style={{
              backgroundColor: value === opt ? "#D4A853" : "transparent",
            }}
          >
            <Text
              className="text-xs font-medium capitalize"
              style={{ color: value === opt ? "#000" : "#71717A" }}
            >
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
