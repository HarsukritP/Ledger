import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth0 } from "../lib/use-auth";
import { useState } from "react";
import { Feather } from "@expo/vector-icons";

const features = [
  { icon: "trending-up" as const, color: "#60A5FA", text: "Cash flow forecasting 30 days out" },
  { icon: "credit-card" as const, color: "#D4A853", text: "Subscription audit & waste detection" },
  { icon: "target" as const, color: "#34D399", text: "Savings goal tracking & feasibility" },
  { icon: "shield" as const, color: "#F59E0B", text: "Anomaly detection for unusual charges" },
];

export default function WelcomeScreen() {
  const { authorize } = useAuth0();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await authorize();
      router.replace("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#09090B", paddingHorizontal: 32 }}>
      <Text style={{ fontSize: 48, fontWeight: "700", color: "#D4A853", marginBottom: 8 }}>
        Ledger
      </Text>
      <Text style={{ fontSize: 16, color: "#A1A1AA", textAlign: "center", marginBottom: 8 }}>
        Your AI financial advisor
      </Text>
      <Text style={{ fontSize: 14, color: "#71717A", textAlign: "center", marginBottom: 48, lineHeight: 22 }}>
        Four AI agents watching your money so you don't have to
      </Text>

      <View style={{ width: "100%", gap: 16, marginBottom: 48 }}>
        {features.map((item) => (
          <View key={item.text} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: `${item.color}15` }}>
              <Feather name={item.icon} size={16} color={item.color} />
            </View>
            <Text style={{ fontSize: 14, color: "#A1A1AA", flex: 1 }}>{item.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleSignIn}
        disabled={loading}
        activeOpacity={0.7}
        accessibilityRole="button"
        style={{
          width: "100%",
          borderRadius: 9999,
          backgroundColor: "#D4A853",
          paddingTop: 16,
          paddingBottom: 16,
          alignItems: "center",
          justifyContent: "center",
          opacity: loading ? 0.7 : 1,
          ...(Platform.OS === "web" ? { cursor: "pointer" } as any : {}),
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#000" }}>Get Started</Text>
            <Feather name="arrow-right" size={18} color="#000" />
          </View>
        )}
      </TouchableOpacity>

      {error && (
        <Text style={{ marginTop: 12, fontSize: 12, color: "#EF4444", textAlign: "center" }}>
          {error}
        </Text>
      )}

      <Text style={{ marginTop: 24, fontSize: 12, color: "#71717A", textAlign: "center", lineHeight: 20 }}>
        {"Secure bank linking via Plaid.\nYour data is encrypted and never sold."}
      </Text>
    </View>
  );
}
