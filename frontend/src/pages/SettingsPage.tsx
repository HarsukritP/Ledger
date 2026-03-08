import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth0 } from "@auth0/auth0-react";
import { Link2, Shield, Bell, Info, LogOut, Database, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
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

        {tab === "preferences" && (
          <div className="space-y-6">
            <PreferenceRow label="Briefing Frequency" options={["Daily", "Weekly"]} defaultValue="Weekly" />
            <PreferenceRow label="Communication Style" options={["Brief", "Detailed"]} defaultValue="Brief" />
            <PreferenceRow label="Agent Strictness" options={["Gentle", "Balanced", "Strict"]} defaultValue="Balanced" />
          </div>
        )}

        {tab === "sandbox" && <SandboxTab />}

        {tab === "privacy" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">What Ledger Remembers</h3>
            {[
              "You get paid biweekly on the 15th and 30th",
              "Rent is $1,200, due on the 1st",
              "You kept gym membership in February",
              "You tend to overspend on dining early in the month",
            ].map((memory, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-base p-3">
                <p className="text-sm text-text-secondary">{memory}</p>
                <button className="shrink-0 rounded-full border border-danger/30 px-3 py-1 text-xs text-danger">
                  Forget
                </button>
              </div>
            ))}
            <div className="flex gap-3 pt-4">
              <button className="rounded-full border border-border px-4 py-2 text-xs text-text-secondary hover:bg-surface-raised">
                Export My Data
              </button>
              <button className="rounded-full border border-danger/30 px-4 py-2 text-xs text-danger">
                Delete My Account
              </button>
            </div>
          </div>
        )}

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
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useState(() => {
    api.plaid
      .accounts()
      .then((data: any) => setAccounts(data.accounts || []))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  });

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.plaid.sync();
      setSyncResult(`Synced: ${result.new_transactions} new, ${result.modified} modified`);
    } catch (err: any) {
      setSyncResult(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
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
    <div className="space-y-4">
      {accounts.length > 0 ? (
        accounts.map((acct, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-base p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">
                {acct.institution_name || "Bank"} — {acct.name}
              </p>
              <p className="text-xs text-text-muted">
                {acct.type} &middot; ${acct.balance_current?.toLocaleString() ?? "—"}
                {acct.stale && " (cached)"}
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-text-secondary hover:bg-surface-raised disabled:opacity-50"
            >
              {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Sync
            </button>
          </div>
        ))
      ) : (
        <p className="py-4 text-center text-sm text-text-muted">No linked accounts. Go through onboarding to link a bank.</p>
      )}
      {syncResult && (
        <p className="text-xs text-text-secondary">{syncResult}</p>
      )}
    </div>
  );
}

function SandboxTab() {
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

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

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.plaid.sync();
      setSyncResult(result);
    } catch (err: any) {
      setSyncResult({ error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">Seed Demo Transactions</h3>
        <p className="mt-1 text-xs text-text-muted">
          Generate 8 weeks of realistic transaction data: biweekly paychecks, rent, subscriptions, dining, shopping, and more.
          This replaces any existing demo transactions.
        </p>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="mt-3 flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-xs font-medium text-black disabled:opacity-50"
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
          <div className="mt-3 rounded-xl border border-border bg-base p-3">
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
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-text-primary">Sync from Plaid</h3>
        <p className="mt-1 text-xs text-text-muted">
          Pull the latest transactions from your linked Plaid Sandbox accounts.
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="mt-3 flex items-center gap-2 rounded-full border border-border px-5 py-2 text-xs font-medium text-text-secondary hover:bg-surface-raised disabled:opacity-50"
        >
          {syncing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              Sync Transactions from Plaid
            </>
          )}
        </button>
        {syncResult && (
          <div className="mt-3 rounded-xl border border-border bg-base p-3">
            {syncResult.error ? (
              <p className="text-xs text-danger">{syncResult.error}</p>
            ) : (
              <p className="text-xs text-text-secondary">
                Synced: {syncResult.new_transactions} new, {syncResult.modified} modified, {syncResult.removed} removed
              </p>
            )}
          </div>
        )}
      </div>
    </div>
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
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="flex gap-1 rounded-full border border-border p-0.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => setSelected(opt)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              selected === opt
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
