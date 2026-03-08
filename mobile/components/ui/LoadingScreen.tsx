import { View, Text, ActivityIndicator } from "react-native";
import { useTheme } from "../../lib/theme";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, gap: 12 }}>
      <ActivityIndicator size="large" color={colors.gold} />
      {message && <Text style={{ fontSize: 14, color: colors.textMuted }}>{message}</Text>}
    </View>
  );
}
