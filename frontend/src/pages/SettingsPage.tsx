import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth0 } from "@auth0/auth0-react";
import { Link2, Shield, Bell, Info, LogOut, Database, Loader2, CheckCircle2, RefreshCw, Download, Trash2, Mail, Building2, Search } from "lucide-react";
import { cn } from "../lib/utils";
import { api } from "../lib/api";

const TABS = [
  { id: "accounts", label: "Linked Accounts", icon: Link2 },
  { id: "preferences", label: "Preferences", icon: Bell },
  { id: "sandbox", label: "Sandbox Tools", icon: Database },
  { id: "privacy", label: "Privacy & Data", icon: Shield },
  { id: "about", label: "About", icon: Info },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function SettingsPage() {
  const { logout, user } = useAuth0();
  const [tab, setTab] = useState<Tab>("accounts");

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Settings
        </h1>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-gold text-black"
                : "border border-border text-text-secondary hover:bg-surface-raised"
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-surface p-6"
      >
        {tab === "accounts" && <AccountsTab />}

        {tab === "preferences" && <PreferencesTab />}

        {tab === "sandbox" && <SandboxTab />}

        {tab === "privacy" && <PrivacyTab />}

        {tab === "about" && (
          <div className="space-y-4">
            {user && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-base p-3">
                {user.picture && (
                  <img src={user.picture} alt="" className="h-10 w-10 rounded-full" />
                )}
                <div>
                  <p className="text-sm font-medium text-text-primary">{user.name}</p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                </div>
              </div>
            )}
            <p className="text-sm text-text-secondary">
              <strong className="text-text-primary">Ledger</strong> v0.1.0
            </p>
            <p className="text-xs leading-relaxed text-text-muted">
              Ledger provides educational financial guidance, not regulated financial advice.
              Ledger does not execute trades, call banks, or impersonate financial advisors.
              All recommendations are preference-based and require user confirmation.
            </p>
            <p className="text-xs text-text-muted">
              Built for Hack Canada 2026.
            </p>
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin + "/welcome" } })}
              className="flex items-center gap-2 rounded-full border border-danger/30 px-4 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        )}
      </motion.div>
    </div>
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
      const data = await api.plaid.accounts();
      setBankAccounts((data as any).accounts || []);
    } catch { /* keep stale */ }
    finally { setRefreshing(false); }
  };

  const handleLinkEmail = async () => {
    setLinkingEmail(true);
    try {
      const data = await api.email.authUrl();
      window.location.href = data.auth_url;
    } catch (err: any) {
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
      <div className="flex items-center justify-center py-8 text-text-muted">
        <Loader2 size={18} className="animate-spin" />
        <span className="ml-2 text-sm">Loading accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bank Accounts */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          <Building2 size={14} /> Bank Accounts
        </h3>
        {bankAccounts.length > 0 ? (
          <>
            {bankAccounts.map((acct, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-base p-4">
                <div className="flex items-center gap-3">
                  <Building2 size={16} className="shrink-0 text-gold" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {acct.institution_name || "Bank"} — {acct.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {acct.type} &middot; ${acct.balance_current?.toLocaleString() ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium text-text-secondary hover:bg-surface-raised disabled:opacity-50"
            >
              {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Refresh Accounts
            </button>
          </>
        ) : (
          <p className="text-sm text-text-muted">No bank accounts linked. Go through onboarding to link a bank.</p>
        )}
      </div>

      {/* Email Accounts */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          <Mail size={14} /> Email Accounts
        </h3>
        {emailAccounts.length > 0 ? (
          <>
            {emailAccounts.map((acct) => (
              <div key={acct.id} className="flex items-center justify-between rounded-xl border border-border bg-base p-4">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="shrink-0 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{acct.email_address}</p>
                    <p className="text-xs text-text-muted">
                      {acct.provider} &middot; {acct.last_scanned_at ? `Scanned ${new Date(acct.last_scanned_at).toLocaleDateString()}` : "Not scanned yet"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnlinkEmail(acct.id)}
                  className="shrink-0 rounded-full border border-danger/30 px-3 py-1 text-xs text-danger"
                >
                  Unlink
                </button>
              </div>
            ))}
            <button
              onClick={handleScanEmails}
              disabled={scanning}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium text-text-secondary hover:bg-surface-raised disabled:opacity-50"
            >
              {scanning ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
              Scan for Receipts
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-text-muted">
              Link your email to automatically detect subscriptions from billing receipts.
            </p>
            <button
              onClick={handleLinkEmail}
              disabled={linkingEmail}
              className="flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-xs font-medium text-black disabled:opacity-50"
            >
              {linkingEmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              Link Gmail Account
            </button>
          </div>
        )}
      </div>
    </div>
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
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Seed Demo Transactions</h3>
      <p className="text-xs text-text-muted">
        Generate 8 weeks of realistic transaction data: biweekly paychecks, rent, subscriptions, dining, shopping, and more.
        This replaces any existing transactions and populates the dashboard, forecasts, and subscription views.
      </p>
      <button
        onClick={handleSeed}
        disabled={seeding}
        className="flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-xs font-medium text-black disabled:opacity-50"
      >
        {seeding ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Seeding...
          </>
        ) : (
          <>
            <Database size={14} />
            Seed 8 Weeks of Data
          </>
        )}
      </button>
      {seedResult && (
        <div className="rounded-xl border border-border bg-base p-3">
          {seedResult.error ? (
            <p className="text-xs text-danger">{seedResult.error}</p>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-income" />
              <p className="text-xs text-text-secondary">
                Created {seedResult.transactions_created} transactions and {seedResult.recurring_charges_created} recurring charges
                ({seedResult.date_range?.start} to {seedResult.date_range?.end})
              </p>
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-text-muted/60">
        In production, transactions sync automatically from linked banks via Plaid webhooks.
      </p>
    </div>
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
      <div className="flex items-center justify-center py-8 text-text-muted">
        <Loader2 size={18} className="animate-spin" />
        <span className="ml-2 text-sm">Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {saving && <p className="text-[10px] text-gold">Saving...</p>}
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
    </div>
  );
}

function PrivacyTab() {
  const { logout } = useAuth0();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.settings.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ledger-export.json";
      a.click();
      URL.revokeObjectURL(url);
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
      logout({ logoutParams: { returnTo: window.location.origin + "/welcome" } });
    } catch (err) {
      console.error("[SETTINGS] Delete failed:", err);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Your Data</h3>
      <p className="text-xs text-text-muted">
        Ledger stores your transaction data, goals, and preferences.
        You can export or permanently delete all of it below.
      </p>
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-text-secondary hover:bg-surface-raised disabled:opacity-50"
        >
          {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Export My Data
        </button>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 rounded-full border border-danger/30 px-4 py-2 text-xs text-danger"
          >
            <Trash2 size={12} />
            Delete My Account
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-danger">Are you sure?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full bg-danger px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Yes, Delete Everything"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-full border border-border px-3 py-2 text-xs text-text-muted"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
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
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="flex gap-1 rounded-full border border-border p-0.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
              value === opt
                ? "bg-gold text-black"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
