import "../global.css";
import { Stack } from "expo-router";
import { Auth0Provider } from "../lib/auth-provider";
import { StatusBar } from "expo-status-bar";
import { useAuthToken } from "../hooks/useAuthToken";
import { View } from "react-native";
import { ThemeProvider, useTheme } from "../lib/theme";

const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? "";
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? "";

function TokenSyncer() {
  useAuthToken();
  return null;
}

function ThemedApp() {
  const { colors, resolved } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={colors.statusBar} backgroundColor={colors.bg} translucent />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <Auth0Provider domain={AUTH0_DOMAIN} clientId={AUTH0_CLIENT_ID}>
      <ThemeProvider>
        <TokenSyncer />
        <ThemedApp />
      </ThemeProvider>
    </Auth0Provider>
  );
}
