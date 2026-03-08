import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";
import { useState } from "react";
import { Feather } from "@expo/vector-icons";

export default function WelcomeScreen() {
  const { authorize } = useAuth0();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await authorize();
      router.replace("/");
    } catch (err) {
      console.error("[AUTH] Sign-in failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-base px-8">
      <View
        className="absolute inset-0"
        pointerEvents="none"
        style={{
          backgroundColor: "#D4A853",
          opacity: 0.03,
          borderRadius: 9999,
          transform: [{ scale: 2 }],
        }}
      />

      <Text className="text-5xl font-bold tracking-tight text-gold mb-2">
        Ledger
      </Text>
      <Text className="text-base text-text-secondary text-center mb-2">
        Your AI financial advisor
      </Text>
      <Text className="text-sm text-text-muted text-center mb-12 leading-6">
        Four AI agents watching your money so you don't have to
      </Text>

      <View className="w-full gap-4 mb-12">
        {[
          { icon: "trending-up" as const, color: "#60A5FA", text: "Cash flow forecasting 30 days out" },
          { icon: "credit-card" as const, color: "#D4A853", text: "Subscription audit & waste detection" },
          { icon: "target" as const, color: "#34D399", text: "Savings goal tracking & feasibility" },
          { icon: "shield" as const, color: "#F59E0B", text: "Anomaly detection for unusual charges" },
        ].map((item) => (
          <View key={item.text} className="flex-row items-center gap-3">
            <View
              className="w-8 h-8 rounded-xl items-center justify-center"
              style={{ backgroundColor: `${item.color}15` }}
            >
              <Feather name={item.icon} size={16} color={item.color} />
            </View>
            <Text className="text-sm text-text-secondary flex-1">{item.text}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={handleSignIn}
        disabled={loading}
        style={{
          width: "100%",
          borderRadius: 9999,
          backgroundColor: loading ? "#b8902e" : "#D4A853",
          paddingVertical: 16,
          alignItems: "center",
          justifyContent: "center",
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
      </Pressable>

      <Text className="mt-6 text-xs text-text-muted text-center leading-5">
        Secure bank linking via Plaid.{"\n"}Your data is encrypted and never sold.
      </Text>
    </View>
  );
}
