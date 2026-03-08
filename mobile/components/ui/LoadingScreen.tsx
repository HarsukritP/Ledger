import { View, Text, ActivityIndicator } from "react-native";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-base gap-3">
      <ActivityIndicator size="large" color="#D4A853" />
      {message && <Text className="text-sm text-text-muted">{message}</Text>}
    </View>
  );
}
