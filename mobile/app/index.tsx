import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";
import { View, ActivityIndicator } from "react-native";
import { api } from "../lib/api";

export default function IndexScreen() {
  const { user, isLoading } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

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
  }, [user, isLoading, router]);

  return (
    <View className="flex-1 items-center justify-center bg-base">
      <ActivityIndicator size="large" color="#D4A853" />
    </View>
  );
}
