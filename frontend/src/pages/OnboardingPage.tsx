import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Building2, DollarSign, MessageSquare, Users } from "lucide-react";
import { cn } from "../lib/utils";
import { AGENTS, type AgentName } from "../types";

const STEPS = ["Welcome", "Link Bank", "Profile", "Meet Your Team"] as const;

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const next = () => {
    if (step < 3) setStep(step + 1);
    else navigate("/");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-base px-4">
      {/* Subtle background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#D4A85308_0%,_transparent_70%)]" />

      {/* Stepper */}
      <div className="relative mb-12 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                i <= step
                  ? "bg-gold text-black"
                  : "border border-border text-text-muted"
              )}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <div
                className={cn(
                  "h-px w-8 transition-colors",
                  i < step ? "bg-gold" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
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
          {step === 2 && <ProfileStep onNext={next} />}
          {step === 3 && <MeetTeamStep onNext={next} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <motion.h1
        initial={{ opacity: 0, filter: "blur(10px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-r from-gold to-amber-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent"
      >
        Ledger
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 text-lg text-text-secondary"
      >
        Your personal finance team
      </motion.p>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onNext}
        className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 font-medium text-black transition-all hover:scale-105 hover:shadow-[0_0_30px_#D4A85340]"
      >
        Get Started
        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
      </motion.button>
    </div>
  );
}

function LinkBankStep({ onNext }: { onNext: () => void }) {
  const [linked, setLinked] = useState(false);

  const simulateLink = () => {
    setLinked(true);
    setTimeout(onNext, 1500);
  };

  return (
    <div className="text-center">
      <Building2 size={48} className="mx-auto text-gold" strokeWidth={1.5} />
      <h2 className="mt-4 text-2xl font-bold text-text-primary">
        Link Your Bank
      </h2>
      <p className="mt-2 text-sm text-text-secondary">
        So your team can get to work
      </p>

      {!linked ? (
        <div className="mt-8 space-y-3">
          <button
            onClick={simulateLink}
            className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-gold/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-raised text-sm font-bold text-gold">
                FP
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">First Platypus Bank</p>
                <p className="text-xs text-text-muted">Sandbox • Connect with user_good / pass_good</p>
              </div>
            </div>
          </button>
          <button
            onClick={onNext}
            className="text-sm text-text-muted hover:text-text-secondary"
          >
            Skip for now — use demo data
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 rounded-2xl border border-income/20 bg-income/5 p-4"
        >
          <p className="text-sm font-medium text-income">Account linked!</p>
          <p className="mt-1 text-xs text-text-secondary">
            Checking • $2,847.32
          </p>
        </motion.div>
      )}
    </div>
  );
}

function ProfileStep({ onNext }: { onNext: () => void }) {
  const [subStep, setSubStep] = useState(0);
  const [rent, setRent] = useState("");
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [style, setStyle] = useState<"brief" | "detailed">("brief");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly");

  const nextSub = () => {
    if (subStep < 2) setSubStep(subStep + 1);
    else onNext();
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-text-primary">Quick Setup</h2>
      <p className="mt-1 text-sm text-text-muted">Question {subStep + 1} of 3</p>

      <AnimatePresence mode="wait">
        <motion.div
          key={subStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="mt-8"
        >
          {subStep === 0 && (
            <div className="space-y-4">
              <DollarSign size={32} className="mx-auto text-gold" strokeWidth={1.5} />
              <p className="text-sm text-text-secondary">What's your monthly rent or housing cost?</p>
              <input
                type="text"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                placeholder="$1,200"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center font-mono text-lg text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
              />
            </div>
          )}

          {subStep === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">Set a savings goal</p>
              <div className="flex gap-2">
                {["Emergency Fund", "Vacation", "New Laptop"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setGoalName(suggestion);
                      setGoalAmount(suggestion === "Emergency Fund" ? "2000" : suggestion === "Vacation" ? "5000" : "1800");
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs transition-colors",
                      goalName === suggestion
                        ? "bg-gold text-black"
                        : "border border-border text-text-secondary hover:bg-surface-raised"
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="Goal name"
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
              />
              <input
                type="text"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="$5,000"
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-center font-mono text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
              />
            </div>
          )}

          {subStep === 2 && (
            <div className="space-y-6">
              <MessageSquare size={32} className="mx-auto text-gold" strokeWidth={1.5} />
              <p className="text-sm text-text-secondary">How should we talk to you?</p>
              <div className="space-y-3">
                <ToggleGroup
                  label="Style"
                  options={["brief", "detailed"]}
                  value={style}
                  onChange={(v) => setStyle(v as "brief" | "detailed")}
                />
                <ToggleGroup
                  label="Frequency"
                  options={["daily", "weekly"]}
                  value={frequency}
                  onChange={(v) => setFrequency(v as "daily" | "weekly")}
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <button
        onClick={nextSub}
        className="mt-8 rounded-full bg-gold px-8 py-2.5 text-sm font-medium text-black hover:bg-gold/90"
      >
        {subStep < 2 ? "Next" : "Continue"}
      </button>
    </div>
  );
}

function ToggleGroup({
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
      <span className="text-sm text-text-secondary capitalize">{label}</span>
      <div className="flex gap-1 rounded-full border border-border p-0.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-full px-4 py-1 text-xs font-medium capitalize transition-colors",
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

function MeetTeamStep({ onNext }: { onNext: () => void }) {
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
        className="mt-8 rounded-full bg-gold px-8 py-2.5 text-sm font-medium text-black hover:bg-gold/90"
      >
        Your team is ready. Let's go.
      </motion.button>
    </div>
  );
}
