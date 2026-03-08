import "../global.css";
import { Stack } from "expo-router";
import { Auth0Provider } from "../lib/auth-provider";
import { StatusBar } from "expo-status-bar";
import { useAuthToken } from "../hooks/useAuthToken";
import { View } from "react-native";

const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? "";
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? "";

const APP_BG = "#09090B";

function TokenSyncer() {
  useAuthToken();
  return null;
}

export default function RootLayout() {
  return (
    <Auth0Provider domain={AUTH0_DOMAIN} clientId={AUTH0_CLIENT_ID}>
      <TokenSyncer />
      {/*
        Dark background on the root View ensures the status-bar area and
        home-indicator area never flash white — the CSS in +html.tsx does the
        same job for the browser layer below React Native.
      */}
      <View style={{ flex: 1, backgroundColor: APP_BG }}>
        <StatusBar style="light" backgroundColor={APP_BG} translucent />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: APP_BG } }} />
      </View>
    </Auth0Provider>
  );
}
