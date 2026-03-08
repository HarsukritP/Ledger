import { useState, useEffect } from "react";
import { useTheme } from "../../lib/theme";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth0 } from "../../lib/use-auth";
import { Feather } from "@expo/vector-icons";
import { clearToken } from "../../hooks/useAuthToken";
import { api } from "../../lib/api";
import { usePushNotifications } from "../../hooks/usePushNotifications";

const TABS = [
  { id: "accounts", label: "Accounts", icon: "link" as const },
  { id: "preferences", label: "Preferences", icon: "sliders" as const },
  { id: "sandbox", label: "Sandbox", icon: "database" as const },
  { id: "privacy", label: "Privacy", icon: "shield" as const },
  { id: "about", label: "About", icon: "info" as const },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function SettingsScreen() {
  const { colors } = useTheme();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.5 }}>
          Settings
        </Text>
      </View>

      {/* Tab bar — compact, scrollable, icon + short label */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                height: 34,
                paddingHorizontal: 14,
                borderRadius: 8,
                backgroundColor: active ? colors.gold : colors.surface,
                borderWidth: active ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Feather name={t.icon} size={13} color={active ? "#000" : colors.textMuted} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#000" : colors.textMuted }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        key={tab}
      >
        {tab === "accounts" && <AccountsTab />}
        {tab === "preferences" && <PreferencesTab />}
        {tab === "sandbox" && <SandboxTab />}
        {tab === "privacy" && <PrivacyTab />}
        {tab === "about" && <AboutTab user={user} onSignOut={handleSignOut} />}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Section header ──────────────────────────────────────────────── */
function SectionHeader({ icon, label }: { icon: any; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 }}>
      <Feather name={icon} size={13} color={colors.textMuted} />
      <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textMuted }}>
        {label}
      </Text>
    </View>
  );
}

/* ─── Card wrapper ────────────────────────────────────────────────── */
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }, style]}>
      {children}
    </View>
  );
}

/* ─── Row item inside a Card ──────────────────────────────────────── */
function CardRow({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  last = false,
}: {
  icon: any;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  last?: boolean;
}) {
  const { colors } = useTheme();
  const resolvedIconColor = iconColor ?? colors.textMuted;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.borderSubtle,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: colors.surfaceRaised,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Feather name={icon} size={14} color={resolvedIconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: "500" }} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right && <View style={{ marginLeft: 10 }}>{right}</View>}
    </View>
  );
}

/* ─── Accounts tab ────────────────────────────────────────────────── */
function AccountsTab() {
  const { colors } = useTheme();
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linkingEmail, setLinkingEmail] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    Promise.all([
      api.plaid.accounts().then((d: any) => setBankAccounts(d.accounts || [])).catch(() => {}),
      api.email.accounts().then((d: any) => setEmailAccounts(d.accounts || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    api.plaid.accounts().then((d: any) => setBankAccounts(d.accounts || [])).catch(() => {}).finally(() => setRefreshing(false));
  };

  const handleLinkEmail = async () => {
    setLinkingEmail(true);
    try {
      const data = await api.email.authUrl();
      if (typeof window !== "undefined") window.location.href = data.auth_url;
    } catch { setLinkingEmail(false); }
  };

  const handleScanEmails = async () => {
    setScanning(true);
    api.email.scan().catch(console.error).finally(() => setScanning(false));
  };

  const handleUnlinkEmail = async (id: string) => {
    api.email.unlink(id).then(() => setEmailAccounts((p) => p.filter((a) => a.id !== id))).catch(console.error);
  };

  if (loading) {
    return (
      <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 }}>
        <ActivityIndicator size="small" color={colors.textMuted} />
        <Text style={{ fontSize: 13, color: colors.textMuted }}>Loading accounts…</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 20 }}>
      {/* Bank Accounts */}
      <View>
        <SectionHeader icon="briefcase" label="Bank Accounts" />
        {bankAccounts.length > 0 ? (
          <>
            <Card>
              {bankAccounts.map((acct, i) => (
                <CardRow
                  key={i}
                  icon="credit-card"
                  iconColor={colors.gold}
                  title={`${acct.institution_name || "Bank"} — ${acct.name}`}
                  subtitle={`${acct.type} · $${acct.balance_current?.toLocaleString() ?? "—"}${acct.stale ? " (cached)" : ""}`}
                  last={i === bankAccounts.length - 1}
                />
              ))}
            </Card>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 10,
                alignSelf: "flex-start",
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 14,
                paddingVertical: 7,
                opacity: refreshing ? 0.5 : 1,
              }}
            >
              {refreshing ? <ActivityIndicator size={12} color={colors.textMuted} /> : <Feather name="refresh-cw" size={12} color={colors.textMuted} />}
              <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>Refresh</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Card>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }}>
                No bank accounts linked. Complete onboarding to connect your bank.
              </Text>
            </View>
          </Card>
        )}
      </View>

      {/* Email Accounts */}
      <View>
        <SectionHeader icon="mail" label="Email Accounts" />
        {emailAccounts.length > 0 ? (
          <>
            <Card>
              {emailAccounts.map((acct, i) => (
                <CardRow
                  key={acct.id}
                  icon="mail"
                  iconColor={colors.pulse}
                  title={acct.email_address}
                  subtitle={`${acct.provider} · ${acct.last_scanned_at ? `Scanned ${new Date(acct.last_scanned_at).toLocaleDateString()}` : "Not scanned yet"}`}
                  last={i === emailAccounts.length - 1}
                  right={
                    <TouchableOpacity
                      onPress={() => handleUnlinkEmail(acct.id)}
                      style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.danger + "30", paddingHorizontal: 10, paddingVertical: 4 }}
                    >
                      <Text style={{ fontSize: 11, color: colors.danger, fontWeight: "500" }}>Unlink</Text>
                    </TouchableOpacity>
                  }
                />
              ))}
            </Card>
            <TouchableOpacity
              onPress={handleScanEmails}
              disabled={scanning}
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                marginTop: 10, alignSelf: "flex-start", borderRadius: 999,
                borderWidth: 1, borderColor: colors.border,
                paddingHorizontal: 14, paddingVertical: 7,
                opacity: scanning ? 0.5 : 1,
              }}
            >
              {scanning ? <ActivityIndicator size={12} color={colors.textMuted} /> : <Feather name="search" size={12} color={colors.textMuted} />}
              <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>Scan for Receipts</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Card>
            <View style={{ padding: 16, gap: 12 }}>
              <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }}>
                Link your email to automatically detect subscriptions from billing receipts.
              </Text>
              <TouchableOpacity
                onPress={handleLinkEmail}
                disabled={linkingEmail}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 7,
                  alignSelf: "flex-start", backgroundColor: colors.gold,
                  borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8,
                  opacity: linkingEmail ? 0.5 : 1,
                }}
              >
                {linkingEmail ? <ActivityIndicator size={13} color="#000" /> : <Feather name="mail" size={13} color="#000" />}
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#000" }}>Link Gmail Account</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </View>
    </View>
  );
}

/* ─── Preferences tab ─────────────────────────────────────────────── */
function PreferencesTab() {
  const { colors } = useTheme();
  const [prefs, setPrefs] = useState({
    briefing_frequency: "weekly",
    communication_style: "brief",
    agent_strictness: "balanced",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings.get()
      .then((d: any) => setPrefs({
        briefing_frequency: d.briefing_frequency || "weekly",
        communication_style: d.communication_style || "brief",
        agent_strictness: d.agent_strictness || "balanced",
      }))
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
      <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 }}>
        <ActivityIndicator size="small" color={colors.textMuted} />
        <Text style={{ fontSize: 13, color: colors.textMuted }}>Loading preferences…</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 20 }}>
      {saving && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <ActivityIndicator size={12} color={colors.gold} />
          <Text style={{ fontSize: 11, color: colors.gold }}>Saving…</Text>
        </View>
      )}
      <Card>
        <SegmentRow
          label="Briefing Frequency"
          options={["daily", "weekly"]}
          value={prefs.briefing_frequency}
          onChange={(v) => updatePref("briefing_frequency", v)}
        />
        <SegmentRow
          label="Communication Style"
          options={["brief", "detailed"]}
          value={prefs.communication_style}
          onChange={(v) => updatePref("communication_style", v)}
        />
        <SegmentRow
          label="Agent Strictness"
          options={["gentle", "balanced", "strict"]}
          value={prefs.agent_strictness}
          onChange={(v) => updatePref("agent_strictness", v)}
          last
        />
      </Card>
    </View>
  );
}

function SegmentRow({
  label,
  options,
  value,
  onChange,
  last = false,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.borderSubtle,
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "500" }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              activeOpacity={0.7}
              style={{
                height: 30,
                paddingHorizontal: 12,
                borderRadius: 7,
                justifyContent: "center",
                backgroundColor: active ? colors.gold : colors.surfaceRaised,
                borderWidth: active ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "#000" : colors.textMuted, textTransform: "capitalize" }}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Sandbox tab ─────────────────────────────────────────────────── */
function SandboxTab() {
  const { colors } = useTheme();
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
    <View style={{ gap: 16 }}>
      <Card>
        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.gold + "18", alignItems: "center", justifyContent: "center" }}>
              <Feather name="database" size={16} color={colors.gold} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}>Seed Demo Transactions</Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 19 }}>
            Generate 8 weeks of realistic transaction data: biweekly paychecks, rent, subscriptions, dining, shopping, and more. Replaces any existing transactions and populates the dashboard, forecasts, and expense views.
          </Text>
          <TouchableOpacity
            onPress={handleSeed}
            disabled={seeding}
            style={{
              flexDirection: "row", alignItems: "center", gap: 8,
              alignSelf: "flex-start", backgroundColor: colors.gold,
              borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9,
              opacity: seeding ? 0.6 : 1,
            }}
          >
            {seeding ? <ActivityIndicator size={14} color="#000" /> : <Feather name="zap" size={14} color="#000" />}
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#000" }}>
              {seeding ? "Seeding…" : "Seed 8 Weeks of Data"}
            </Text>
          </TouchableOpacity>

          {seedResult && (
            <View style={{
              borderRadius: 10, borderWidth: 1,
              borderColor: seedResult.error ? colors.danger + "30" : colors.income + "30",
              backgroundColor: seedResult.error ? colors.danger + "08" : colors.income + "08",
              padding: 12, flexDirection: "row", alignItems: "center", gap: 8,
            }}>
              <Feather name={seedResult.error ? "x-circle" : "check-circle"} size={14} color={seedResult.error ? colors.danger : colors.income} />
              <Text style={{ fontSize: 12, color: seedResult.error ? colors.danger : colors.textSecondary, flex: 1 }}>
                {seedResult.error
                  ? seedResult.error
                  : `Created ${seedResult.transactions_created} transactions and ${seedResult.recurring_charges_created} recurring charges`}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </View>
  );
}

/* ─── Privacy tab ─────────────────────────────────────────────────── */
function PrivacyTab() {
  const { colors } = useTheme();
  const { clearSession } = useAuth0();
  const [memories, setMemories] = useState<any[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api.settings.memories()
      .then((d: any) => setMemories(d.memories || []))
      .catch(() => {})
      .finally(() => setMemoriesLoading(false));
  }, []);

  const handleForgetMemory = async (id: string) => {
    api.settings.deleteMemory(id).then(() => setMemories((p) => p.filter((m) => m.id !== id))).catch(console.error);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.settings.export();
      if (typeof window !== "undefined") {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "ledger-export.json"; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) { console.error(err); }
    finally { setExporting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.settings.deleteAccount();
      clearToken();
      await clearSession();
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  return (
    <View style={{ gap: 20 }}>
      {/* Memories */}
      <View>
        <SectionHeader icon="cpu" label="What Ledger Remembers" />
        <Card>
          {memoriesLoading ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          ) : memories.length > 0 ? (
            memories.map((memory, i) => (
              <View
                key={memory.id}
                style={{
                  flexDirection: "row", alignItems: "center",
                  paddingHorizontal: 14, paddingVertical: 12,
                  borderBottomWidth: i === memories.length - 1 ? 0 : 1,
                  borderBottomColor: colors.borderSubtle,
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 18 }} numberOfLines={3}>
                  {memory.content || memory.text || String(memory)}
                </Text>
                <TouchableOpacity
                  onPress={() => handleForgetMemory(memory.id)}
                  style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.danger + "30", paddingHorizontal: 10, paddingVertical: 4 }}
                >
                  <Text style={{ fontSize: 11, color: colors.danger, fontWeight: "500" }}>Forget</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }}>
                No memories stored yet. Ledger will learn from your activity over time.
              </Text>
            </View>
          )}
        </Card>
      </View>

      {/* Your Data */}
      <View>
        <SectionHeader icon="hard-drive" label="Your Data" />
        <Card>
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }}>
              Ledger stores your transaction data, goals, and preferences. Export or permanently delete everything below.
            </Text>
            <TouchableOpacity
              onPress={handleExport}
              disabled={exporting}
              style={{
                flexDirection: "row", alignItems: "center", gap: 7,
                alignSelf: "flex-start", borderRadius: 999,
                borderWidth: 1, borderColor: colors.border,
                paddingHorizontal: 14, paddingVertical: 8,
                opacity: exporting ? 0.5 : 1,
              }}
            >
              {exporting ? <ActivityIndicator size={13} color={colors.textMuted} /> : <Feather name="download" size={13} color={colors.textMuted} />}
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "500" }}>Export My Data</Text>
            </TouchableOpacity>

            {!confirmDelete ? (
              <TouchableOpacity
                onPress={() => setConfirmDelete(true)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 7,
                  alignSelf: "flex-start", borderRadius: 999,
                  borderWidth: 1, borderColor: colors.danger + "30",
                  paddingHorizontal: 14, paddingVertical: 8,
                }}
              >
                <Feather name="trash-2" size={13} color={colors.danger} />
                <Text style={{ fontSize: 13, color: colors.danger, fontWeight: "500" }}>Delete My Account</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ borderRadius: 10, borderWidth: 1, borderColor: colors.danger + "30", backgroundColor: colors.danger + "08", padding: 12, gap: 10 }}>
                <Text style={{ fontSize: 13, color: colors.danger, fontWeight: "500" }}>
                  This permanently deletes all your data. Are you sure?
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={deleting}
                    style={{ borderRadius: 999, backgroundColor: colors.danger, paddingHorizontal: 16, paddingVertical: 8, opacity: deleting ? 0.6 : 1 }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
                      {deleting ? "Deleting…" : "Yes, Delete All"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setConfirmDelete(false)}
                    style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 8 }}
                  >
                    <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "500" }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Card>
      </View>
    </View>
  );
}

/* ─── Notifications section (used inside AboutTab) ───────────────── */
function NotificationsSection() {
  const { state, subscribing, enable, disable, sendTest } = usePushNotifications();
  const [testSent, setTestSent] = useState(false);

  if (state === "unsupported") return null;

  const handleTest = async () => {
    await sendTest();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <View style={{ gap: 12 }}>
      <SectionHeader icon="bell" label="Notifications" />
      <Card>
        <View style={{ padding: 14, gap: 12 }}>
          <Text style={{ fontSize: 13, color: "#71717A", lineHeight: 18 }}>
            Get alerted when your balance runs low or your weekly briefing is ready.
          </Text>

          {state === "denied" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EF444410", borderRadius: 10, padding: 10 }}>
              <Feather name="alert-circle" size={13} color="#EF4444" />
              <Text style={{ fontSize: 12, color: "#EF4444", flex: 1, lineHeight: 17 }}>
                Notifications are blocked. Enable them in your browser / device settings.
              </Text>
            </View>
          ) : state === "granted" ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#34D39910", borderRadius: 10, padding: 10 }}>
                <Feather name="check-circle" size={13} color="#34D399" />
                <Text style={{ fontSize: 12, color: "#34D399", fontWeight: "500" }}>Notifications enabled</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={handleTest}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: "#27272A", paddingHorizontal: 14, paddingVertical: 7 }}
                >
                  <Feather name="send" size={12} color="#71717A" />
                  <Text style={{ fontSize: 12, color: "#A1A1AA", fontWeight: "500" }}>
                    {testSent ? "Sent!" : "Send Test"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={disable}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: "#EF444430", paddingHorizontal: 14, paddingVertical: 7 }}
                >
                  <Feather name="bell-off" size={12} color="#EF4444" />
                  <Text style={{ fontSize: 12, color: "#EF4444", fontWeight: "500" }}>Disable</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={enable}
              disabled={subscribing}
              style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: "#D4A853", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, opacity: subscribing ? 0.6 : 1 }}
            >
              {subscribing ? <ActivityIndicator size={13} color="#000" /> : <Feather name="bell" size={13} color="#000" />}
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#000" }}>Enable Notifications</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </View>
  );
}

/* ─── About tab ───────────────────────────────────────────────────── */
function AboutTab({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 16 }}>
      <NotificationsSection />

      {user && (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 12 }}>
            {user.picture ? (
              <Image source={{ uri: user.picture }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" }}>
                <Feather name="user" size={20} color={colors.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}>{user.name}</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 1 }}>{user.email}</Text>
            </View>
          </View>
        </Card>
      )}

      <Card>
        <View style={{ padding: 14, gap: 8 }}>
          <Text style={{ fontSize: 14, color: colors.textPrimary }}>
            <Text style={{ fontWeight: "700" }}>Ledger</Text>
            <Text style={{ color: colors.textMuted }}> v0.1.0</Text>
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
            Ledger provides educational financial guidance, not regulated financial advice. Ledger does not execute trades, call banks, or impersonate financial advisors. All recommendations are preference-based and require user confirmation.
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>Built for Hack Canada 2026.</Text>
        </View>
      </Card>

      <TouchableOpacity
        onPress={onSignOut}
        style={{
          flexDirection: "row", alignItems: "center", gap: 8,
          borderRadius: 12, borderWidth: 1, borderColor: colors.danger + "30",
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: colors.danger + "08",
        }}
      >
        <Feather name="log-out" size={15} color={colors.danger} />
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.danger }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
