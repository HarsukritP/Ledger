import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../lib/theme";
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
  const { colors } = useTheme();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View className="flex-1 items-center justify-center px-6">
        {/* Step indicators */}
        <View className="flex-row items-center gap-2 mb-12">
          {STEPS.map((label, i) => (
            <View key={label} className="flex-row items-center gap-2">
              <View
                className="h-8 w-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor: i <= step ? colors.gold : "transparent",
                  borderWidth: i <= step ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: i <= step ? "#000" : colors.textMuted }}
                >
                  {i + 1}
                </Text>
              </View>
              {i < 3 && (
                <View
                  className="h-px w-8"
                  style={{
                    backgroundColor: i < step ? colors.gold : colors.border,
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
  const { colors } = useTheme();
  const { user } = useAuth0();
  const firstName =
    (user?.given_name as string | undefined) ||
    (user?.name as string | undefined)?.split(" ")[0] ||
    "there";

  return (
    <View className="items-center w-full">
      <Image source={require("../assets/logo.png")} style={{ width: 80, height: 80, resizeMode: "contain", marginBottom: 12 }} />
      <Text className="text-5xl font-bold tracking-tight mb-4" style={{ color: colors.textPrimary }}>
        Ledger
      </Text>
      <Text className="text-lg text-center mb-8" style={{ color: colors.textSecondary }}>
        Hey {firstName}, let's set up your finance team
      </Text>
      <Pressable
        onPress={onNext}
        className="flex-row items-center gap-2 rounded-full px-8 py-3"
        style={{ backgroundColor: colors.gold }}
      >
        <Text className="font-semibold" style={{ color: "#000" }}>Let's Go</Text>
        <Feather name="arrow-right" size={18} color="#000" />
      </Pressable>
    </View>
  );
}

function LinkBankStep({ onNext }: { onNext: () => void }) {
  const { colors } = useTheme();
  const [linked, setLinked] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.plaid
      .linkToken()
      .then((d) => setLinkToken(d.link_token))
      .catch((e) => {
        setError("Could not initialize bank linking. You can skip for now.");
      });
  }, []);

  const handlePlaidSuccess = async (publicToken: string) => {
    setExchanging(true);
    setError(null);
    try {
      const result = await api.plaid.exchange(publicToken);
      setLinkedAccounts(result.accounts || []);
      setLinked(true);
      // kick off sync in background — don't block progression
      api.plaid.sync().catch(() => {});
      setTimeout(onNext, 2000);
    } catch (e: any) {
      setError(e.message);
      setExchanging(false);
    }
  };

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.gold + "20", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Feather name="link" size={24} color={colors.gold} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 }}>
        Link Your Bank
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 32 }}>
        So your team can get to work
      </Text>

      {error && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.danger + "30", backgroundColor: colors.danger + "10", paddingHorizontal: 16, paddingVertical: 8, marginBottom: 16 }}>
          <Feather name="alert-triangle" size={14} color={colors.danger} />
          <Text style={{ fontSize: 12, color: colors.danger, flex: 1 }}>{error}</Text>
        </View>
      )}

      {!linked ? (
        <View style={{ width: "100%", gap: 12 }}>
          {exchanging ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={{ fontSize: 14, color: colors.textMuted }}>Linking your account...</Text>
            </View>
          ) : linkToken ? (
            <>
              <PlaidLinkButton
                token={linkToken}
                onSuccess={handlePlaidSuccess}
                onExit={() => {}}
              />
              <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: "center" }}>
                {"Sandbox mode — use credentials "}
                <Text style={{ fontFamily: "monospace", color: colors.textMuted }}>user_good</Text>
                {" / "}
                <Text style={{ fontFamily: "monospace", color: colors.textMuted }}>pass_good</Text>
              </Text>
            </>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={{ fontSize: 14, color: colors.textMuted }}>Preparing secure connection...</Text>
            </View>
          )}
          <Pressable onPress={onNext} style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>Skip for now — use demo data</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ width: "100%", borderRadius: 16, borderWidth: 1, borderColor: colors.income + "30", backgroundColor: colors.income + "10", padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Feather name="check-circle" size={18} color={colors.income} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.income }}>Account linked!</Text>
          </View>
          {linkedAccounts.length > 0 && (
            <View style={{ gap: 4 }}>
              {linkedAccounts.map((acct: any, i: number) => (
                <Text key={i} style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center" }}>
                  {acct.name} · ${acct.balance_current?.toLocaleString() ?? "—"}
                </Text>
              ))}
            </View>
          )}
          <TouchableOpacity
            onPress={onNext}
            accessibilityRole="button"
            activeOpacity={0.7}
            style={{ alignItems: "center", borderRadius: 9999, backgroundColor: colors.gold, paddingVertical: 14 }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#000" }}>Continue →</Text>
          </TouchableOpacity>
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
  const { colors } = useTheme();
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
      <Text className="text-2xl font-bold mb-1" style={{ color: colors.textPrimary }}>
        Quick Setup
      </Text>
      <Text className="text-sm mb-8" style={{ color: colors.textMuted }}>
        Question {subStep + 1} of 3
      </Text>

      {subStep === 0 && (
        <View className="w-full items-center gap-4">
          <View className="w-8 h-8 items-center justify-center">
            <Feather name="dollar-sign" size={32} color={colors.gold} />
          </View>
          <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
            What's your monthly rent or housing cost?
          </Text>
          <TextInput
            value={profileData.rent}
            onChangeText={(v) => setProfileData((d) => ({ ...d, rent: v }))}
            placeholder="$1,200"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textMuted}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center font-mono text-lg"
            style={{ borderColor: colors.border, color: colors.textPrimary }}
          />
        </View>
      )}

      {subStep === 1 && (
        <View className="w-full gap-4">
          <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
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
                    profileData.goalName === s.label ? colors.gold : "transparent",
                  borderWidth: profileData.goalName === s.label ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  className="text-xs"
                  style={{
                    color:
                      profileData.goalName === s.label ? "#000" : colors.textSecondary,
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
            placeholderTextColor={colors.textMuted}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
            style={{ borderColor: colors.border, color: colors.textPrimary }}
          />
          <TextInput
            value={profileData.goalAmount}
            onChangeText={(v) =>
              setProfileData((d) => ({ ...d, goalAmount: v }))
            }
            placeholder="$5,000"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textMuted}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-center font-mono"
            style={{ borderColor: colors.border, color: colors.textPrimary }}
          />
        </View>
      )}

      {subStep === 2 && (
        <View className="w-full gap-6">
          <View className="items-center">
            <Feather name="message-square" size={32} color={colors.gold} />
          </View>
          <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
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
        className="mt-8 rounded-full px-8 py-2.5"
        style={{ backgroundColor: colors.gold }}
      >
        <Text className="text-sm font-medium" style={{ color: "#000" }}>
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
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm capitalize" style={{ color: colors.textSecondary }}>{label}</Text>
      <View
        className="flex-row gap-1 rounded-full p-0.5"
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            className="rounded-full px-4 py-1"
            style={{
              backgroundColor: value === opt ? colors.gold : "transparent",
            }}
          >
            <Text
              className="text-xs font-medium capitalize"
              style={{ color: value === opt ? "#000" : colors.textMuted }}
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
  const { colors } = useTheme();
  const agentNames: AgentName[] = ["pulse", "audit", "north-star", "sentinel"];

  return (
    <ScrollView
      className="w-full"
      contentContainerStyle={{ alignItems: "center" }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-bold mb-2" style={{ color: colors.textPrimary }}>
        Meet Your Team
      </Text>
      <Text className="text-sm text-center mb-8" style={{ color: colors.textSecondary }}>
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
                  <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
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
        className="rounded-full px-8 py-2.5 flex-row items-center gap-2"
        style={{ opacity: saving ? 0.6 : 1, backgroundColor: colors.gold }}
      >
        {saving ? (
          <>
            <ActivityIndicator size="small" color="#000" />
            <Text className="text-sm font-medium" style={{ color: "#000" }}>Setting up...</Text>
          </>
        ) : (
          <Text className="text-sm font-medium" style={{ color: "#000" }}>
            Your team is ready. Let's go.
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
