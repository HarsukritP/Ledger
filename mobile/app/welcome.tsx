import { View, Text, TouchableOpacity, ActivityIndicator, Platform, Image } from "react-native";
import { useRouter } from "expo-router";
import { useAuth0 } from "../lib/use-auth";
import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

const features = [
  { icon: "trending-up" as const, color: "#3B82F6", text: "Cash flow forecasting 30 days out" },
  { icon: "credit-card" as const, color: "#D4A853", text: "Subscription audit & waste detection" },
  { icon: "target" as const, color: "#22C55E", text: "Savings goal tracking & feasibility" },
  { icon: "shield" as const, color: "#F97316", text: "Anomaly detection for unusual charges" },
];

export default function WelcomeScreen() {
  const { authorize } = useAuth0();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colors, toggle, resolved } = useTheme();

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await authorize();
      router.replace("/");
    } catch (err: any) {
      if (err?.error === "cancelled" || err?.message?.includes("popup")) {
        setLoading(false);
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, paddingHorizontal: 32 }}>
      {/* Theme toggle */}
      <TouchableOpacity
        onPress={toggle}
        style={{ position: "absolute", top: 60, right: 24, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}
      >
        <Feather name={resolved === "dark" ? "sun" : "moon"} size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Image
        source={require("../assets/logo.png")}
        style={{ width: 100, height: 100, resizeMode: "contain", marginBottom: 16 }}
      />

      <Text style={{ fontSize: 40, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 }}>
        Ledger
      </Text>
      <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: "center", marginBottom: 8 }}>
        Your personal finance team
      </Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center", marginBottom: 48, lineHeight: 22 }}>
        Four AI agents watching your money so you don't have to
      </Text>

      <View style={{ width: "100%", gap: 16, marginBottom: 48 }}>
        {features.map((item) => (
          <View key={item.text} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: `${item.color}15` }}>
              <Feather name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1 }}>{item.text}</Text>
          </View>
        ))}
      </View>

      <View style={{ width: "100%", gap: 12 }}>
        <TouchableOpacity
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.7}
          accessibilityRole="button"
          style={{
            width: "100%", borderRadius: 9999, backgroundColor: colors.gold,
            paddingTop: 16, paddingBottom: 16, alignItems: "center", justifyContent: "center",
            opacity: loading ? 0.7 : 1,
            shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12,
            ...(Platform.OS === "web" ? { cursor: "pointer" } as any : {}),
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>Get Started</Text>
              <Feather name="arrow-right" size={18} color="#000" />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.7}
          accessibilityRole="button"
          style={{
            width: "100%", borderRadius: 9999, borderWidth: 1, borderColor: colors.border,
            paddingTop: 14, paddingBottom: 14, alignItems: "center", justifyContent: "center",
            opacity: loading ? 0.7 : 1,
            ...(Platform.OS === "web" ? { cursor: "pointer" } as any : {}),
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary }}>Sign In</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Text style={{ marginTop: 12, fontSize: 12, color: colors.danger, textAlign: "center" }}>{error}</Text>
      )}

      <Text style={{ marginTop: 24, fontSize: 12, color: colors.textMuted, textAlign: "center", lineHeight: 20 }}>
        {"Secure bank linking via Plaid.\nYour data is encrypted and never sold."}
      </Text>
    </View>
  );
}
