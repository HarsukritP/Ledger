import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";
import { View, ActivityIndicator } from "react-native";
import { api } from "../lib/api";

export default function IndexScreen() {
  const { user, isLoading } = useAuth0();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If auth0 isLoading hangs (common on web), bail out after 3s
  useEffect(() => {
    timeoutRef.current = setTimeout(() => setTimedOut(true), 3000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const ready = !isLoading || timedOut;
    if (!ready) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!user) {
      router.replace("/welcome");
      return;
    }

    api.auth
      .me()
      .then((me) => {
        if (me.onboarding_completed) {
          router.replace("/(app)");
        } else {
          router.replace("/onboarding");
        }
      })
      .catch(() => {
        router.replace("/(app)");
      });
  }, [user, isLoading, timedOut, router]);

  return (
    <View className="flex-1 items-center justify-center bg-base">
      <ActivityIndicator size="large" color="#D4A853" />
    </View>
  );
}
