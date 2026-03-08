import { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth0 } from "../lib/use-auth";

export default function CallbackScreen() {
  const { user, isLoading } = useAuth0();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => setTimedOut(true), 5000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  useEffect(() => {
    if (isLoading && !timedOut) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    router.replace(user ? "/" : "/welcome");
  }, [user, isLoading, timedOut, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#09090B", gap: 12 }}>
      <ActivityIndicator size="large" color="#D4A853" />
      <Text style={{ fontSize: 14, color: "#71717A" }}>Signing you in...</Text>
    </View>
  );
}
