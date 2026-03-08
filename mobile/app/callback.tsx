import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";

export default function CallbackScreen() {
  const { user, isLoading } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/");
      } else {
        router.replace("/welcome");
      }
    }
  }, [user, isLoading, router]);

  return (
    <View className="flex-1 items-center justify-center bg-base gap-3">
      <ActivityIndicator size="large" color="#D4A853" />
      <Text className="text-sm text-text-muted">Signing you in...</Text>
    </View>
  );
}
