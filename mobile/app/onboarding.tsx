import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth0 } from "../lib/use-auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api } from "../lib/api";
import { AGENTS, type AgentName } from "../types";
import { PlaidLinkButton } from "../components/PlaidLinkButton";

const STEPS = ["Welcome", "Link Bank", "Profile", "Meet Your Team"] as const;

interface ProfileData {
  rent: string;
  goalName: string;
  goalAmount: string;
  style: "brief" | "detailed";
  frequency: "daily" | "weekly";
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    rent: "",
    goalName: "",
    goalAmount: "",
    style: "brief",
    frequency: "weekly",
  });
  const router = useRouter();

  const finishOnboarding = async () => {
    setSaving(true);
    try {
      const rentNum = parseFloat(profileData.rent.replace(/[^0-9.]/g, ""));
      const goalAmtNum = parseFloat(
        profileData.goalAmount.replace(/[^0-9.]/g, "")
      );
      await api.auth.completeOnboarding({
        rent: isNaN(rentNum) ? undefined : rentNum,
        goal_name: profileData.goalName || undefined,
        goal_amount: isNaN(goalAmtNum) ? undefined : goalAmtNum,
        communication_style: profileData.style,
        briefing_frequency: profileData.frequency,
      });
    } catch (err) {
      console.error("[ONBOARDING] save failed:", err);
    } finally {
      setSaving(false);
      router.replace("/(app)");
    }
  };

  const next = () => {
    if (step < 3) setStep(step + 1);
    else finishOnboarding();
  };

  return (
    <SafeAreaView className="flex-1 bg-base">
      <View className="flex-1 items-center justify-center px-6">
        {/* Step indicators */}
        <View className="flex-row items-center gap-2 mb-12">
          {STEPS.map((label, i) => (
            <View key={label} className="flex-row items-center gap-2">
              <View
                className="h-8 w-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor: i <= step ? "#D4A853" : "transparent",
                  borderWidth: i <= step ? 0 : 1,
                  borderColor: "#27272A",
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: i <= step ? "#000" : "#71717A" }}
                >
                  {i + 1}
                </Text>
              </View>
              {i < 3 && (
                <View
                  className="h-px w-8"
                  style={{
                    backgroundColor: i < step ? "#D4A853" : "#27272A",
                  }}
                />
              )}
            </View>
          ))}
        </View>

        {step === 0 && <WelcomeStep onNext={next} />}
        {step === 1 && <LinkBankStep onNext={next} />}
        {step === 2 && (
          <ProfileStep
            onNext={next}
            profileData={profileData}
            setProfileData={setProfileData}
          />
        )}
        {step === 3 && <MeetTeamStep onNext={next} saving={saving} />}
      </View>
    </SafeAreaView>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { user } = useAuth0();
  const firstName =
    (user?.given_name as string | undefined) ||
    (user?.name as string | undefined)?.split(" ")[0] ||
    "there";

  return (
    <View className="items-center w-full">
      <Text className="text-5xl font-bold tracking-tight text-gold mb-4">
        Ledger
      </Text>
      <Text className="text-lg text-text-secondary text-center mb-8">
        Hey {firstName}, let's set up your finance team
      </Text>
      <Pressable
        onPress={onNext}
        className="flex-row items-center gap-2 rounded-full bg-gold px-8 py-3"
      >
        <Text className="font-semibold text-black">Let's Go</Text>
        <Feather name="arrow-right" size={18} color="#000" />
      </Pressable>
    </View>
  );
}

function LinkBankStep({ onNext }: { onNext: () => void }) {
  const [linked, setLinked] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.plaid
      .linkToken()
      .then((d) => setLinkToken(d.link_token))
      .catch((e) => setError(e.message));
  }, []);

  const handlePlaidSuccess = async (publicToken: string) => {
    try {
      await api.plaid.exchange(publicToken);
      const accounts = await api.plaid.accounts();
      setLinkedAccounts(accounts || []);
      setLinked(true);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "#D4A85320", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Feather name="link" size={24} color="#D4A853" />
      </View>
      <Text style={{ fontSize: 22, fontWeight: "700", color: "#FAFAFA", marginBottom: 8 }}>
        Link Your Bank
      </Text>
      <Text style={{ fontSize: 14, color: "#A1A1AA", textAlign: "center", marginBottom: 32 }}>
        So your team can get to work
      </Text>

      {error && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: "#EF444430", backgroundColor: "#EF444410", paddingHorizontal: 16, paddingVertical: 8, marginBottom: 16 }}>
          <Feather name="alert-triangle" size={14} color="#EF4444" />
          <Text style={{ fontSize: 12, color: "#EF4444", flex: 1 }}>{error}</Text>
        </View>
      )}

      {!linked ? (
        <View style={{ width: "100%", gap: 12 }}>
          {linkToken ? (
            <PlaidLinkButton
              token={linkToken}
              onSuccess={handlePlaidSuccess}
              onExit={() => {}}
            />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 }}>
              <ActivityIndicator size="small" color="#71717A" />
              <Text style={{ fontSize: 14, color: "#71717A" }}>Preparing secure connection...</Text>
            </View>
          )}
          <Pressable onPress={onNext} style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ fontSize: 14, color: "#71717A" }}>Skip for now — use demo data</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ width: "100%", borderRadius: 16, borderWidth: 1, borderColor: "#34D39930", backgroundColor: "#34D39910", padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
            <Feather name="check-circle" size={18} color="#34D399" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#34D399" }}>Account linked!</Text>
          </View>
          {linkedAccounts.map((acct: any, i: number) => (
            <Text key={i} style={{ fontSize: 12, color: "#A1A1AA", textAlign: "center" }}>
              {acct.name} • ${acct.balance_current?.toLocaleString() ?? "—"}
            </Text>
          ))}
          <Pressable onPress={onNext} style={{ marginTop: 16, alignItems: "center", borderRadius: 9999, backgroundColor: "#D4A853", paddingVertical: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#000" }}>Continue</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ProfileStep({
  onNext,
  profileData,
  setProfileData,
}: {
  onNext: () => void;
  profileData: ProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileData>>;
}) {
  const [subStep, setSubStep] = useState(0);

  const nextSub = () => {
    if (subStep < 2) setSubStep(subStep + 1);
    else onNext();
  };

  const GOAL_SUGGESTIONS = [
    { label: "Emergency Fund", amount: "2000" },
    { label: "Vacation", amount: "5000" },
    { label: "New Laptop", amount: "1800" },
  ];

  return (
    <View className="items-center w-full">
      <Text className="text-2xl font-bold text-text-primary mb-1">
        Quick Setup
      </Text>
      <Text className="text-sm text-text-muted mb-8">
        Question {subStep + 1} of 3
      </Text>

      {subStep === 0 && (
        <View className="w-full items-center gap-4">
          <View className="w-8 h-8 items-center justify-center">
            <Feather name="dollar-sign" size={32} color="#D4A853" />
          </View>
          <Text className="text-sm text-text-secondary text-center">
            What's your monthly rent or housing cost?
          </Text>
          <TextInput
            value={profileData.rent}
            onChangeText={(v) => setProfileData((d) => ({ ...d, rent: v }))}
            placeholder="$1,200"
            keyboardType="decimal-pad"
            placeholderTextColor="#71717A"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center font-mono text-lg text-text-primary"
          />
        </View>
      )}

      {subStep === 1 && (
        <View className="w-full gap-4">
          <Text className="text-sm text-text-secondary text-center">
            Set a savings goal
          </Text>
          <View className="flex-row gap-2 flex-wrap justify-center">
            {GOAL_SUGGESTIONS.map((s) => (
              <Pressable
                key={s.label}
                onPress={() =>
                  setProfileData((d) => ({
                    ...d,
                    goalName: s.label,
                    goalAmount: s.amount,
                  }))
                }
                className="rounded-full px-3 py-1.5"
                style={{
                  backgroundColor:
                    profileData.goalName === s.label ? "#D4A853" : "transparent",
                  borderWidth: profileData.goalName === s.label ? 0 : 1,
                  borderColor: "#27272A",
                }}
              >
                <Text
                  className="text-xs"
                  style={{
                    color:
                      profileData.goalName === s.label ? "#000" : "#A1A1AA",
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={profileData.goalName}
            onChangeText={(v) =>
              setProfileData((d) => ({ ...d, goalName: v }))
            }
            placeholder="Goal name"
            placeholderTextColor="#71717A"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary"
          />
          <TextInput
            value={profileData.goalAmount}
            onChangeText={(v) =>
              setProfileData((d) => ({ ...d, goalAmount: v }))
            }
            placeholder="$5,000"
            keyboardType="decimal-pad"
            placeholderTextColor="#71717A"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-center font-mono text-text-primary"
          />
        </View>
      )}

      {subStep === 2 && (
        <View className="w-full gap-6">
          <View className="items-center">
            <Feather name="message-square" size={32} color="#D4A853" />
          </View>
          <Text className="text-sm text-text-secondary text-center">
            How should we talk to you?
          </Text>
          <ToggleGroup
            label="Style"
            options={["brief", "detailed"]}
            value={profileData.style}
            onChange={(v) =>
              setProfileData((d) => ({
                ...d,
                style: v as "brief" | "detailed",
              }))
            }
          />
          <ToggleGroup
            label="Frequency"
            options={["daily", "weekly"]}
            value={profileData.frequency}
            onChange={(v) =>
              setProfileData((d) => ({
                ...d,
                frequency: v as "daily" | "weekly",
              }))
            }
          />
        </View>
      )}

      <Pressable
        onPress={nextSub}
        className="mt-8 rounded-full bg-gold px-8 py-2.5"
      >
        <Text className="text-sm font-medium text-black">
          {subStep < 2 ? "Next" : "Continue"}
        </Text>
      </Pressable>
    </View>
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
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-text-secondary capitalize">{label}</Text>
      <View
        className="flex-row gap-1 rounded-full border border-border p-0.5"
      >
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            className="rounded-full px-4 py-1"
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

function MeetTeamStep({
  onNext,
  saving,
}: {
  onNext: () => void;
  saving: boolean;
}) {
  const agentNames: AgentName[] = ["pulse", "audit", "north-star", "sentinel"];

  return (
    <ScrollView
      className="w-full"
      contentContainerStyle={{ alignItems: "center" }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-bold text-text-primary mb-2">
        Meet Your Team
      </Text>
      <Text className="text-sm text-text-secondary text-center mb-8">
        Four agents working together on your finances
      </Text>

      <View className="w-full gap-3 mb-8">
        {agentNames.map((name) => {
          const info = AGENTS[name];
          return (
            <View
              key={name}
              className="rounded-2xl border bg-surface p-4"
              style={{ borderColor: `${info.color}30` }}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: info.bgColor }}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: info.color }}
                  >
                    {info.displayName.charAt(0)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: info.color }}
                  >
                    {info.displayName}
                  </Text>
                  <Text className="text-xs text-text-secondary mt-0.5">
                    {info.description}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={onNext}
        disabled={saving}
        className="rounded-full bg-gold px-8 py-2.5 flex-row items-center gap-2"
        style={{ opacity: saving ? 0.6 : 1 }}
      >
        {saving ? (
          <>
            <ActivityIndicator size="small" color="#000" />
            <Text className="text-sm font-medium text-black">Setting up...</Text>
          </>
        ) : (
          <Text className="text-sm font-medium text-black">
            Your team is ready. Let's go.
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
