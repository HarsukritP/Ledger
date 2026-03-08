import "../global.css";
import { Stack } from "expo-router";
import { Auth0Provider } from "../lib/auth-provider";
import { StatusBar } from "expo-status-bar";
import { useAuthToken } from "../hooks/useAuthToken";
import { View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? "";
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? "";

const APP_BG = "#09090B";

function TokenSyncer() {
  useAuthToken();
  return null;
}

function AppShell() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: APP_BG }}>
      {/* Paint the status-bar area the same dark colour on every platform */}
      {Platform.OS === "web" && insets.top > 0 && (
        <View style={{ height: insets.top, backgroundColor: APP_BG }} />
      )}
      <StatusBar style="light" backgroundColor={APP_BG} translucent={false} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: APP_BG } }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <Auth0Provider domain={AUTH0_DOMAIN} clientId={AUTH0_CLIENT_ID}>
      <TokenSyncer />
      <AppShell />
    </Auth0Provider>
  );
}
