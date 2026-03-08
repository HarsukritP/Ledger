import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Building2, DollarSign, Users, Loader2,
  AlertTriangle, CheckCircle2, Mail, Plus, X, Target, Home as HomeIcon,
  Wifi, Smartphone, Dumbbell, Tv, Cloud, Car, ShieldCheck, ShoppingCart,
} from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { cn } from "../lib/utils";
import { api } from "../lib/api";
import { AGENTS, type AgentName } from "../types";

const STEPS = ["Welcome", "Link Bank", "Expenses", "Email", "Living Costs", "Goals", "Meet Team"] as const;

const COMMON_EXPENSES = [
  { name: "Phone Bill", icon: Smartphone, defaultAmount: 65 },
  { name: "Internet", icon: Wifi, defaultAmount: 60 },
  { name: "Gym", icon: Dumbbell, defaultAmount: 50 },
  { name: "Netflix", icon: Tv, defaultAmount: 18 },
  { name: "Spotify", icon: Tv, defaultAmount: 12 },
  { name: "Cloud Storage", icon: Cloud, defaultAmount: 10 },
  { name: "Car Payment", icon: Car, defaultAmount: 400 },
  { name: "Insurance", icon: ShieldCheck, defaultAmount: 150 },
  { name: "Groceries", icon: ShoppingCart, defaultAmount: 300 },
];

interface ExpenseEntry {
  name: string;
  amount: number;
  selected: boolean;
}

interface GoalEntry {
  name: string;
  amount: string;
  targetDate: string;
}

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [expenses, setExpenses] = useState<ExpenseEntry[]>(
    COMMON_EXPENSES.map((e) => ({ name: e.name, amount: e.defaultAmount, selected: false }))
  );
  const [customExpense, setCustomExpense] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  const [paysRent, setPaysRent] = useState<boolean | null>(null);
  const [rent, setRent] = useState("");
  const [hasUtilities, setHasUtilities] = useState(false);
  const [utilityCost, setUtilityCost] = useState("");

  const [goals, setGoals] = useState<GoalEntry[]>([{ name: "", amount: "", targetDate: "" }]);
  const [style, setStyle] = useState<"brief" | "detailed">("brief");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly");

  const navigate = useNavigate();

  const finishOnboarding = async () => {
    setSaving(true);
    try {
      const rentNum = parseFloat(rent.replace(/[^0-9.]/g, ""));
      const firstGoal = goals[0];
      const goalAmtNum = parseFloat((firstGoal?.amount || "").replace(/[^0-9.]/g, ""));

      await api.auth.completeOnboarding({
        rent: isNaN(rentNum) ? undefined : rentNum,
        goal_name: firstGoal?.name || undefined,
        goal_amount: isNaN(goalAmtNum) ? undefined : goalAmtNum,
        communication_style: style,
        briefing_frequency: frequency,
      });

      for (const goal of goals.slice(1)) {
        const amt = parseFloat((goal.amount || "").replace(/[^0-9.]/g, ""));
        if (goal.name && !isNaN(amt) && amt > 0) {
          await api.goals.create({
            name: goal.name,
            target_amount: amt,
            target_date: goal.targetDate || new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
          }).catch(console.error);
        }
      }
    } catch (err) {
      console.error("[ONBOARDING] Failed to save:", err);
    } finally {
      setSaving(false);
      navigate("/");
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finishOnboarding();
  };

  const toggleExpense = (index: number) => {
    setExpenses((prev) =>
      prev.map((e, i) => (i === index ? { ...e, selected: !e.selected } : e))
    );
  };

  const updateExpenseAmount = (index: number, amount: number) => {
    setExpenses((prev) =>
      prev.map((e, i) => (i === index ? { ...e, amount } : e))
    );
  };

  const addCustomExpense = () => {
    if (customExpense.trim()) {
      const amt = parseFloat(customAmount) || 0;
      setExpenses((prev) => [...prev, { name: customExpense.trim(), amount: amt, selected: true }]);
      setCustomExpense("");
      setCustomAmount("");
    }
  };

  const addGoal = () => {
    setGoals((prev) => [...prev, { name: "", amount: "", targetDate: "" }]);
  };

  const updateGoal = (index: number, field: keyof GoalEntry, value: string) => {
    setGoals((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  };

  const removeGoal = (index: number) => {
    setGoals((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-base px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,#D4A85308_0%,transparent_70%)]" />

      {/* Progress bar */}
      <div className="relative mb-8 w-full max-w-md">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium transition-all",
                  i < step ? "bg-gold text-black"
                    : i === step ? "bg-gold text-black scale-110"
                    : "border border-border text-text-muted"
                )}
              >
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 h-0.5 rounded-full bg-border">
          <motion.div
            className="h-full rounded-full bg-gold"
            animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-md"
        >
          {step === 0 && <WelcomeStep onNext={next} />}
          {step === 1 && <LinkBankStep onNext={next} />}
          {step === 2 && (
            <ExpensesStep
              expenses={expenses}
              toggleExpense={toggleExpense}
              updateExpenseAmount={updateExpenseAmount}
              customExpense={customExpense}
              setCustomExpense={setCustomExpense}
              customAmount={customAmount}
              setCustomAmount={setCustomAmount}
              addCustomExpense={addCustomExpense}
              onNext={next}
            />
          )}
          {step === 3 && <EmailStep onNext={next} />}
          {step === 4 && (
            <LivingCostsStep
              paysRent={paysRent}
              setPaysRent={setPaysRent}
              rent={rent}
              setRent={setRent}
              hasUtilities={hasUtilities}
              setHasUtilities={setHasUtilities}
              utilityCost={utilityCost}
              setUtilityCost={setUtilityCost}
              onNext={next}
            />
          )}
          {step === 5 && (
            <GoalsStep
              goals={goals}
              updateGoal={updateGoal}
              addGoal={addGoal}
              removeGoal={removeGoal}
              style={style}
              setStyle={setStyle}
              frequency={frequency}
              setFrequency={setFrequency}
              onNext={next}
            />
          )}
          {step === 6 && <MeetTeamStep onNext={next} saving={saving} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { user } = useAuth0();
  const firstName = user?.given_name || user?.name?.split(" ")[0] || "there";

  return (
    <div className="text-center">
      <motion.h1
        initial={{ opacity: 0, filter: "blur(10px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6 }}
        className="bg-linear-to-r from-gold to-amber-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent"
      >
        Ledger
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 text-lg text-text-secondary"
      >
        Hey {firstName}, let's set up your finance team
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-2 text-sm text-text-muted"
      >
        A few quick questions to personalize your experience
      </motion.p>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={onNext}
        className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 font-medium text-black transition-all hover:scale-105 hover:shadow-[0_0_30px_#D4A85340]"
      >
        Let's Go
        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
      </motion.button>
    </div>
  );
}

function LinkBankStep({ onNext }: { onNext: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState(false);
  const [linked, setLinked] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.plaid
      .linkToken()
      .then((data) => { setLinkToken(data.link_token); setLoading(false); })
      .catch(() => { setError("Could not initialize bank linking. You can skip for now."); setLoading(false); });
  }, []);

  const onSuccess = useCallback(async (publicToken: string) => {
    setExchanging(true);
    setError(null);
    try {
      const result = await api.plaid.exchange(publicToken);
      setLinkedAccounts(result.accounts || []);
      setLinked(true);
      api.plaid.sync().catch(console.warn);
      setTimeout(onNext, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to link account");
      setExchanging(false);
    }
  }, [onNext]);

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess });

  return (
    <div className="text-center">
      <Building2 size={48} className="mx-auto text-gold" strokeWidth={1.5} />
      <h2 className="mt-4 text-2xl font-bold text-text-primary">Link Your Bank</h2>
      <p className="mt-2 text-sm text-text-secondary">So your team can get to work</p>
      {error && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-expense/20 bg-expense/5 px-4 py-2 text-xs text-expense">
          <AlertTriangle size={14} />{error}
        </div>
      )}
      {!linked ? (
        <div className="mt-8 space-y-3">
          {loading || exchanging ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-text-muted">
              <Loader2 size={18} className="animate-spin" />
              {exchanging ? "Linking your account..." : "Preparing secure connection..."}
            </div>
          ) : (
            <>
              <button
                onClick={() => open()}
                disabled={!ready}
                className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-gold/30 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-raised text-sm font-bold text-gold">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Connect Your Bank</p>
                    <p className="text-xs text-text-muted">Securely link via Plaid</p>
                  </div>
                </div>
              </button>
              <p className="text-[10px] text-text-muted">
                Sandbox mode — use <span className="font-mono text-text-secondary">user_good</span> / <span className="font-mono text-text-secondary">pass_good</span>
              </p>
            </>
          )}
          <button onClick={onNext} className="text-sm text-text-muted hover:text-text-secondary">
            Skip for now
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-8">
          <div className="rounded-2xl border border-income/20 bg-income/5 p-4">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 size={18} className="text-income" />
              <p className="text-sm font-medium text-income">Account linked!</p>
            </div>
            {linkedAccounts.map((acct, i) => (
              <p key={i} className="mt-1 text-xs text-text-secondary">
                {acct.name} &middot; ${acct.balance_current?.toLocaleString() ?? "—"}
              </p>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ExpensesStep({
  expenses, toggleExpense, updateExpenseAmount,
  customExpense, setCustomExpense, customAmount, setCustomAmount,
  addCustomExpense, onNext,
}: {
  expenses: ExpenseEntry[]; toggleExpense: (i: number) => void;
  updateExpenseAmount: (i: number, amt: number) => void;
  customExpense: string; setCustomExpense: (v: string) => void;
  customAmount: string; setCustomAmount: (v: string) => void;
  addCustomExpense: () => void; onNext: () => void;
}) {
  return (
    <div className="text-center">
      <DollarSign size={40} className="mx-auto text-gold" strokeWidth={1.5} />
      <h2 className="mt-3 text-2xl font-bold text-text-primary">What do you pay for regularly?</h2>
      <p className="mt-1 text-sm text-text-muted">Tap to select, adjust amounts if needed</p>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {expenses.map((exp, i) => {
          const IconComp = COMMON_EXPENSES.find((c) => c.name === exp.name)?.icon;
          return (
            <button
              key={exp.name}
              onClick={() => toggleExpense(i)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all",
                exp.selected
                  ? "border-gold/50 bg-gold/10"
                  : "border-border bg-surface hover:border-border-subtle"
              )}
            >
              {IconComp && <IconComp size={18} className={exp.selected ? "text-gold" : "text-text-muted"} />}
              <span className={cn("text-xs font-medium", exp.selected ? "text-gold" : "text-text-secondary")}>
                {exp.name}
              </span>
              {exp.selected && (
                <input
                  type="text"
                  value={`$${exp.amount}`}
                  onChange={(e) => {
                    const num = parseFloat(e.target.value.replace(/[^0-9.]/g, ""));
                    if (!isNaN(num)) updateExpenseAmount(i, num);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 w-full rounded-lg border border-gold/30 bg-transparent px-1 py-0.5 text-center font-mono text-[11px] text-gold focus:outline-none"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={customExpense}
          onChange={(e) => setCustomExpense(e.target.value)}
          placeholder="Add your own..."
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
        />
        <input
          type="text"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          placeholder="$"
          className="w-16 rounded-xl border border-border bg-surface px-2 py-2 text-center font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
        />
        <button
          onClick={addCustomExpense}
          disabled={!customExpense.trim()}
          className="rounded-xl bg-gold p-2 text-black disabled:opacity-30"
        >
          <Plus size={18} />
        </button>
      </div>

      <button onClick={onNext} className="mt-6 rounded-full bg-gold px-8 py-2.5 text-sm font-medium text-black hover:bg-gold/90">
        Continue
      </button>
      <button onClick={onNext} className="mt-2 block w-full text-xs text-text-muted hover:text-text-secondary">
        Skip
      </button>
    </div>
  );
}

function EmailStep({ onNext }: {
  onNext: () => void;
}) {
  const [linking, setLinking] = useState(false);

  const handleLink = async () => {
    setLinking(true);
    try {
      const data = await api.email.authUrl();
      window.location.href = data.auth_url;
    } catch {
      setLinking(false);
      onNext();
    }
  };

  return (
    <div className="text-center">
      <Mail size={40} className="mx-auto text-blue-400" strokeWidth={1.5} />
      <h2 className="mt-3 text-2xl font-bold text-text-primary">Catch all your subscriptions</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Link your email and we'll scan for billing receipts to find subscriptions you might have forgotten about.
      </p>

      <div className="mt-8 space-y-3">
        <button
          onClick={handleLink}
          disabled={linking}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-blue-400/30 disabled:opacity-50"
        >
          {linking ? (
            <Loader2 size={18} className="animate-spin text-text-muted" />
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Mail size={20} className="text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-text-primary">Link Gmail</p>
                <p className="text-xs text-text-muted">Scan for billing receipts</p>
              </div>
            </>
          )}
        </button>

        <button onClick={onNext} className="text-sm text-text-muted hover:text-text-secondary">
          Skip — I'll add manually
        </button>
      </div>
    </div>
  );
}

function LivingCostsStep({ paysRent, setPaysRent, rent, setRent, hasUtilities, setHasUtilities, utilityCost, setUtilityCost, onNext }: {
  paysRent: boolean | null; setPaysRent: (v: boolean) => void;
  rent: string; setRent: (v: string) => void;
  hasUtilities: boolean; setHasUtilities: (v: boolean) => void;
  utilityCost: string; setUtilityCost: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="text-center">
      <HomeIcon size={40} className="mx-auto text-gold" strokeWidth={1.5} />
      <h2 className="mt-3 text-2xl font-bold text-text-primary">Living costs</h2>
      <p className="mt-1 text-sm text-text-muted">Help us understand your fixed costs</p>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-text-secondary">Do you pay rent?</span>
          <div className="flex gap-1 rounded-full border border-border p-0.5">
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                onClick={() => setPaysRent(opt === "Yes")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  (paysRent === true && opt === "Yes") || (paysRent === false && opt === "No")
                    ? "bg-gold text-black"
                    : "text-text-muted hover:text-text-secondary"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {paysRent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <input
                type="text"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                placeholder="Monthly rent amount"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center font-mono text-lg text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
              />

              <div className="flex items-center justify-center gap-4">
                <span className="text-sm text-text-secondary">Separate utilities?</span>
                <div className="flex gap-1 rounded-full border border-border p-0.5">
                  {["Yes", "No"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setHasUtilities(opt === "Yes")}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                        (hasUtilities && opt === "Yes") || (!hasUtilities && opt === "No")
                          ? "bg-gold text-black"
                          : "text-text-muted hover:text-text-secondary"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {hasUtilities && (
                <input
                  type="text"
                  value={utilityCost}
                  onChange={(e) => setUtilityCost(e.target.value)}
                  placeholder="Estimated monthly utilities"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-center font-mono text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button onClick={onNext} className="mt-8 rounded-full bg-gold px-8 py-2.5 text-sm font-medium text-black hover:bg-gold/90">
        Continue
      </button>
    </div>
  );
}

function GoalsStep({ goals, updateGoal, addGoal, removeGoal, style, setStyle, frequency, setFrequency, onNext }: {
  goals: GoalEntry[]; updateGoal: (i: number, f: keyof GoalEntry, v: string) => void;
  addGoal: () => void; removeGoal: (i: number) => void;
  style: string; setStyle: (v: "brief" | "detailed") => void;
  frequency: string; setFrequency: (v: "daily" | "weekly") => void;
  onNext: () => void;
}) {
  const SUGGESTIONS = ["Emergency Fund", "Vacation", "New Laptop", "Car Down Payment", "Debt Payoff"];

  return (
    <div className="text-center">
      <Target size={40} className="mx-auto text-gold" strokeWidth={1.5} />
      <h2 className="mt-3 text-2xl font-bold text-text-primary">What are you saving for?</h2>
      <p className="mt-1 text-sm text-text-muted">Add one or more savings goals</p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              const empty = goals.findIndex((g) => !g.name);
              if (empty >= 0) updateGoal(empty, "name", s);
              else { addGoal(); setTimeout(() => updateGoal(goals.length, "name", s), 0); }
            }}
            className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary hover:border-gold/30 hover:bg-gold/5"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {goals.map((g, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={g.name}
              onChange={(e) => updateGoal(i, "name", e.target.value)}
              placeholder="Goal name"
              className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
            />
            <input
              type="text"
              value={g.amount}
              onChange={(e) => updateGoal(i, "amount", e.target.value)}
              placeholder="$"
              className="w-20 rounded-xl border border-border bg-surface px-2 py-2 text-center font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
            />
            {goals.length > 1 && (
              <button onClick={() => removeGoal(i)} className="text-text-muted hover:text-danger">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addGoal}
          className="flex items-center gap-1 text-xs text-gold hover:text-gold/80"
        >
          <Plus size={14} /> Add another goal
        </button>
      </div>

      <div className="mt-6 space-y-3">
        <ToggleRow label="Style" options={["brief", "detailed"]} value={style} onChange={(v) => setStyle(v as any)} />
        <ToggleRow label="Frequency" options={["daily", "weekly"]} value={frequency} onChange={(v) => setFrequency(v as any)} />
      </div>

      <button onClick={onNext} className="mt-6 rounded-full bg-gold px-8 py-2.5 text-sm font-medium text-black hover:bg-gold/90">
        Continue
      </button>
    </div>
  );
}

function ToggleRow({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary capitalize">{label}</span>
      <div className="flex gap-1 rounded-full border border-border p-0.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-full px-4 py-1 text-xs font-medium capitalize transition-colors",
              value === opt ? "bg-gold text-black" : "text-text-muted hover:text-text-secondary"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MeetTeamStep({ onNext, saving }: { onNext: () => void; saving: boolean }) {
  const agents: { name: AgentName; icon: typeof Users }[] = [
    { name: "pulse", icon: Users },
    { name: "audit", icon: Users },
    { name: "north-star", icon: Users },
    { name: "sentinel", icon: Users },
  ];

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-text-primary">Meet Your Team</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Four agents working together on your finances
      </p>

      <div className="mt-8 space-y-3">
        {agents.map((a, i) => {
          const info = AGENTS[a.name];
          return (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, y: 20, rotateX: 5 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: i * 0.2, duration: 0.4 }}
              className="rounded-2xl border bg-surface p-4 text-left"
              style={{ borderColor: `${info.color}30` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                  style={{ backgroundColor: info.bgColor, color: info.color }}
                >
                  {info.displayName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: info.color }}>
                    {info.displayName}
                  </p>
                  <p className="text-xs text-text-secondary">{info.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={onNext}
        disabled={saving}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-2.5 text-sm font-medium text-black hover:bg-gold/90 disabled:opacity-60"
      >
        {saving ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Setting up...
          </>
        ) : (
          "Your team is ready. Let's go."
        )}
      </motion.button>
    </div>
  );
}
